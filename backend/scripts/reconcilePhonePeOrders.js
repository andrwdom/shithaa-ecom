import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import { StandardCheckoutClient } from 'pg-sdk-node';
import dotenv from 'dotenv';
dotenv.config();

const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_API_KEY = process.env.PHONEPE_API_KEY;
const PHONEPE_SALT_INDEX = parseInt(process.env.PHONEPE_SALT_INDEX || '1', 10);
const PHONEPE_ENV = process.env.PHONEPE_ENV === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
const phonepeClient = StandardCheckoutClient.getInstance(
  PHONEPE_MERCHANT_ID,
  PHONEPE_API_KEY,
  PHONEPE_SALT_INDEX,
  PHONEPE_ENV
);

async function reconcilePendingOrders() {
  await mongoose.connect(process.env.MONGODB_URI);
  const pendingOrders = await orderModel.find({ paymentStatus: 'PENDING', phonepeTransactionId: { $exists: true, $ne: null } });
  for (const order of pendingOrders) {
    try {
      // 🔧 CRITICAL FIX: Try both method names for PhonePe SDK compatibility
      let response;
      if (typeof phonepeClient.getOrderStatus === 'function') {
          response = await phonepeClient.getOrderStatus(order.phonepeTransactionId);
      } else if (typeof phonepeClient.getStatus === 'function') {
          response = await phonepeClient.getStatus(order.phonepeTransactionId);
      } else {
          console.error('PhonePe client missing both getOrderStatus and getStatus methods');
          continue;
      }
      if (response && response.state) {
        order.paymentStatus = response.state === 'COMPLETED' ? 'paid' : response.state.toLowerCase();
        order.orderStatus = response.state === 'COMPLETED' ? 'Pending' : response.state.toLowerCase();
        order.status = response.state;
        await order.save();
        console.log(`Order ${order._id} updated to state: ${response.state}`);
      } else {
        console.log(`Order ${order._id} status unchanged.`);
      }
    } catch (err) {
      console.error(`Error reconciling order ${order._id}:`, err.message);
    }
  }
  await mongoose.disconnect();
}

reconcilePendingOrders().then(() => {
  console.log('Reconciliation complete.');
  process.exit(0);
}); 