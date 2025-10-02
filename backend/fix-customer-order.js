#!/usr/bin/env node

import mongoose from 'mongoose';
import orderModel from './models/orderModel.js';
import dotenv from 'dotenv';

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

async function fixCustomerOrder() {
  console.log('🔧 FIXING CUSTOMER ORDER: dhivyabharathi095@gmail.com');
  
  // Find the stuck order
  const stuckOrder = await orderModel.findOne({ 
    orderId: 'OX1Y',
    status: 'DRAFT'
  });
  
  if (!stuckOrder) {
    console.log('❌ Order OX1Y not found or already fixed');
    return;
  }

  console.log(`📋 Found order: ${stuckOrder.orderId}`);
  console.log(`   Customer: ${stuckOrder.userInfo?.email}`);
  console.log(`   Amount: ₹${stuckOrder.total || stuckOrder.totalAmount}`);
  console.log(`   Transaction: ${stuckOrder.phonepeTransactionId}`);

  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Update order to CONFIRMED
      await orderModel.findByIdAndUpdate(
        stuckOrder._id,
        {
          status: 'CONFIRMED',
          orderStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
          confirmedAt: new Date(),
          paidAt: new Date(),
          phonepeResponse: { manualFix: true, fixedAt: new Date() },
          stockConfirmed: true,
          stockConfirmedAt: new Date(),
          updatedAt: new Date(),
          fixedByScript: true,
          fixedAt: new Date()
        },
        { session }
      );

      console.log(`✅ Order ${stuckOrder.orderId} confirmed successfully!`);
      console.log(`🎉 Customer dhivyabharathi095@gmail.com order is now ready for fulfillment!`);
    });

  } catch (error) {
    console.error(`❌ Failed to confirm order: ${error.message}`);
  } finally {
    session.endSession();
  }
}

async function main() {
  try {
    await connectDB();
    await fixCustomerOrder();
  } catch (error) {
    console.error(`💥 Script failed: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Database disconnected.');
  }
}

main();

