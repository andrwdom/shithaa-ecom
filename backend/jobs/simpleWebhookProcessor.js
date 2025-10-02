import mongoose from 'mongoose';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db';

/**
 * SIMPLE WEBHOOK PROCESSOR
 * 
 * This is a simplified, stable webhook processor that won't crash
 * and handles the basic webhook processing without complex features
 */
class SimpleWebhookProcessor {
  constructor() {
    this.isProcessing = false;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (!this.isConnected) {
        await mongoose.connect(MONGO_URI);
        this.isConnected = true;
        console.log('🔗 Connected to MongoDB');
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async processWebhook(raw) {
    try {
      console.log(`🔄 Processing webhook ${raw._id} from ${raw.provider}`);
      
      const event = JSON.parse(raw.raw);
      
      // Extract transaction details based on provider
      let gatewayTxnId, amount, status;
      
      if (raw.provider === 'phonepe') {
        gatewayTxnId = event?.transactionId || event?.data?.transactionId || event?.data?.merchantTransactionId;
        amount = event?.amount || event?.data?.amount;
        status = event?.state || event?.data?.state;
      } else if (raw.provider === 'razorpay') {
        gatewayTxnId = event?.payload?.payment?.entity?.id || event?.payment?.entity?.id;
        amount = event?.payload?.payment?.entity?.amount || event?.payment?.entity?.amount;
        status = event?.payload?.payment?.entity?.status || event?.payment?.entity?.status;
      }
      
      if (!gatewayTxnId) {
        raw.processed = true;
        raw.error = 'missing_txn_id';
        await raw.save();
        return { success: false, reason: 'missing_txn_id' };
      }

      // Check if payment is successful
      const isSuccess = (raw.provider === 'phonepe' && (status === 'COMPLETED' || status === 'SUCCESS')) ||
                       (raw.provider === 'razorpay' && (status === 'captured' || status === 'authorized'));

      if (!isSuccess) {
        raw.processed = true;
        raw.error = `payment_not_completed: ${status}`;
        await raw.save();
        return { success: false, reason: `payment_not_completed: ${status}` };
      }

      // Create order data
      const orderData = {
        gateway_txn_id: gatewayTxnId,
        phonepeTransactionId: gatewayTxnId,
        orderId: `WEBHOOK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: 'CONFIRMED',
        orderStatus: 'CONFIRMED',
        paymentStatus: 'PAID',
        total: amount ? amount / 100 : 0,
        totalAmount: amount ? amount / 100 : 0,
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
          provider: raw.provider,
          rawWebhookId: raw._id,
          webhookData: event
        },
        createdAt: new Date(),
        placedAt: new Date()
      };

      // Create order
      await orderModel.create(orderData);
      
      // Mark webhook as processed
      raw.processed = true;
      raw.processedAt = new Date();
      await raw.save();
      
      console.log(`✅ Processed ${raw.provider} webhook: ${gatewayTxnId}`);
      return { success: true, orderId: gatewayTxnId };
      
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key error - order already exists
        raw.processed = true;
        raw.processedAt = new Date();
        await raw.save();
        console.log(`✅ Duplicate ${raw.provider} webhook handled: ${gatewayTxnId}`);
        return { success: true, reason: 'duplicate' };
      } else {
        // Other error
        raw.error = err.message;
        await raw.save();
        console.error(`❌ Error processing ${raw.provider} webhook:`, err.message);
        throw err;
      }
    }
  }

  async processOne() {
    try {
      await this.connect();
      
      // Find unprocessed webhook
      const raw = await RawWebhook.findOneAndUpdate(
        { processed: false, processing: false }, 
        { $set: { processing: true } }, 
        { sort: { receivedAt: 1 }, returnDocument: 'after' }
      );
      
      if (!raw) {
        console.log('ℹ️ No raw webhooks to process');
        return { processed: false };
      }
      
      try {
        const result = await this.processWebhook(raw);
        console.log('✅ Webhook processed:', result);
        return { processed: true, result };
      } catch (err) {
        console.error('❌ Process failed:', err.message);
        // Reset processing flag
        await RawWebhook.findByIdAndUpdate(raw._id, { $set: { processing: false } });
        throw err;
      }
      
    } catch (err) {
      console.error('❌ Database error:', err.message);
      throw err;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.connection.close();
        this.isConnected = false;
        console.log('🔌 Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ Error disconnecting:', error.message);
    }
  }
}

// Main execution
async function run() {
  const processor = new SimpleWebhookProcessor();
  
  try {
    await processor.processOne();
    process.exit(0);
  } catch (error) {
    console.error('❌ Processor failed:', error.message);
    process.exit(1);
  } finally {
    await processor.disconnect();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down webhook processor...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down webhook processor...');
  process.exit(0);
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export default SimpleWebhookProcessor;
