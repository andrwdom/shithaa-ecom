// Usage: node backend/scripts/printOrdersByEmail.js user@example.com
import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node printOrdersByEmail.js <email>');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shitha';

async function main() {
  await mongoose.connect(MONGO_URI);
  const orders = await orderModel.find({
    $or: [
      { email: { $regex: new RegExp('^' + email + '$', 'i') } },
      { 'userInfo.email': { $regex: new RegExp('^' + email + '$', 'i') } }
    ]
  }).sort({ createdAt: -1 });
  if (!orders.length) {
    console.log('No orders found');
  } else {
    orders.forEach(o => {
      // console.log({
        _id: o._id,
        email: o.email,
        userInfo: o.userInfo,
        createdAt: o.createdAt,
        status: o.status,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus
      });
    });
  }
  await mongoose.disconnect();
  process.exit(0);
}

main(); 