/**
 * LEGACY WEBHOOK PROCESSOR - DISABLED FOR SECURITY
 * 
 * ⚠️  CRITICAL SECURITY WARNING ⚠️
 * This legacy processor has been DISABLED due to security vulnerabilities:
 * - No signature verification
 * - No proper idempotency
 * - No stock validation
 * - Creates orders without proper validation
 * 
 * The new bulletproof webhook system should be used instead.
 * 
 * TO RE-ENABLE: Remove this warning block and ensure proper security measures are in place.
 */

import mongoose from 'mongoose';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db';

// DISABLE LEGACY PROCESSOR FOR SECURITY
console.log('🚫 LEGACY WEBHOOK PROCESSOR DISABLED FOR SECURITY REASONS');
console.log('🚫 Use the bulletproof webhook system instead');
process.exit(0);

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  // Don't exit, just log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, just log and continue
});

async function processPhonePeWebhook(raw) {
  try {
    const event = JSON.parse(raw.raw);
    
    const gatewayTxnId = event?.transactionId || event?.data?.transactionId || event?.data?.merchantTransactionId;
    const amount = event?.amount || event?.data?.amount;
    const status = event?.state || event?.data?.state;
    
    if (!gatewayTxnId) {
      raw.processed = true;
      raw.error = 'missing_txn_id';
      await raw.save();
      return { success: false, reason: 'missing_txn_id' };
    }

    if (status !== 'COMPLETED' && status !== 'SUCCESS') {
      raw.processed = true;
      raw.error = `payment_not_completed: ${status}`;
      await raw.save();
      return { success: false, reason: `payment_not_completed: ${status}` };
    }

    try {
      const orderData = {
        gateway_txn_id: gatewayTxnId,
        phonepeTransactionId: gatewayTxnId,
        orderId: `WEBHOOK-${Date.now()}`,
        status: 'CONFIRMED',
        orderStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentMethod: 'PhonePe',
        amount: amount || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create order from webhook data
      const order = new orderModel(orderData);
      await order.save();

      raw.processed = true;
      raw.processedAt = new Date();
      await raw.save();

      console.log(`✅ Webhook processed successfully: ${gatewayTxnId}`);
      return { success: true, orderId: order._id };
    } catch (orderError) {
      console.error('❌ Error creating order:', orderError.message);
      raw.processed = true;
      raw.error = `order_creation_failed: ${orderError.message}`;
      await raw.save();
      return { success: false, reason: `order_creation_failed: ${orderError.message}` };
    }
  } catch (parseError) {
    console.error('❌ Error parsing webhook data:', parseError.message);
    raw.processed = true;
    raw.error = `parse_error: ${parseError.message}`;
    await raw.save();
    return { success: false, reason: `parse_error: ${parseError.message}` };
  }
}

async function processOne(raw) {
  try {
    console.log(`🔄 Processing webhook: ${raw._id}`);
    
    // Auto-detect webhook source if not set
    let source = raw.source;
    if (!source) {
      try {
        const event = JSON.parse(raw.raw);
        if (event?.transactionId || event?.data?.transactionId || event?.data?.merchantTransactionId) {
          source = 'phonepe';
          raw.source = 'phonepe';
          await raw.save();
          console.log(`🔍 Auto-detected webhook source: ${source}`);
        }
      } catch (parseError) {
        console.log(`⚠️ Could not parse webhook data for source detection: ${parseError.message}`);
      }
    }
    
    if (source === 'phonepe') {
      return await processPhonePeWebhook(raw);
    } else {
      console.log(`⚠️ Unknown webhook source: ${source || 'undefined'}`);
      raw.processed = true;
      raw.error = 'unknown_source';
      await raw.save();
      return { success: false, reason: 'unknown_source' };
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error.message);
    raw.processed = true;
    raw.error = `processing_error: ${error.message}`;
    await raw.save();
    return { success: false, reason: `processing_error: ${error.message}` };
  }
}

async function processWebhooks() {
  try {
    console.log('🚀 Starting webhook processor...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Find unprocessed webhooks
    const rawWebhooks = await RawWebhook.find({ processed: false }).limit(10);
    
    if (rawWebhooks.length === 0) {
      console.log('ℹ️ No raw webhooks to process');
      return;
    }
    
    console.log(`📦 Found ${rawWebhooks.length} webhooks to process`);
    
    // Process each webhook
    let processed = 0;
    let failed = 0;
    
    for (const raw of rawWebhooks) {
      const result = await processOne(raw);
      if (result.success) {
        processed++;
      } else {
        failed++;
        console.log(`❌ Failed to process webhook ${raw._id}: ${result.reason}`);
      }
    }
    
    console.log(`✅ Webhook processing complete: ${processed} processed, ${failed} failed`);
    
  } catch (error) {
    console.error('❌ Error in webhook processor:', error.message);
  }
}

// Main worker loop
async function startWorker() {
  console.log('🔄 Starting webhook processor worker...');
  
  // Connect to MongoDB
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
  
  // Process webhooks immediately
  await processWebhooks();
  
  // Set up interval to process webhooks every 2 minutes
  setInterval(async () => {
    try {
      await processWebhooks();
    } catch (error) {
      console.error('❌ Error in webhook processing interval:', error.message);
    }
  }, 2 * 60 * 1000); // 2 minutes
  
  console.log('✅ Webhook processor worker started - will process webhooks every 2 minutes');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down webhook processor worker...');
  try {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing connection:', error.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down webhook processor worker...');
  try {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing connection:', error.message);
  }
  process.exit(0);
});

// Start the worker
startWorker().catch(error => {
  console.error('❌ Failed to start webhook processor worker:', error.message);
  process.exit(1);
});
