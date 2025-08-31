import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import Reservation from '../models/Reservation.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { releaseReservation } from './reservationController.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import productModel from '../models/productModel.js';

// POST /phonepe/webhook
export async function phonePeWebhookHandler(req, res) {
  try {
    const authHeader = req.headers['authorization'];
    const username = process.env.PHONEPE_CALLBACK_USERNAME || '';
    const password = process.env.PHONEPE_CALLBACK_PASSWORD || '';
    const expected = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex');
    if (authHeader !== expected) return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    const { payload, event } = req.body;
    if (!payload || !event) return errorResponse(res, 400, 'Invalid webhook payload');
    // Payment status update - FIXED TO WORK WITH PAYMENT SESSIONS
    if (payload.orderId && payload.state) {
      console.log('🔔 WEBHOOK: Processing payment update for orderId:', payload.orderId, 'state:', payload.state);
      
      // First update PaymentSession
      const paymentSession = await PaymentSession.findOne({ phonepeTransactionId: payload.orderId });
      if (paymentSession) {
        console.log('🔔 WEBHOOK: Found payment session, updating status to:', payload.state);
        paymentSession.status = payload.state === 'COMPLETED' ? 'success' : 'failed';
        await paymentSession.save();
        console.log('🔔 WEBHOOK: Payment session updated successfully');
      } else {
        console.log('🔔 WEBHOOK: No payment session found for orderId:', payload.orderId);
      }
      
      // Then update/create order via session snapshot (idempotent)
      try {
        const { createOrderFromCheckoutSession } = await import('../services/orderFromSession.js');
        if (payload.state === 'COMPLETED') {
          // Attempt to find related PaymentSession -> sessionId
          const ps = await PaymentSession.findOne({ phonepeTransactionId: payload.orderId });
          if (ps && ps.sessionId) {
            await createOrderFromCheckoutSession(ps.sessionId, {
              paymentStatus: 'success',
              phonepeTransactionId: payload.orderId,
              providerPayload: req.body
            });
          }
        } else {
          // Update existing order if any to failed
          const order = await orderModel.findOne({ phonepeTransactionId: payload.orderId });
          if (order) {
            order.paymentStatus = payload.state.toLowerCase();
            order.orderStatus = payload.state.toLowerCase();
            order.status = payload.state;
            await order.save();
            console.log('🔔 WEBHOOK: Order updated successfully');
          }
        }
      } catch (serviceErr) {
        console.error('Order-from-session service failed (webhook):', serviceErr);
      }
    }
    // Refund status update
    if (payload.merchantRefundId && payload.state) {
      const order = await orderModel.findOne({ 'refunds.merchantRefundId': payload.merchantRefundId });
      if (order) {
        const refund = order.refunds.find(r => r.merchantRefundId === payload.merchantRefundId);
        if (refund) {
          refund.state = payload.state;
          refund.log = req.body;
          refund.updatedAt = new Date();
          await order.save();
        }
      }
    }
    return successResponse(res, {}, 'Webhook processed');
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
}

/**
 * Generic payment webhook handler for reservation-based checkout
 * POST /api/webhook/payment
 */
export async function paymentWebhookHandler(req, res) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      return errorResponse(res, 401, 'Invalid webhook signature');
    }

    const { reservationId, paymentStatus, paymentId, gatewayPayload } = req.body;

    if (!reservationId || !paymentStatus) {
      return errorResponse(res, 400, 'reservationId and paymentStatus are required');
    }

    // Find the reservation
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return errorResponse(res, 404, 'Reservation not found');
    }

    // Check if reservation is already confirmed (idempotency)
    if (reservation.status === 'confirmed') {
      console.log(`Webhook: Reservation ${reservationId} already confirmed, returning 200`);
      return successResponse(res, {}, 'Reservation already confirmed');
    }

    // Handle failed payments
    if (paymentStatus !== 'SUCCESS' && paymentStatus !== 'success' && paymentStatus !== 'COMPLETED') {
      console.log(`Webhook: Payment failed for reservation ${reservationId}, releasing stock`);
      const releaseResult = await releaseReservation(reservationId, 'failed-payment');
      if (releaseResult.success) {
        return successResponse(res, {}, 'Payment failed, reservation released');
      } else {
        return errorResponse(res, 500, 'Failed to release reservation');
      }
    }

    // Handle successful payments
    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        // Create order from reservation
        const orderData = {
          userId: reservation.userId,
          items: reservation.items.map(item => ({
            productId: item.productId,
            name: item.productId.name || 'Product', // Will be populated
            price: item.priceAtReserve,
            quantity: item.qty,
            size: item.size
          })),
          totalPrice: reservation.totalAmount,
          total: reservation.totalAmount,
          subtotal: reservation.totalAmount,
          paymentStatus: 'paid',
          orderStatus: 'confirmed',
          status: 'Order Placed',
          orderId: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source: 'reservation',
          placedAt: new Date(),
          metadata: {
            reservationId: reservation._id,
            gatewayPayload,
            confirmedAt: new Date()
          }
        };

        // Populate product names
        for (let i = 0; i < orderData.items.length; i++) {
          const product = await productModel.findById(orderData.items[i].productId);
          if (product) {
            orderData.items[i].name = product.name;
            orderData.items[i].image = product.images?.[0] || '';
          }
        }

        const order = new orderModel(orderData);
        await order.save({ session });

        // Update reservation status
        reservation.status = 'confirmed';
        reservation.paymentId = paymentId;
        reservation.metadata = { 
          ...reservation.metadata, 
          orderId: order._id,
          confirmedAt: new Date(),
          gatewayPayload 
        };
        await reservation.save({ session });

        await session.commitTransaction();

        console.log(`Webhook: Order created successfully from reservation ${reservationId}`);
        return successResponse(res, { 
          orderId: order._id,
          reservationId: reservation._id 
        }, 'Payment processed successfully');

      } catch (transactionError) {
        await session.abortTransaction();
        throw transactionError;
      } finally {
        session.endSession();
      }

    } catch (orderError) {
      console.error('Failed to create order from reservation:', orderError);
      
      // Release reservation on order creation failure
      await releaseReservation(reservationId, 'order-creation-failed');
      
      return errorResponse(res, 500, 'Failed to process payment: order creation failed');
    }

  } catch (error) {
    console.error('Payment webhook error:', error);
    return errorResponse(res, 500, `Webhook processing failed: ${error.message}`);
  }
}

/**
 * Verify webhook signature (placeholder for gateway-specific implementation)
 * TODO: Implement gateway-specific signature verification
 */
function verifyWebhookSignature(req) {
  // TODO: Implement gateway-specific signature verification
  // For now, return true to allow testing
  // In production, implement proper signature verification based on your payment gateway
  
  const signature = req.headers['x-signature'] || req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  // Example for PhonePe (adjust based on your gateway)
  if (process.env.PHONEPE_WEBHOOK_SECRET) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.PHONEPE_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }
  
  // For development/testing, allow requests without signature
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️ Development mode: skipping webhook signature verification');
    return true;
  }
  
  console.log('⚠️ No webhook secret configured, signature verification disabled');
  return true;
} 