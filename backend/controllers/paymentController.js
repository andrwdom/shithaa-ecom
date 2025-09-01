import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import PaymentSession from "../models/paymentSessionModel.js";
import CheckoutSession from "../models/CheckoutSession.js";
import Payment from "../models/Payment.js";
import PaymentEvent from "../models/PaymentEvent.js";
import { successResponse, errorResponse } from '../utils/response.js';
import { getUniqueOrderId } from './orderController.js';
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from 'pg-sdk-node';
import { randomUUID } from 'crypto';
import { generateInvoiceBuffer, sendInvoiceEmail } from '../utils/invoiceGenerator.js';
import { config } from '../config.js';

// Helper function to get user email for orders
const getOrderUserEmail = (req, email) => {
    return req.user?.email || email || `guest@${process.env.BASE_URL?.replace('https://', '').replace('http://', '') || 'shithaa.in'}`;
};

// Helper function to initialize PhonePe client
const initializePhonePeClient = () => {
    const { phonepe } = config;

    if (!phonepe.merchant_id || !phonepe.api_key) {
        console.error('PhonePe credentials missing, cannot initialize client');
        console.error('Available config:', {
            merchant_id: phonepe.merchant_id ? 'SET' : 'MISSING',
            api_key: phonepe.api_key ? 'SET' : 'MISSING',
            salt_index: phonepe.salt_index,
            env: phonepe.env
        });
        return null;
    }

    try {
        const client = StandardCheckoutClient.getInstance(
            phonepe.merchant_id,
            phonepe.api_key,
            phonepe.salt_index,
            phonepe.env === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX
        );
        
        // 🔧 CRITICAL FIX: Validate client structure - check for both method names
        const hasGetOrderStatus = client && typeof client.getOrderStatus === 'function';
        const hasGetStatus = client && typeof client.getStatus === 'function';
        
        if (!client || (!hasGetOrderStatus && !hasGetStatus)) {
            console.error('PhonePe client initialized but missing required methods:', {
                clientExists: !!client,
                hasGetOrderStatus,
                hasGetStatus,
                clientKeys: client ? Object.keys(client) : 'NO_CLIENT'
            });
            return null;
        }
        
        console.log('PhonePe client initialized successfully with required methods');
        return client;
    } catch (initError) {
        console.error('PhonePe client initialization failed:', initError);
        console.error('Initialization error details:', {
            message: initError.message,
            stack: initError.stack,
            config: {
                merchant_id: phonepe.merchant_id ? 'SET' : 'MISSING',
                api_key: phonepe.api_key ? 'SET' : 'MISSING',
                salt_index: phonepe.salt_index,
                env: phonepe.env
            }
        });
        return null;
    }
};

// Helper function to update product stock (reserve or restore)
const updateProductStock = async (items) => {
    const { batchChangeStock } = await import('../utils/stock.js');
    
    try {
        const operations = items.map(item => ({
            productId: item._id,
            size: item.size,
            quantityChange: -item.quantity
        }));
        
        const results = await batchChangeStock(operations);
        console.log('Stock updated successfully for payment session:', results);
        return results;
    } catch (error) {
        console.error('Stock update failed for payment session:', error);
        throw new Error(`Stock update failed: ${error.message}`);
    }
};

// Helper function to restore product stock (for failed payments)
const restoreProductStock = async (items) => {
    const { batchChangeStock, validateStockForItems } = await import('../utils/stock.js');
    
    try {
        // First validate the items to ensure they exist
        console.log('Validating items before stock restoration:', items);
        const validations = await validateStockForItems(items);
        const invalidItems = validations.filter(v => !v.available);
        
        if (invalidItems.length > 0) {
            console.error('Some items failed validation for stock restoration:', invalidItems);
            throw new Error(`Invalid items for stock restoration: ${invalidItems.map(i => i.error).join(', ')}`);
        }

        // Map items to stock operations
        const operations = items.map(item => {
            const productId = item.productId || item._id; // Handle both formats
            if (!productId) {
                throw new Error(`Missing product ID for item: ${JSON.stringify(item)}`);
            }
            return {
                productId,
                size: item.size,
                quantityChange: item.quantity // Positive for restoration
            };
        });
        
        console.log('Attempting stock restoration with operations:', operations);
        
        const results = await batchChangeStock(operations);
        console.log('Stock restored successfully:', {
            operations,
            results,
            itemCount: items.length,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
        });
        
        return results;
    } catch (error) {
        console.error('Stock restoration failed:', {
            error: error.message,
            stack: error.stack,
            items: items.map(item => ({
                productId: item.productId || item._id,
                size: item.size,
                quantity: item.quantity
            }))
        });
        throw new Error(`Stock restoration failed: ${error.message}`);
    }
};

