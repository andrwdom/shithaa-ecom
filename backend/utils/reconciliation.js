import cron from 'node-cron';
import orderModel from '../models/orderModel.js';
import { config } from '../config.js';
import mongoose from 'mongoose';

/**
 * Reconciliation system for orphaned draft orders
 * This runs daily to check for draft orders that may have been paid but not confirmed
 * due to webhook failures or other issues
 * 
 * 🚨 CRITICAL FIX: Added idempotency checks to prevent race conditions with webhook processing
 */

// Function to reconcile orphaned draft orders
async function reconcileOrphanedDrafts() {
  console.log('🔄 Starting reconciliation of orphaned draft orders...');
  
  try {
    // Find draft orders older than 30 minutes that are still pending payment
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const orphanedDrafts = await orderModel.find({
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      draftCreatedAt: { $lt: thirtyMinutesAgo }
    });

    console.log(`Found ${orphanedDrafts.length} orphaned draft orders to reconcile`);

    for (const draft of orphanedDrafts) {
      try {
        console.log(`Reconciling draft order ${draft.orderId} (${draft.phonepeTransactionId})`);
        
        // 🚨 CRITICAL FIX: Re-check order status with session to prevent race condition
        // If webhook processed this order in parallel, it might now be CONFIRMED
        const session = await mongoose.startSession();
        
        try {
          await session.withTransaction(async () => {
            // Re-fetch order with session to get latest status
            const currentOrder = await orderModel.findById(draft._id).session(session);
            
            if (!currentOrder) {
              console.log(`Order ${draft.orderId} no longer exists, skipping`);
              return;
            }
            
            // 🚨 CRITICAL: Check if order has already been confirmed by webhook
            if (currentOrder.status === 'CONFIRMED' || currentOrder.paymentStatus === 'PAID') {
              console.log(`Order ${draft.orderId} was already confirmed by webhook (status: ${currentOrder.status}, paymentStatus: ${currentOrder.paymentStatus}), skipping reconciliation`);
              return;
            }
            
            // If still DRAFT, proceed with reconciliation
            if (currentOrder.status === 'DRAFT' && currentOrder.paymentStatus === 'PENDING') {
              // Check with PhonePe API for payment status
              const paymentStatus = await checkPhonePePaymentStatus(draft.phonepeTransactionId);
              
              if (paymentStatus === 'COMPLETED') {
                console.log(`Draft order ${draft.orderId} was actually paid, confirming...`);
                await confirmDraftOrder(draft._id, session);
              } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
                console.log(`Draft order ${draft.orderId} payment failed, cancelling...`);
                await cancelDraftOrder(draft._id, 'Payment failed during reconciliation', session);
              } else {
                // Still pending or unknown status - cancel if older than 1 hour
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                if (draft.draftCreatedAt < oneHourAgo) {
                  console.log(`Draft order ${draft.orderId} is too old and still pending, cancelling...`);
                  await cancelDraftOrder(draft._id, 'Order expired during reconciliation', session);
                }
              }
            }
          });
        } finally {
          await session.endSession();
        }
      } catch (error) {
        console.error(`Failed to reconcile draft order ${draft.orderId}:`, error);
      }
    }

    console.log('🔄 Reconciliation completed');
  } catch (error) {
    console.error('Reconciliation failed:', error);
  }
}

// Function to check PhonePe payment status
async function checkPhonePePaymentStatus(transactionId) {
  try {
    // This would integrate with PhonePe's status API
    // For now, we'll return a mock status
    // In production, you'd call: https://api.phonepe.com/apis/pg-sdk/pg/v1/status/{merchantId}/{transactionId}
    
    console.log(`Checking PhonePe status for transaction: ${transactionId}`);
    
    // Mock implementation - replace with actual PhonePe API call
    // const response = await fetch(`https://api.phonepe.com/apis/pg-sdk/pg/v1/status/${config.PHONEPE_MERCHANT_ID}/${transactionId}`, {
    //   method: 'GET',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-VERIFY': generatePhonePeChecksum(transactionId),
    //     'accept': 'application/json'
    //   }
    // });
    
    // For now, return 'PENDING' to avoid false cancellations
    return 'PENDING';
  } catch (error) {
    console.error('Failed to check PhonePe status:', error);
    return 'UNKNOWN';
  }
}

