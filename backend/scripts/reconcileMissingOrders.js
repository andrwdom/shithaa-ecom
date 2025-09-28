import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import { log } from '../utils/structuredLogger.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

/**
 * Reconcile missing orders by checking payment provider APIs
 */
export async function reconcileMissingOrders(startDate, endDate) {
  const correlationId = `reconcile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    log.info('Starting order reconciliation', {
      correlationId,
      startDate,
      endDate
    });
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    log.info('Connected to MongoDB for reconciliation');
    
    // Find draft orders that might be missing confirmations
    const draftOrders = await orderModel.find({
      status: 'DRAFT',
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ createdAt: -1 });
    
    log.info('Found draft orders for reconciliation', {
      correlationId,
      count: draftOrders.length
    });
    
    const results = {
      totalDrafts: draftOrders.length,
      processed: 0,
      confirmed: 0,
      cancelled: 0,
      errors: 0,
      missingPayments: []
    };
    
    for (const draftOrder of draftOrders) {
      try {
        results.processed++;
        
        // Check if payment was successful via PhonePe API
        const paymentStatus = await checkPhonePePaymentStatus(draftOrder.phonepeTransactionId);
        
        if (paymentStatus.success && paymentStatus.status === 'COMPLETED') {
          // Payment was successful - confirm the order
          await confirmDraftOrder(draftOrder, paymentStatus);
          results.confirmed++;
          
          log.info('Draft order confirmed via reconciliation', {
            correlationId,
            orderId: draftOrder._id,
            phonepeTransactionId: draftOrder.phonepeTransactionId,
            amount: draftOrder.totalAmount
          });
        } else if (paymentStatus.success && paymentStatus.status === 'FAILED') {
          // Payment failed - cancel the order
          await cancelDraftOrder(draftOrder, 'Payment failed during reconciliation');
          results.cancelled++;
          
          log.info('Draft order cancelled via reconciliation', {
            correlationId,
            orderId: draftOrder._id,
            phonepeTransactionId: draftOrder.phonepeTransactionId,
            reason: 'Payment failed'
          });
        } else {
          // Payment status unknown or error
          results.missingPayments.push({
            orderId: draftOrder._id,
            phonepeTransactionId: draftOrder.phonepeTransactionId,
            amount: draftOrder.totalAmount,
            createdAt: draftOrder.createdAt,
            error: paymentStatus.error || 'Unknown payment status'
          });
          
          log.warn('Could not verify payment status during reconciliation', {
            correlationId,
            orderId: draftOrder._id,
            phonepeTransactionId: draftOrder.phonepeTransactionId,
            error: paymentStatus.error
          });
        }
        
      } catch (error) {
        results.errors++;
        log.error('Error processing draft order during reconciliation', {
          correlationId,
          orderId: draftOrder._id,
          error: error.message
        });
      }
    }
    
    log.info('Order reconciliation completed', {
      correlationId,
      results
    });
    
    return results;
    
  } catch (error) {
    log.error('Order reconciliation failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

/**
 * Check PhonePe payment status via API
 */
async function checkPhonePePaymentStatus(transactionId) {
  try {
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const apiKey = process.env.PHONEPE_API_KEY;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    
    if (!merchantId || !apiKey || !saltKey) {
      return {
        success: false,
        error: 'PhonePe credentials not configured'
      };
    }
    
    // Create request payload
    const payload = {
      merchantId,
      merchantTransactionId: transactionId
    };
    
    // Create checksum
    const crypto = require('crypto');
    const checksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload) + saltKey)
      .digest('hex');
    
    // Make API request
    const response = await fetch('https://api.phonepe.com/apis/hermes/pg/v1/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum + '###' + saltIndex,
        'accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        status: data.data?.state || 'UNKNOWN',
        amount: data.data?.amount,
        response: data
      };
    } else {
      return {
        success: false,
        error: data.message || 'API request failed'
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Confirm draft order
 */
async function confirmDraftOrder(draftOrder, paymentStatus) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Update order status
      await orderModel.findByIdAndUpdate(
        draftOrder._id,
        {
          status: 'CONFIRMED',
          orderStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
          confirmedAt: new Date(),
          paidAt: new Date(),
          phonepeResponse: paymentStatus.response,
          updatedAt: new Date()
        },
        { session }
      );
      
      // Confirm stock if not already confirmed
      if (!draftOrder.stockConfirmed && draftOrder.cartItems) {
        const { confirmStockReservation } = await import('../utils/stock.js');
        
        for (const item of draftOrder.cartItems) {
          await confirmStockReservation(
            item.productId,
            item.size,
            item.quantity,
            { session }
          );
        }
        
        await orderModel.findByIdAndUpdate(
          draftOrder._id,
          {
            stockConfirmed: true,
            stockConfirmedAt: new Date()
          },
          { session }
        );
      }
    });
    
  } finally {
    await session.endSession();
  }
}

/**
 * Cancel draft order
 */
async function cancelDraftOrder(draftOrder, reason) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Release stock if reserved
      if (draftOrder.stockReserved && draftOrder.cartItems) {
        const { releaseStockReservation } = await import('../utils/stock.js');
        
        for (const item of draftOrder.cartItems) {
          await releaseStockReservation(item.productId, item.size, item.quantity);
        }
      }
      
      // Update order status
      await orderModel.findByIdAndUpdate(
        draftOrder._id,
        {
          status: 'CANCELLED',
          orderStatus: 'CANCELLED',
          paymentStatus: 'FAILED',
          metadata: {
            ...draftOrder.metadata,
            cancellationReason: reason,
            cancelledAt: new Date()
          }
        },
        { session }
      );
    });
    
  } finally {
    await session.endSession();
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const startDate = process.argv[2] || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24 hours
  const endDate = process.argv[3] || new Date().toISOString();
  
  console.log('Starting order reconciliation...');
  console.log(`Date range: ${startDate} to ${endDate}`);
  
  reconcileMissingOrders(startDate, endDate)
    .then(results => {
      console.log('Reconciliation completed:', results);
      process.exit(0);
    })
    .catch(error => {
      console.error('Reconciliation failed:', error);
      process.exit(1);
    });
}
