import mongoose from 'mongoose';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db';

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
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
        phonepeTransactionId: gatewayTxnId, // Also set the existing field
        orderId: `WEBHOOK-${Date.now()}`,
        status: 'CONFIRMED',
        orderStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        total: amount ? amount / 100 : 0,
        totalAmount: amount ? amount / 100 : 0,
        // Add required shipping info with defaults
        shippingInfo: {
          fullName: 'Webhook Order',
          email: 'webhook@shithaa.in',
          phone: '0000000000',
          addressLine1: 'Webhook Address',
          city: 'Webhook City',
          state: 'Webhook State',
          postalCode: '000000',
          country: 'India'
        },
        userInfo: {
          email: 'webhook@shithaa.in',
          name: 'Webhook Order'
        },
        meta: {
          provider: 'phonepe',
          rawWebhookId: raw._id,
          webhookData: event
        },
        createdAt: new Date(),
        placedAt: new Date()
      };

      await orderModel.create(orderData);
      
      raw.processed = true;
      raw.processedAt = new Date();
      await raw.save();
      
      console.log(`✅ Processed PhonePe webhook: ${gatewayTxnId}`);
      return { success: true, orderId: gatewayTxnId };
      
    } catch (err) {
      if (err.code === 11000) {
        raw.processed = true;
        raw.processedAt = new Date();
        await raw.save();
        console.log(`✅ Duplicate PhonePe webhook handled: ${gatewayTxnId}`);
        return { success: true, reason: 'duplicate' };
      } else {
        raw.error = err.message;
        await raw.save();
        throw err;
      }
    }
  } catch (err) {
    console.error('❌ Error processing PhonePe webhook', err, raw._id);
    raw.error = (raw.error || '') + '|' + err.message;
    await raw.save().catch(() => {});
    throw err;
  }
}

async function processRazorpayWebhook(raw) {
  try {
    const event = JSON.parse(raw.raw);
    
    const gatewayTxnId = event?.payload?.payment?.entity?.id || event?.payment?.entity?.id;
    const amount = event?.payload?.payment?.entity?.amount || event?.payment?.entity?.amount;
    const status = event?.payload?.payment?.entity?.status || event?.payment?.entity?.status;
    
    if (!gatewayTxnId) {
      raw.processed = true;
      raw.error = 'missing_txn_id';
      await raw.save();
      return { success: false, reason: 'missing_txn_id' };
    }

    if (status !== 'captured' && status !== 'authorized') {
      raw.processed = true;
      raw.error = `payment_not_completed: ${status}`;
      await raw.save();
      return { success: false, reason: `payment_not_completed: ${status}` };
    }

    try {
      const orderData = {
        gateway_txn_id: gatewayTxnId,
        orderId: `WEBHOOK-${Date.now()}`,
        status: 'CONFIRMED',
        orderStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        total: amount ? amount / 100 : 0,
        totalAmount: amount ? amount / 100 : 0,
        // Add required shipping info with defaults
        shippingInfo: {
          fullName: 'Webhook Order',
          email: 'webhook@shithaa.in',
          phone: '0000000000',
          addressLine1: 'Webhook Address',
          city: 'Webhook City',
          state: 'Webhook State',
          postalCode: '000000',
          country: 'India'
        },
        userInfo: {
          email: 'webhook@shithaa.in',
          name: 'Webhook Order'
        },
        meta: {
          provider: 'razorpay',
          rawWebhookId: raw._id,
          webhookData: event
        },
        createdAt: new Date(),
        placedAt: new Date()
      };

      await orderModel.create(orderData);
      
      raw.processed = true;
      raw.processedAt = new Date();
      await raw.save();
      
      console.log(`✅ Processed Razorpay webhook: ${gatewayTxnId}`);
      return { success: true, orderId: gatewayTxnId };
      
    } catch (err) {
      if (err.code === 11000) {
        raw.processed = true;
        raw.processedAt = new Date();
        await raw.save();
        console.log(`✅ Duplicate Razorpay webhook handled: ${gatewayTxnId}`);
        return { success: true, reason: 'duplicate' };
      } else {
        raw.error = err.message;
        await raw.save();
        throw err;
      }
    }
  } catch (err) {
    console.error('❌ Error processing Razorpay webhook', err, raw._id);
    raw.error = (raw.error || '') + '|' + err.message;
    await raw.save().catch(() => {});
    throw err;
  }
}

async function processOne(raw) {
  try {
    console.log(`🔄 Processing webhook ${raw._id} from ${raw.provider}`);
    
    let result;
    switch (raw.provider) {
      case 'phonepe':
        result = await processPhonePeWebhook(raw);
        break;
      case 'razorpay':
        result = await processRazorpayWebhook(raw);
        break;
      default:
        raw.processed = true;
        raw.error = 'unsupported_provider';
        await raw.save();
        result = { success: false, reason: 'unsupported_provider' };
    }
    
    return result;
  } catch (err) {
    console.error('❌ Error processing raw webhook', err, raw._id);
    raw.error = (raw.error || '') + '|' + err.message;
    await raw.save().catch(() => {});
    throw err;
  }
}

async function run() {
  let connection = null;
  
  try {
    console.log('🚀 Starting webhook processor...');
    
    // Connect to MongoDB with timeout
    connection = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    
    console.log('🔗 Connected to MongoDB');
    
    // Find unprocessed webhook
    const raw = await RawWebhook.findOneAndUpdate(
      { processed: false, processing: false }, 
      { $set: { processing: true } }, 
      { sort: { receivedAt: 1 }, returnDocument: 'after' }
    );
    
    if (!raw) {
      console.log('ℹ️ No raw webhooks to process');
      process.exit(0);
    }
    
    console.log(`🔄 Processing webhook ${raw._id} from ${raw.provider}`);
    
    try {
      const result = await processOne(raw);
      console.log('✅ Processed webhook successfully:', result);
      process.exit(0);
    } catch (err) {
      console.error('❌ Webhook processing failed:', err.message);
      
      // Reset processing flag
      try {
        await RawWebhook.findByIdAndUpdate(raw._id, { 
          $set: { 
            processing: false,
            error: err.message,
            lastError: err.message,
            lastErrorAt: new Date()
          } 
        });
        console.log('🔄 Reset processing flag for failed webhook');
      } catch (updateErr) {
        console.error('❌ Failed to reset processing flag:', updateErr.message);
      }
      
      process.exit(1);
    }
    
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  } finally {
    // Clean up connection
    if (connection) {
      try {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
      } catch (closeErr) {
        console.error('❌ Error closing connection:', closeErr.message);
      }
    }
  }
}

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down webhook processor...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down webhook processor...');
  await mongoose.connection.close();
  process.exit(0);
});

run();