// Helper to clean mobile number for PhonePe (10 digits, no country code)
function cleanMobileNumber(number) {
  if (!number) return '';
  const digits = number.replace(/\D/g, '');
  return digits.slice(-10);
}

// Create PhonePe payment session using SDK
export const createPhonePeSession = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${correlationId}] Creating PhonePe payment session`);
    
    const { checkoutSessionId, shipping, cartItems, orderSummary, userId, email, checkoutMode } = req.body;
    
    if (!checkoutSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Checkout session ID is required'
      });
    }
    
    // Get checkout session
    const checkoutSession = await CheckoutSession.findOne({ sessionId: checkoutSessionId });
    if (!checkoutSession) {
      return res.status(404).json({
        success: false,
        message: 'Checkout session not found'
      });
    }
    
    if (checkoutSession.isExpired()) {
      return res.status(410).json({
        success: false,
        message: 'Checkout session has expired'
      });
    }
    
    if (!checkoutSession.stockReserved) {
      return res.status(400).json({
        success: false,
        message: 'Stock must be reserved before creating payment session'
      });
    }
    
    const userEmail = email || checkoutSession.userEmail;
    console.log(`[${correlationId}] User email:`, userEmail);
    
    // 🔑 NEW: Stock is already reserved, so we don't need to validate again
    // The reservation system ensures stock availability
    console.log(`[${correlationId}] Stock already reserved for session, proceeding with payment`);
    
    // Generate unique transaction ID and prepare data
    const phonepeTransactionId = randomUUID();
    const orderId = await getUniqueOrderId();
    
    // 🔑 CRITICAL FIX: Declare order and paymentSession in a higher scope
    let order, paymentSession;

    // Prepare all data objects for parallel creation
    const paymentSessionData = {
      sessionId: checkoutSessionId,
      phonepeTransactionId,
      userId: checkoutSession.userId,
      userEmail,
      orderData: {
        amount: checkoutSession.total,
        shipping: {
          ...shipping,
          addressLine2: shipping.addressLine2 || '',
          country: shipping.country || 'India'
        },
        cartItems: checkoutSession.items
      },
      status: 'pending',
      stockReserved: true, // Stock is already reserved
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        checkoutSource: checkoutSession.source,
        correlationId
      }
    };

    const orderPayload = {
      orderId,
      userInfo: {
        userId: checkoutSession.userId,
        email: userEmail,
        name: shipping.fullName,
        phone: shipping.phone
      },
      shippingInfo: {
        fullName: shipping.fullName,
        email: userEmail,
        phone: shipping.phone,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || '',
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.postalCode,
        country: shipping.country || 'India'
      },
      items: checkoutSession.items,
      totalAmount: checkoutSession.total,
      status: 'Pending',
      orderStatus: 'Pending',
      paymentStatus: 'Pending',
      paymentMethod: 'PhonePe',
      phonepeTransactionId,
      stockConfirmed: false, // Stock will be confirmed on payment success
      metadata: {
        checkoutSessionId,
        correlationId,
        source: checkoutSession.source
      }
    };

    // Execute all database operations in parallel
    try {
      [order, paymentSession] = await Promise.all([
        orderModel.create(orderPayload),
        PaymentSession.create(paymentSessionData),
        CheckoutSession.findByIdAndUpdate(checkoutSession._id, {
          orderId,
          phonepeTransactionId,
          status: 'awaiting_payment'
        })
      ]);

      if (!order || !paymentSession) {
        throw new Error('Failed to create order or payment session');
      }

      // 🔑 REMOVED: Stock reservation is moved to the payment success callback.
      // const { batchChangeStock } = await import('../utils/stock.js');
      // const stockOperations = checkoutSession.items.map(item => ({
      //   productId: item.productId,
      //   size: item.size,
      //   quantityChange: -item.quantity
      // }));
      
      // await batchChangeStock(stockOperations);

    } catch (error) {
      console.error(`[${correlationId}] Database operations failed:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create order and payment session',
        error: error.message
      });
    }

    // Initialize PhonePe client and create payment request in parallel
    // 🔑 CRITICAL FIX: The redirect URL MUST contain the transaction ID for the frontend to verify the payment.
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://shithaa.in'}/payment/phonepe/callback?merchantTransactionId=${phonepeTransactionId}`;
    const callbackUrl = `${process.env.VPS_BASE_URL || 'https://shithaa.in'}/api/payment/phonepe/webhook`;
    
    // Calculate final amount including shipping
    const finalAmount = checkoutSession.total; // total already includes shipping from checkout session
    console.log('🔍 DEBUG: Payment amount calculation:', {
      subtotal: checkoutSession.subtotal,
      shipping: checkoutSession.shippingCost,
      total: checkoutSession.total,
      finalAmount: finalAmount
    });

    // Convert amount to paise (1 rupee = 100 paise)
    const amountInPaise = Math.round(finalAmount * 100);
    
    console.log('🔍 DEBUG: Converting amount to paise:', {
      finalAmountRupees: finalAmount,
      amountInPaise: amountInPaise
    });

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(phonepeTransactionId)
      .amount(amountInPaise)
      .redirectUrl(redirectUrl)
      // .callbackUrl(callbackUrl) // 🔑 FIX: This method does not exist in the SDK and was causing the crash. The callback is set in the PhonePe dashboard.
      .build();

    // Get PhonePe client instance (cached singleton)
    const phonepeClient = initializePhonePeClient();
    if (!phonepeClient) {
      return res.status(500).json({
        success: false,
        message: 'Payment service not available',
        error: 'PhonePe client initialization failed - check environment variables'
      });
    }

    try {
      const response = await phonepeClient.pay(request);
      
      if (response && response.redirectUrl) {
        // Update payment session with PhonePe response
        await PaymentSession.findByIdAndUpdate(paymentSession._id, {
          'phonepeResponse.redirectUrl': response.redirectUrl,
          'phonepeResponse.merchantOrderId': phonepeTransactionId,
          'phonepeResponse.responseCode': response.code || 'SUCCESS',
          'phonepeResponse.responseMessage': response.message || 'Payment session created'
        });

        return res.json({
          success: true,
          sessionId: checkoutSessionId,
          phonepeTransactionId: phonepeTransactionId,
          redirectUrl: response.redirectUrl
        });
      } else {
        await PaymentSession.findByIdAndUpdate(paymentSession._id, {
          'phonepeResponse.responseCode': 'FAILED',
          'phonepeResponse.responseMessage': 'PhonePe response missing redirectUrl'
        });
        
        return res.status(400).json({
          success: false,
          message: 'Failed to create payment session',
          phonepeError: response
        });
      }
    } catch (error) {
      console.error(`[${correlationId}] PhonePe payment creation failed:`, error);
      console.error('Amount details:', {
        finalAmount,
        amountInPaise,
        checkoutSession: {
          subtotal: checkoutSession.subtotal,
          shipping: checkoutSession.shippingCost,
          total: checkoutSession.total
        }
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment',
        error: error.message
      });
    }
  } catch (error) {
    console.error(`[${correlationId}] === PhonePe SDK Session Creation Error ===`);
    console.error(`[${correlationId}] Error details:`, error);
    console.error(`[${correlationId}] Error stack:`, error.stack);
    console.error(`[${correlationId}] Error message:`, error.message);
    
    res.status(500).json({
      success: false,
      message: 'Payment session creation failed',
      error: error.message
    });
  }
};

