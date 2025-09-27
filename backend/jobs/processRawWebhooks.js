// processRawWebhooks.js
// Run this with pm2 as a separate process or cron every 30s
const mongoose = require('mongoose');
const RawWebhook = require('../models/RawWebhook');
const Orders = require('../models/Order');
const MONGO = process.env.MONGO_URI;

async function processPhonePeWebhook(raw) {
  try {
    const event = JSON.parse(raw.raw);
    
    // Extract PhonePe transaction details
    const gatewayTxnId = event?.transactionId || event?.data?.transactionId || event?.data?.merchantTransactionId;
    const amount = event?.amount || event?.data?.amount;
    const status = event?.state || event?.data?.state;
    
    if (!gatewayTxnId) {
      raw.processed = true;
      raw.error = 'missing_txn_id';
      await raw.save();
      return { success: false, reason: 'missing_txn_id' };
    }

    // Only process completed payments
    if (status !== 'COMPLETED' && status !== 'SUCCESS') {
      raw.processed = true;
      raw.error = `payment_not_completed: ${status}`;
      await raw.save();
      return { success: false, reason: `payment_not_completed: ${status}` };
    }

    // Idempotent create: try insert; if dup -> mark processed
    try {
      const orderData = {
        gateway_txn_id: gatewayTxnId,
        status: 'paid',
        paymentStatus: 'completed',
        totalAmount: amount ? amount / 100 : 0, // Convert from paise to rupees
        meta: {
          provider: 'phonepe',
          rawWebhookId: raw._id,
          webhookData: event
        },
        createdAt: new Date()
      };

      await Orders.create(orderData);
      
      raw.processed = true;
      raw.processedAt = new Date();
      await raw.save();
      
      console.log(`✅ Processed PhonePe webhook: ${gatewayTxnId}`);
      return { success: true, orderId: gatewayTxnId };
      
    } catch (err) {
      // duplicate key => order already exists
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
    
    // Extract Razorpay transaction details
    const gatewayTxnId = event?.payload?.payment?.entity?.id || event?.payment?.entity?.id;
    const amount = event?.payload?.payment?.entity?.amount || event?.payment?.entity?.amount;
    const status = event?.payload?.payment?.entity?.status || event?.payment?.entity?.status;
    
    if (!gatewayTxnId) {
      raw.processed = true;
      raw.error = 'missing_txn_id';
      await raw.save();
      return { success: false, reason: 'missing_txn_id' };
    }

    // Only process captured payments
    if (status !== 'captured') {
      raw.processed = true;
      raw.error = `payment_not_captured: ${status}`;
      await raw.save();
      return { success: false, reason: `payment_not_captured: ${status}` };
    }

    // Idempotent create: try insert; if dup -> mark processed
    try {
      const orderData = {
        gateway_txn_id: gatewayTxnId,
        status: 'paid',
        paymentStatus: 'completed',
        totalAmount: amount ? amount / 100 : 0, // Convert from paise to rupees
        meta: {
          provider: 'razorpay',
          rawWebhookId: raw._id,
          webhookData: event
        },
        createdAt: new Date()
      };

      await Orders.create(orderData);
      
      raw.processed = true;
      raw.processedAt = new Date();
      await raw.save();
      
      console.log(`✅ Processed Razorpay webhook: ${gatewayTxnId}`);
      return { success: true, orderId: gatewayTxnId };
      
    } catch (err) {
      // duplicate key => order already exists
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
    // leave processed=false so it will be retried
    raw.error = (raw.error || '') + '|' + err.message;
    await raw.save().catch(() => {});
    throw err;
  }
}

async function run() {
  try {
    await mongoose.connect(MONGO, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    
    console.log('🔗 Connected to MongoDB');
    
    // Pick oldest unprocessed webhook
    const raw = await RawWebhook.findOneAndUpdate(
      { processed: false, processing: false }, 
      { $set: { processing: true } }, 
      { sort: { receivedAt: 1 }, returnDocument: 'after' }
    );
    
    if (!raw) {
      console.log('ℹ️ No raw webhooks to process');
      process.exit(0);
    }
    
    try {
      const result = await processOne(raw);
      console.log('✅ Processed webhook:', result);
      process.exit(0);
    } catch (err) {
      console.error('❌ Process failed', err);
      // Reset processing flag on error
      await RawWebhook.findByIdAndUpdate(raw._id, { $set: { processing: false } });
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Database connection failed', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
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
