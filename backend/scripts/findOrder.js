#!/usr/bin/env node

/**
 * FIND ORDER - Search for order by various criteria
 * Usage: node backend/scripts/findOrder.js <orderId|email|phone>
 */

import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

async function findOrder(searchTerm) {
  if (!searchTerm) {
    console.log('❌ Please provide search term');
    console.log('   Usage: node backend/scripts/findOrder.js <orderId|email|phone>');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('🔍 Searching for order...\n');

  try {
    // Try by orderId first
    let orders = await orderModel.find({
      orderId: { $regex: searchTerm, $options: 'i' }
    }).limit(10);

    if (orders.length === 0) {
      // Try by email
      orders = await orderModel.find({
        $or: [
          { email: { $regex: searchTerm, $options: 'i' } },
          { 'userInfo.email': { $regex: searchTerm, $options: 'i' } }
        ]
      }).limit(10);
    }

    if (orders.length === 0) {
      // Try by phone
      orders = await orderModel.find({
        phone: { $regex: searchTerm, $options: 'i' }
      }).limit(10);
    }

    if (orders.length === 0) {
      // Try by phonepeTransactionId
      orders = await orderModel.find({
        phonepeTransactionId: { $regex: searchTerm, $options: 'i' }
      }).limit(10);
    }

    // Also try recent orders (last 24 hours)
    if (orders.length === 0) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      orders = await orderModel.find({
        createdAt: { $gte: oneDayAgo }
      }).sort({ createdAt: -1 }).limit(10);
      
      if (orders.length > 0) {
        console.log('⚠️  No exact match found. Showing recent orders instead:\n');
      }
    }

    if (orders.length === 0) {
      console.log(`❌ No orders found matching "${searchTerm}"`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ Found ${orders.length} order(s):\n`);
    console.log('='.repeat(60));

    for (const order of orders) {
      console.log(`\n📦 Order: ${order.orderId || order._id}`);
      console.log(`   Status: ${order.status || order.orderStatus || 'N/A'}`);
      console.log(`   Payment: ${order.paymentStatus || 'N/A'}`);
      console.log(`   Email: ${order.email || order.userInfo?.email || 'N/A'}`);
      console.log(`   Phone: ${order.phone || 'N/A'}`);
      console.log(`   Total: ₹${order.total || order.totalPrice || 'N/A'}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Confirmed: ${order.confirmedAt || 'Not confirmed'}`);
      
      // Check if it's paid/confirmed
      const isPaid = 
        order.status === 'CONFIRMED' || 
        order.orderStatus === 'CONFIRMED' || 
        order.paymentStatus === 'PAID';
      
      if (isPaid) {
        console.log(`   ✅ PROTECTED: This order is PAID/CONFIRMED - stock will NOT be released`);
      }
      
      console.log(`   Checkout Session: ${order.checkoutSessionId || 'N/A'}`);
      console.log(`   PhonePe Txn: ${order.phonepeTransactionId || 'N/A'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 To verify stock protection for a specific order, run:');
    console.log(`   node backend/scripts/verifyOrderStockProtection.js <ORDER_ID>\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

const searchTerm = process.argv[2];
findOrder(searchTerm).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