// PhonePe payment callback using SDK
export const phonePeCallback = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${correlationId}] PhonePe callback received:`, req.body);
    
    const { merchantTransactionId, state, responseCode, responseMessage } = req.body;
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing merchant transaction ID'
      });
    }

    // Find the order by PhonePe transaction ID
    const order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });
    
    if (!order) {
      console.error('Order not found for PhonePe transaction:', merchantTransactionId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Found order:', order.orderId, 'Current status:', order.paymentStatus);

    // Determine if payment was successful
    const isSuccess = (
      state === 'PAID' ||
      state === 'COMPLETED' ||
      responseCode === 'SUCCESS' ||
      responseCode === '000'
    );

    let update = {
      phonepeResponse: req.body,
      updatedAt: new Date()
    };

    if (isSuccess) {
      console.log('Payment successful, updating order status and reducing stock');

      // -----------------------------------------------------------------
      // 🔑 CRITICAL FIX: Deduct stock ONLY on successful payment
      // -----------------------------------------------------------------
      try {
        if (!order.stockConfirmed) {
          // Import and call confirmOrderStock to handle stock reduction
          const { confirmOrderStock } = await import('../controllers/orderController.js');
          console.log('Reducing stock for order:', order._id);
          await confirmOrderStock(order._id);
          console.log('Stock reduction completed successfully');
          
          // Mark stock as confirmed (i.e., deducted)
          update.stockConfirmed = true;
          update.stockConfirmedAt = new Date();
        } else {
          console.log(`Stock already confirmed for order: ${order.orderId}, skipping.`);
        }
      } catch (stockError) {
        console.error(`[CRITICAL] Stock deduction failed for order ${order.orderId} after successful payment!`, stockError);
        // If stock deduction fails, do NOT mark the order as paid.
        // It remains 'awaiting_payment' for manual intervention.
        update.paymentStatus = 'paid_stock_failed';
        update.orderStatus = 'On Hold';
        update.status = 'Payment Received, Stock Issue';
        
        // Skip invoice generation and cart clearing
        await orderModel.findByIdAndUpdate(order._id, update);
        
        return res.status(500).json({
          success: false,
          message: 'Payment successful, but stock update failed. Please contact support.',
          orderId: order.orderId,
        });
      }
      // -----------------------------------------------------------------

      update = {
        ...update,
        payment: true,
        paymentStatus: 'paid',
        orderStatus: 'Confirmed',
        status: 'Order Placed',
        paidAt: new Date()
      };
      
      // Clear user's cart (non-blocking)
      if (order.userId) {
        try {
          const { userModel } = await import('../models/userModel.js');
          await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
          console.log('User cart cleared successfully');
        } catch (cartError) {
          console.error('Failed to clear user cart:', cartError);
        }
      }
      
              // Generate and send invoice PDF via email (non-blocking)
        try {
          const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
          const freshOrder = await orderModel.findById(order._id); // get latest
          const pdfBuffer = await generateInvoiceBuffer(freshOrder);
          await sendInvoiceEmail(freshOrder, pdfBuffer);
          console.log('Invoice email sent successfully');
        } catch (err) {
          console.error('Invoice email error:', err);
        }
    } else {
      console.log('Payment failed, updating order status');
      update = {
        ...update,
        paymentStatus: 'failed',
        orderStatus: 'Failed',
        status: 'Payment Failed',
        failedAt: new Date()
      };
      
      // 🔑 CRITICAL: No stock restoration needed since stock is not pre-reserved
      // Stock is only deducted after successful payment confirmation
    }

    await orderModel.findByIdAndUpdate(order._id, update);
    console.log('Order updated successfully:', order._id);

    // Determine redirect URL based on payment status
    const redirectUrl = isSuccess
      ? `${process.env.FRONTEND_URL || 'https://shithaa.in'}/order-success?orderId=${order.orderId}`
      : `${process.env.FRONTEND_URL || 'https://shithaa.in'}/payment-failed?orderId=${order.orderId}`;

    res.json({
      success: isSuccess,
      message: isSuccess ? 'Payment successful' : 'Payment failed',
      orderId: order._id,
      redirectUrl
    });
  } catch (error) {
    console.error('PhonePe Callback Error:', error);
    res.status(500).json({
      success: false,
      message: 'Callback processing failed',
      error: error.message
    });
  }
};

// Verify PhonePe payment status using SDK
export const verifyPhonePePayment = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { merchantTransactionId } = req.params;
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant transaction ID is required'
      });
    }

    console.log('Verifying PhonePe payment for transaction:', merchantTransactionId);

    // Find the order by PhonePe transaction ID
    const order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this transaction'
      });
    }

    // Initialize PhonePe client
    const phonePeClient = await initializePhonePeClient();
    
    // 🔧 CRITICAL FIX: Check if PhonePe client was initialized successfully
    if (!phonePeClient) {
      console.error('PhonePe client initialization failed - cannot verify payment');
      return res.status(500).json({
        success: false,
        message: 'Payment verification service unavailable',
        error: 'PhonePe client not initialized'
      });
    }
    
    // Check payment status
    let paymentStatus;
    try {
        // 🔧 CRITICAL FIX: Try both method names for PhonePe SDK compatibility
        if (typeof phonePeClient.getOrderStatus === 'function') {
            paymentStatus = await phonePeClient.getOrderStatus(merchantTransactionId);
        } else if (typeof phonePeClient.getStatus === 'function') {
            paymentStatus = await phonePeClient.getStatus(merchantTransactionId);
        } else {
            console.error('PhonePe client missing both getOrderStatus and getStatus methods');
            return res.status(500).json({
                success: false,
                message: 'Payment verification failed - PhonePe client method not found',
                error: 'Missing getOrderStatus/getStatus method'
            });
        }
        
        console.log('PhonePe payment status:', paymentStatus);
        
        if (!paymentStatus) {
            console.error('PhonePe returned null/undefined payment status');
            return res.status(500).json({
                success: false,
                message: 'Payment verification failed - no status received from PhonePe',
                error: 'Null payment status'
            });
        }
    } catch (statusError) {
        console.error('PhonePe getOrderStatus/getStatus failed:', statusError);
        return res.status(500).json({
            success: false,
            message: 'Payment verification failed - PhonePe API error',
            error: statusError.message
        });
    }

    const isSuccess = (
      paymentStatus.state === 'PAID' ||
      paymentStatus.state === 'COMPLETED' ||
      paymentStatus.responseCode === 'SUCCESS' ||
      paymentStatus.responseCode === '000'
    );

    // 🔑 CRITICAL FIX: If payment is successful, update the main order as well.
    // This makes the verification endpoint a reliable fallback for the webhook.
    if (isSuccess) {
      if (order.paymentStatus !== 'paid') {
        console.log(`[verify] Webhook was slow, updating order ${order.orderId} to paid.`);
        
        if (!order.stockConfirmed) {
          const { confirmOrderStock } = await import('../controllers/orderController.js');
          try {
            console.log('Reducing stock for order (verify path):', order._id);
            await confirmOrderStock(order._id);
            console.log('Stock reduction completed successfully');
          } catch (stockError) {
            console.error('Failed to reduce stock during verify:', stockError);
            // Continue with order update even if stock reduction fails
          }
        } else {
          console.log('Stock already confirmed for order; skipping deduction in verify path');
        }
        
        // Update order status
        const updateData = {
          payment: true,
          paymentStatus: 'paid',
          orderStatus: 'Confirmed',
          status: 'Order Placed',
          paidAt: new Date(),
          stockConfirmed: true,
          stockConfirmedAt: new Date(),
          updatedAt: new Date()
        };
        
        await orderModel.findByIdAndUpdate(order._id, updateData);

        // Clear user's cart (non-blocking)
        if (order.userId) {
          try {
            const { userModel } = await import('../models/userModel.js');
            await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
            console.log('User cart cleared successfully');
          } catch (cartError) {
            console.error('Failed to clear user cart:', cartError);
          }
        }

        // Send invoice email (non-blocking)
        try {
          const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
          generateInvoiceBuffer(order)
            .then(pdfBuffer => sendInvoiceEmail(order, pdfBuffer))
            .catch(err => console.error('Error sending invoice from verify endpoint:', err));
        } catch (err) {
          console.error('Error preparing invoice from verify endpoint:', err);
        }
      }
    }

    return res.json({
      success: true,
      orderId: order._id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      phonepeStatus: paymentStatus,
      isSuccess
    });

  } catch (error) {
    console.error('PhonePe verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Function removed - Order is now created upfront in createPhonePeSession
// This ensures the order exists when the webhook arrives, fixing the data persistence issue

// Dummy payment endpoint for testing invoice email
export const dummyPaymentSuccess = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required' });
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Mark as paid
    order.payment = true;
    order.paymentStatus = 'paid';
    order.orderStatus = 'Confirmed';
    order.status = 'Order Placed';
    await order.save();
    // Generate and send invoice
    try {
      const pdfBuffer = await generateInvoiceBuffer(order);
      await sendInvoiceEmail(order, pdfBuffer);
    } catch (err) {
      console.error('Invoice email error (dummy):', err);
    }
    res.json({ success: true, message: 'Dummy payment processed and invoice sent.' });
  } catch (err) {
    console.error('Dummy payment error:', err);
    res.status(500).json({ success: false, message: 'Dummy payment failed', error: err.message });
  }
}; 

/**
 * Get payment status for a checkout session
 */
export const getPaymentStatus = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }
    
    // Find checkout session
    const checkoutSession = await CheckoutSession.findOne({ sessionId });
    if (!checkoutSession) {
      return errorResponse(res, 404, 'Checkout session not found');
    }
    
    // Check if session is expired
    if (checkoutSession.isExpired()) {
      return successResponse(res, {
        status: 'expired',
        message: 'Checkout session has expired',
        sessionId
      });
    }
    
    // If we have a PhonePe transaction ID, check payment status
    if (checkoutSession.phonepeTransactionId) {
      const paymentSession = await PaymentSession.findOne({ 
        phonepeTransactionId: checkoutSession.phonepeTransactionId 
      });
      
      if (paymentSession) {
        return successResponse(res, {
          status: paymentSession.status,
          message: `Payment ${paymentSession.status}`,
          sessionId,
          phonepeTransactionId: checkoutSession.phonepeTransactionId,
          paymentDetails: {
            redirectUrl: paymentSession.phonepeResponse?.redirectUrl,
            responseCode: paymentSession.phonepeResponse?.responseCode,
            responseMessage: paymentSession.phonepeResponse?.responseMessage
          }
        });
      }
    }
    
    // Return checkout session status
    return successResponse(res, {
      status: checkoutSession.status,
      message: `Checkout ${checkoutSession.status}`,
      sessionId,
      stockReserved: checkoutSession.stockReserved,
      expiresAt: checkoutSession.expiresAt
    });
    
  } catch (error) {
    console.error(`[${correlationId}] Error getting payment status:`, error);
    return errorResponse(res, 500, 'Failed to get payment status', error.message);
  }
}; 

/**
 * Get order by transaction id / payment id (robust search across possible fields)
 * Used by routes that expect getOrderByTransactionId to exist.
 */
export const getOrderByTransactionId = async (req, res) => {
  try {
    // transactionId can come from params, query, or body
    const transactionId =
      (req.params && req.params.transactionId) ||
      req.query?.transactionId ||
      req.body?.transactionId ||
      req.body?.phonepeTransactionId ||
      req.body?.paymentId;

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'missing_transaction_id' });
    }

    // Attempt common locations where transaction id might be stored
    const order = await orderModel.findOne({
      $or: [
        { paymentId: transactionId },
        { phonepeTransactionId: transactionId },
        { 'payments.transactionId': transactionId },
        { 'payment.transactionId': transactionId },
        { transactionId: transactionId }
      ]
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, error: 'order_not_found' });
    }

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('getOrderByTransactionId error', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}; 

// Helper function moved to webhookController.js to avoid duplication 