// Function to confirm a draft order
async function confirmDraftOrder(orderId, session = null) {
  try {
    const order = await orderModel.findById(orderId).session(session);
    if (!order) {
      console.log(`Order ${orderId} not found for confirmation`);
      return;
    }

    // 🚨 CRITICAL: Check if order has already been confirmed
    if (order.status === 'CONFIRMED' || order.paymentStatus === 'PAID') {
      console.log(`Order ${orderId} already confirmed, skipping`);
      return;
    }

    // Update order status
    const updateOptions = session ? { session } : {};
    await orderModel.findByIdAndUpdate(orderId, {
      status: 'CONFIRMED',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      confirmedAt: new Date(),
      paidAt: new Date(),
      stockConfirmed: true,
      stockConfirmedAt: new Date(),
      metadata: {
        ...order.metadata,
        reconciledAt: new Date(),
        reconciliationReason: 'Payment confirmed during reconciliation'
      }
    }, updateOptions);

    console.log(`Draft order ${orderId} confirmed successfully`);
  } catch (error) {
    console.error(`Failed to confirm draft order ${orderId}:`, error);
  }
}

// Function to cancel a draft order
async function cancelDraftOrder(orderId, reason, session = null) {
  try {
    const order = await orderModel.findById(orderId).session(session);
    if (!order) {
      console.log(`Order ${orderId} not found for cancellation`);
      return;
    }

    // 🚨 CRITICAL: Check if order has already been confirmed - DO NOT CANCEL CONFIRMED ORDERS
    if (order.status === 'CONFIRMED' || order.paymentStatus === 'PAID') {
      console.log(`⚠️ Order ${orderId} is already CONFIRMED/PAID. NOT cancelling to prevent stock restoration bug!`);
      return;
    }

    // Release stock if it was reserved
    if (order.stockReserved && order.cartItems) {
      const { releaseStockReservation } = await import('./stock.js');
      for (const item of order.cartItems) {
        try {
          await releaseStockReservation(item.productId, item.size, item.quantity);
          console.log(`Released stock for ${item.name} (${item.size}) x${item.quantity}`);
        } catch (error) {
          console.error(`Failed to release stock for ${item.name}:`, error);
        }
      }
    }

    // Update order status
    const updateOptions = session ? { session } : {};
    await orderModel.findByIdAndUpdate(orderId, {
      status: 'CANCELLED',
      orderStatus: 'CANCELLED',
      paymentStatus: 'FAILED',
      metadata: {
        ...order.metadata,
        cancellationReason: reason,
        cancelledAt: new Date(),
        reconciledAt: new Date()
      }
    }, updateOptions);

    console.log(`Draft order ${orderId} cancelled successfully`);
  } catch (error) {
    console.error(`Failed to cancel draft order ${orderId}:`, error);
  }
}

// Schedule reconciliation to run daily at midnight
export function startReconciliationCron() {
  console.log('🔄 Starting reconciliation cron job...');
  
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 Running scheduled reconciliation...');
    await reconcileOrphanedDrafts();
  });

  // Also run every 6 hours for more frequent cleanup
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Running frequent reconciliation...');
    await reconcileOrphanedDrafts();
  });

  console.log('🔄 Reconciliation cron jobs started');
}

// Manual reconciliation function for testing
export async function runManualReconciliation() {
  console.log('🔄 Running manual reconciliation...');
  await reconcileOrphanedDrafts();
}

export default {
  startReconciliationCron,
  runManualReconciliation,
  reconcileOrphanedDrafts
};
