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

async function checkOrders() {
  console.log('🔍 CHECKING ALL ORDERS...\n');
  
  // Get all orders
  const orders = await orderModel.find({}).sort({ createdAt: -1 });
  
  console.log(`📊 TOTAL ORDERS: ${orders.length}\n`);
  
  orders.forEach((order, index) => {
    console.log(`${index + 1}. Order ID: ${order.orderId || order._id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Order Status: ${order.orderStatus}`);
    console.log(`   Payment Status: ${order.paymentStatus}`);
    console.log(`   PhonePe Transaction: ${order.phonepeTransactionId}`);
    console.log(`   Customer: ${order.userInfo?.email || 'Unknown'}`);
    console.log(`   Amount: ₹${order.total || order.totalAmount || 'Unknown'}`);
    console.log(`   Created: ${order.createdAt}`);
    console.log(`   Stock Confirmed: ${order.stockConfirmed}`);
    console.log('   ---');
  });
  
  // Count by status
  const statusCounts = {};
  orders.forEach(order => {
    const status = order.status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  console.log('\n📈 STATUS BREAKDOWN:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  
  // Find stuck orders
  const stuckOrders = orders.filter(order => order.status === 'DRAFT');
  console.log(`\n🚨 STUCK DRAFT ORDERS: ${stuckOrders.length}`);
  
  if (stuckOrders.length > 0) {
    console.log('\n🔧 STUCK ORDERS DETAILS:');
    stuckOrders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.orderId || order._id}`);
      console.log(`   PhonePe Transaction: ${order.phonepeTransactionId}`);
      console.log(`   Customer: ${order.userInfo?.email || 'Unknown'}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Age: ${Math.round((Date.now() - new Date(order.createdAt)) / (1000 * 60))} minutes`);
    });
  }
}

async function main() {
  try {
    await connectDB();
    await checkOrders();
  } catch (error) {
    console.error(`💥 Script failed: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected.');
  }
}

main();
