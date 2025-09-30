import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import RawWebhook from '../models/RawWebhook.js';
import ProcessedEvent from '../models/ProcessedEvent.js';
import { finalizeOrder, finalizeOrderCompensating } from '../services/orderFinalizeService.js';
import { config } from '../config.js';

/**
 * Reconcile missed payments
 * Runs every 5 minutes to check for draft orders older than 10 minutes
 * and queries payment provider to finalize or cancel them
 */

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(config.mongodb_uri);
    console.log('✅ [Reconcile Job] Connected to MongoDB');
  } catch (error) {
    console.error('❌ [Reconcile Job] MongoDB connection failed:', error);
    process.exit(1);
  }
}

/**
 * Check payment status with PhonePe API
 */
async function checkPhonePePaymentStatus(paymentId) {
  try {
    // TODO: Implement actual PhonePe API call
    // This is a placeholder - replace with real API call
    
    const phonepeApiUrl = config.phonepe.env === 'PRODUCTION' 
      ? 'https://api.phonepe.com/apis/pg-sdk/pg/v1/status'
      : 'https://api-preprod.phonepe.com/apis/pg-sdk/pg/v1/status';
    
    const payload = {
      merchantId: config.phonepe.merchant_id,
      merchantTransactionId: paymentId,
      saltKey: config.phonepe.salt_key,
      saltIndex: config.phonepe.salt_index
    };
    
    // For now, simulate API response
    // In production, make actual HTTP request to PhonePe
    console.log(`Checking PhonePe payment status for ${paymentId}`);
    
    // Simulate different responses based on paymentId patterns
    if (paymentId.includes('test_success')) {
      return { status: 'COMPLETED', transactionId: `txn_${Date.now()}` };
    } else if (paymentId.includes('test_failed')) {
      return { status: 'FAILED', reason: 'Payment failed' };
    } else {
      return { status: 'PENDING', reason: 'Payment still processing' };
    }
    
  } catch (error) {
    console.error(`PhonePe API error for ${paymentId}:`, error);
    return { status: 'ERROR', reason: error.message };
  }
}

/**
 * Main reconciliation function
 */
