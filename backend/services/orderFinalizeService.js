import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import { config } from '../config.js';

/**
 * Atomic order finalization service
 * Only finalizes orders on successful webhook confirmation
 * Uses MongoDB transactions for atomicity
 */
export async function finalizeOrder(paymentId, paymentData) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // 1. Find the draft order
      const order = await Order.findOne({ 
        'payment.paymentId': paymentId,
        status: 'draft'
      }).session(session);
      
      if (!order) {
        throw new Error(`Draft order not found for payment ${paymentId}`);
      }
      
      // 2. Validate stock availability atomically
      const stockValidation = await validateAndReserveStock(order.items, session);
      
      if (!stockValidation.success) {
        // Refund payment if stock not available
        await refundPayment(paymentId, paymentData);
        
        await Order.findByIdAndUpdate(order._id, {
          status: 'cancelled_due_to_stock',
          paymentStatus: 'refunded',
          cancelledAt: new Date(),
          cancellationReason: 'Insufficient stock'
        }, { session });
        
        throw new Error(`Insufficient stock for order ${order.orderId}`);
      }
      
      // 3. Finalize the order
      await Order.findByIdAndUpdate(order._id, {
        status: 'confirmed',
        paymentStatus: 'completed',
        payment: {
          ...order.payment,
          transactionId: paymentData.transactionId,
          gatewayResponse: paymentData,
          completedAt: new Date()
        },
        confirmedAt: new Date(),
        stockConfirmed: true
      }, { session });
      
      console.log(`Order ${order.orderId} finalized successfully`);
    });
    
  } catch (error) {
    console.error(`Order finalization failed for ${paymentId}:`, error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Validate and atomically reserve stock for order items
 */
async function validateAndReserveStock(items, session) {
  const stockOperations = [];
  
  for (const item of items) {
    const productId = item.product;
    const size = item.size;
    const quantity = item.quantity;
    
    // Atomic stock decrement with validation
    const result = await Product.findOneAndUpdate(
      {
        _id: productId,
        'sizes.size': size,
        'sizes.availableStock': { $gte: quantity }
      },
      {
        $inc: {
          'sizes.$.availableStock': -quantity,
          'sizes.$.reserved': -quantity // Release reservation
        }
      },
      { 
        new: true,
        session
      }
    );
    
    if (!result) {
      // Rollback already processed items
      await rollbackStockReservations(stockOperations, session);
      return { success: false, error: `Insufficient stock for product ${productId} size ${size}` };
    }
    
    stockOperations.push({ productId, size, quantity });
  }
  
  return { success: true };
}

/**
 * Rollback stock reservations if finalization fails
 */
async function rollbackStockReservations(operations, session) {
  for (const op of operations) {
    await Product.findOneAndUpdate(
      { _id: op.productId, 'sizes.size': op.size },
      {
        $inc: {
          'sizes.$.availableStock': op.quantity,
          'sizes.$.reserved': op.quantity
        }
      },
      { session }
    );
  }
}

/**
 * Refund payment (placeholder - implement based on your payment provider)
 */
async function refundPayment(paymentId, paymentData) {
  try {
    // TODO: Implement actual refund logic based on your payment provider
    console.log(`Refunding payment ${paymentId} for amount ${paymentData.amount}`);
    
    // Example for PhonePe (implement actual API call)
    // const refundResponse = await phonepeRefundAPI(paymentId, paymentData.amount);
    
    return { success: true, refundId: `refund_${Date.now()}` };
  } catch (error) {
    console.error(`Refund failed for ${paymentId}:`, error);
    throw error;
  }
}

/**
 * Compensating transaction approach (fallback if transactions not available)
 */
export async function finalizeOrderCompensating(paymentId, paymentData) {
  const order = await Order.findOne({ 
    'payment.paymentId': paymentId,
    status: 'draft'
  });
  
  if (!order) {
    throw new Error(`Draft order not found for payment ${paymentId}`);
  }
  
  const stockOperations = [];
  
  try {
    // 1. Reserve stock atomically
    for (const item of order.items) {
      const result = await Product.findOneAndUpdate(
        {
          _id: item.product,
          'sizes.size': item.size,
          'sizes.availableStock': { $gte: item.quantity }
        },
        {
          $inc: {
            'sizes.$.availableStock': -item.quantity,
            'sizes.$.reserved': -item.quantity
          }
        },
        { new: true }
      );
      
      if (!result) {
        // Compensate: rollback previous operations
        await compensateStockOperations(stockOperations);
        throw new Error(`Insufficient stock for product ${item.product}`);
      }
      
      stockOperations.push({ productId: item.product, size: item.size, quantity: item.quantity });
    }
    
    // 2. Finalize order
    await Order.findByIdAndUpdate(order._id, {
      status: 'confirmed',
      paymentStatus: 'completed',
      payment: {
        ...order.payment,
        transactionId: paymentData.transactionId,
        gatewayResponse: paymentData,
        completedAt: new Date()
      },
      confirmedAt: new Date(),
      stockConfirmed: true
    });
    
    console.log(`Order ${order.orderId} finalized successfully (compensating approach)`);
    
  } catch (error) {
    // Compensate on error
    await compensateStockOperations(stockOperations);
    throw error;
  }
}

/**
 * Compensate stock operations (rollback)
 */
async function compensateStockOperations(operations) {
  for (const op of operations) {
    await Product.findOneAndUpdate(
      { _id: op.productId, 'sizes.size': op.size },
      {
        $inc: {
          'sizes.$.availableStock': op.quantity,
          'sizes.$.reserved': op.quantity
        }
      }
    );
  }
}
