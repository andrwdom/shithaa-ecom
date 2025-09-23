import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import dotenv from 'dotenv';
dotenv.config();

async function migrateOrderUserIds() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha');
  console.log('Connected to MongoDB');

  const users = await userModel.find({}, { _id: 1, email: 1 });
  const emailToUserId = {};
  users.forEach(u => {
    if (u.email) emailToUserId[u.email.toLowerCase()] = u._id;
  });

  const orders = await orderModel.find({ userId: { $exists: false } });
  let updated = 0;
  for (const order of orders) {
    const userId = emailToUserId[order.email?.toLowerCase()];
    if (userId) {
      order.userId = userId;
      await order.save();
      updated++;
      // console.log(`Updated order ${order._id} with userId ${userId}`);
    }
  }
  console.log(`Migration complete. Updated ${updated} orders.`);
  process.exit(0);
}

migrateOrderUserIds().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 