async function reconcilePayments() {
  const startTime = Date.now();
  console.log('🔄 [Reconcile Job] Starting payment reconciliation...');
  
  try {
    // 1. Find draft orders older than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const draftOrders = await Order.find({
      status: 'draft',
      createdAt: { $lt: tenMinutesAgo },
      'payment.paymentId': { $exists: true }
    }).limit(50); // Process max 50 orders per run
    
    console.log(`📋 [Reconcile Job] Found ${draftOrders.length} draft orders to reconcile`);
    
    if (draftOrders.length === 0) {
      console.log('✅ [Reconcile Job] No draft orders to reconcile');
      return;
    }
    
    let successCount = 0;
    let failureCount = 0;
    let pendingCount = 0;
    
    // 2. Process each draft order
    for (const order of draftOrders) {
      try {
        const paymentId = order.payment.paymentId;
        
        // Check if already processed (idempotency)
        const existingEvent = await ProcessedEvent.findOne({
          paymentId: paymentId,
          status: { $in: ['completed', 'failed'] }
        });
        
        if (existingEvent) {
          console.log(`⏭️ [Reconcile Job] Order ${order.orderId} already processed, skipping`);
          continue;
        }
        
        // 3. Check payment status with provider
        const paymentStatus = await checkPhonePePaymentStatus(paymentId);
        
        console.log(`🔍 [Reconcile Job] Payment ${paymentId} status: ${paymentStatus.status}`);
        
        // 4. Process based on status
        if (paymentStatus.status === 'COMPLETED') {
          // Finalize the order
          await finalizeOrder(paymentId, {
            transactionId: paymentStatus.transactionId,
            status: 'COMPLETED',
            amount: order.total,
            currency: 'INR'
          });
          
          // Create processed event record
          await ProcessedEvent.create({
            eventId: `reconcile_${paymentId}_${Date.now()}`,
            provider: 'phonepe',
            paymentId: paymentId,
            orderId: order.orderId,
            status: 'completed',
            processedAt: new Date()
          });
          
          successCount++;
          console.log(`✅ [Reconcile Job] Order ${order.orderId} finalized successfully`);
          
        } else if (paymentStatus.status === 'FAILED' || paymentStatus.status === 'CANCELLED') {
          // Cancel the order
          await Order.findByIdAndUpdate(order._id, {
            status: 'cancelled',
            paymentStatus: 'failed',
            cancelledAt: new Date(),
            cancellationReason: paymentStatus.reason || 'Payment failed'
          });
          
          // Create processed event record
          await ProcessedEvent.create({
            eventId: `reconcile_${paymentId}_${Date.now()}`,
            provider: 'phonepe',
            paymentId: paymentId,
            orderId: order.orderId,
            status: 'failed',
            error: paymentStatus.reason,
            processedAt: new Date()
          });
          
          failureCount++;
          console.log(`❌ [Reconcile Job] Order ${order.orderId} cancelled: ${paymentStatus.reason}`);
          
        } else if (paymentStatus.status === 'PENDING') {
          // Still pending, skip for now
          pendingCount++;
          console.log(`⏳ [Reconcile Job] Order ${order.orderId} still pending`);
          
        } else {
          // Error or unknown status
          console.log(`⚠️ [Reconcile Job] Order ${order.orderId} unknown status: ${paymentStatus.status}`);
        }
        
      } catch (error) {
        console.error(`❌ [Reconcile Job] Error processing order ${order.orderId}:`, error);
        failureCount++;
      }
    }
    
    // 5. Log summary
    const duration = Date.now() - startTime;
    console.log(`✅ [Reconcile Job] Completed in ${duration}ms:`);
    console.log(`   - Success: ${successCount}`);
    console.log(`   - Failed: ${failureCount}`);
    console.log(`   - Pending: ${pendingCount}`);
    
    // 6. Alert if high failure rate
    if (failureCount > 5) {
      console.log(`🚨 [Reconcile Job] High failure rate detected: ${failureCount} failures`);
      // TODO: Send alert to monitoring system
    }
    
  } catch (error) {
    console.error('❌ [Reconcile Job] Reconciliation failed:', error);
  }
}

/**
 * Clean up old processed events (run daily)
 */
async function cleanupOldEvents() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await ProcessedEvent.deleteMany({
      processedAt: { $lt: thirtyDaysAgo }
    });
    
    console.log(`🧹 [Reconcile Job] Cleaned up ${result.deletedCount} old processed events`);
  } catch (error) {
    console.error('❌ [Reconcile Job] Cleanup failed:', error);
  }
}

/**
 * Health check for reconciliation system
 */
async function healthCheck() {
  try {
    // Check for stuck webhooks
    const stuckWebhooks = await RawWebhook.countDocuments({
      processing: true,
      processed: false,
      receivedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes ago
    });
    
    if (stuckWebhooks > 0) {
      console.log(`⚠️ [Reconcile Job] Found ${stuckWebhooks} stuck webhooks`);
    }
    
    // Check for old draft orders
    const oldDrafts = await Order.countDocuments({
      status: 'draft',
      createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour ago
    });
    
    if (oldDrafts > 0) {
      console.log(`⚠️ [Reconcile Job] Found ${oldDrafts} old draft orders`);
    }
    
    console.log('✅ [Reconcile Job] Health check completed');
    
  } catch (error) {
    console.error('❌ [Reconcile Job] Health check failed:', error);
  }
}

// Main execution
async function main() {
  await connectDB();
  
  // Run reconciliation
  await reconcilePayments();
  
  // Run cleanup (once per day)
  const now = new Date();
  if (now.getHours() === 2 && now.getMinutes() < 5) { // 2 AM
    await cleanupOldEvents();
  }
  
  // Run health check
  await healthCheck();
  
  // Close connection
  await mongoose.connection.close();
  console.log('✅ [Reconcile Job] Completed and disconnected');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { reconcilePayments, cleanupOldEvents, healthCheck };
