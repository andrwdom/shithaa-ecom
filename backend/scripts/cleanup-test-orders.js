#!/usr/bin/env node

/**
 * Test Orders Cleanup Script
 * This script removes all test orders and related data from the database
 * 
 * Usage: node scripts/cleanup-test-orders.js
 * 
 * WARNING: This will permanently delete all test orders!
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Import models
import orderModel from '../models/orderModel.js';
import userModel from '../models/userModel.js';
import cartModel from '../models/cartModel.js';
import wishlistModel from '../models/Wishlist.js';

// Test order identifiers
const TEST_ORDER_INDICATORS = [
  // Test payment methods
  'test-paid',
  'test-payment',
  'test-order',
  
  // Test emails
  'test@example.com',
  'test@gmail.com',
  'test@test.com',
  'admin@test.com',
  
  // Test phone numbers
  '1234567890',
  '9876543210',
  '0000000000',
  '1111111111',
  
  // Test names
  'Test User',
  'Test Customer',
  'Admin Test',
  'Demo User',
  
  // Test order IDs (common patterns)
  /^test-/i,
  /^demo-/i,
  /^admin-/i,
  
  // Test amounts
  '0.00',
  '1.00',
  '10.00',
  '100.00'
];

// Test user identifiers
const TEST_USER_INDICATORS = [
  'test@example.com',
  'test@gmail.com',
  'test@test.com',
  'admin@test.com',
  'demo@test.com',
  'testuser',
  'demouser',
  'adminuser'
];

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function identifyTestOrders() {
  console.log('\n🔍 Identifying test orders...');
  
  const allOrders = await orderModel.find({}).lean();
  const testOrders = [];
  
  for (const order of allOrders) {
    let isTestOrder = false;
    let reason = '';
    
    // Check various test indicators
    if (order.isTestOrder === true) {
      isTestOrder = true;
      reason = 'Explicitly marked as test order';
    }
    
    if (order.paymentStatus === 'test-paid') {
      isTestOrder = true;
      reason = 'Test payment status';
    }
    
    if (order.paymentMethod === 'test-payment') {
      isTestOrder = true;
      reason = 'Test payment method';
    }
    
    // Check customer email
    const customerEmail = order.email || order.userInfo?.email || order.shippingInfo?.email;
    if (customerEmail && TEST_USER_INDICATORS.some(indicator => 
      typeof indicator === 'string' ? customerEmail.toLowerCase().includes(indicator.toLowerCase()) : indicator.test(customerEmail)
    )) {
      isTestOrder = true;
      reason = 'Test email detected';
    }
    
    // Check customer name
    const customerName = order.customerName || order.userInfo?.name || order.shippingInfo?.fullName;
    if (customerName && TEST_USER_INDICATORS.some(indicator => 
      typeof indicator === 'string' ? customerName.toLowerCase().includes(indicator.toLowerCase()) : indicator.test(customerName)
    )) {
      isTestOrder = true;
      reason = 'Test name detected';
    }
    
    // Check phone number
    const phone = order.phone || order.userInfo?.phone || order.shippingInfo?.phone;
    if (phone && TEST_ORDER_INDICATORS.some(indicator => 
      typeof indicator === 'string' ? phone.includes(indicator) : indicator.test(phone)
    )) {
      isTestOrder = true;
      reason = 'Test phone detected';
    }
    
    // Check order ID
    if (order.orderId && TEST_ORDER_INDICATORS.some(indicator => 
      typeof indicator === 'string' ? order.orderId.toLowerCase().includes(indicator.toLowerCase()) : indicator.test(order.orderId)
    )) {
      isTestOrder = true;
      reason = 'Test order ID pattern';
    }
    
    // Check total amount (suspicious round numbers)
    const total = order.totalAmount || order.total || order.totalPrice || order.amount;
    if (total && (total === 0 || total === 1 || total === 10 || total === 100)) {
      isTestOrder = true;
      reason = 'Suspicious test amount';
    }
    
    if (isTestOrder) {
      testOrders.push({
        _id: order._id,
        orderId: order.orderId,
        customerName: customerName || 'Unknown',
        email: customerName || 'Unknown',
        total: total || 0,
        reason,
        createdAt: order.createdAt
      });
    }
  }
  
  return testOrders;
}

async function identifyTestUsers() {
  console.log('\n🔍 Identifying test users...');
  
  const allUsers = await userModel.find({}).lean();
  const testUsers = [];
  
  for (const user of allUsers) {
    let isTestUser = false;
    let reason = '';
    
    // Check email
    if (user.email && TEST_USER_INDICATORS.some(indicator => 
      typeof indicator === 'string' ? user.email.toLowerCase().includes(indicator.toLowerCase()) : indicator.test(user.email)
    )) {
      isTestUser = true;
      reason = 'Test email detected';
    }
    
    // Check name
    if (user.name && TEST_USER_INDICATORS.some(indicator => 
      typeof indicator === 'string' ? user.name.toLowerCase().includes(indicator.toLowerCase()) : indicator.test(user.name)
    )) {
      isTestUser = true;
      reason = 'Test name detected';
    }
    
    // Check phone
    if (user.phone && TEST_ORDER_INDICATORS.some(indicator => 
      typeof indicator === 'string' ? user.phone.includes(indicator) : indicator.test(user.phone)
    )) {
      isTestUser = true;
      reason = 'Test phone detected';
    }
    
    if (isTestUser) {
      testUsers.push({
        _id: user._id,
        name: user.name || 'Unknown',
        email: user.email || 'Unknown',
        phone: user.phone || 'Unknown',
        reason
      });
    }
  }
  
  return testUsers;
}

async function cleanupTestData() {
  console.log('\n🧹 Starting test data cleanup...');
  
  try {
    // 1. Delete test orders
    const testOrders = await identifyTestOrders();
    if (testOrders.length > 0) {
      console.log(`\n📦 Found ${testOrders.length} test orders to delete:`);
      testOrders.forEach(order => {
        console.log(`   - ${order.orderId || order._id}: ${order.customerName} (${order.reason})`);
      });
      
      const orderIds = testOrders.map(order => order._id);
      const deleteResult = await orderModel.deleteMany({ _id: { $in: orderIds } });
      console.log(`✅ Deleted ${deleteResult.deletedCount} test orders`);
    } else {
      console.log('✅ No test orders found');
    }
    
    // 2. Delete test users
    const testUsers = await identifyTestUsers();
    if (testUsers.length > 0) {
      console.log(`\n👤 Found ${testUsers.length} test users to delete:`);
      testUsers.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - ${user.reason}`);
      });
      
      const userIds = testUsers.map(user => user._id);
      
      // Delete related data first
      await cartModel.deleteMany({ userId: { $in: userIds } });
      await wishlistModel.deleteMany({ userId: { $in: userIds } });
      
      // Delete users
      const deleteResult = await userModel.deleteMany({ _id: { $in: userIds } });
      console.log(`✅ Deleted ${deleteResult.deletedCount} test users and related data`);
    } else {
      console.log('✅ No test users found');
    }
    
    // 3. Clean up empty carts and wishlists
    const emptyCarts = await cartModel.deleteMany({ items: { $size: 0 } });
    const emptyWishlists = await wishlistModel.deleteMany({ items: { $size: 0 } });
    
    if (emptyCarts.deletedCount > 0 || emptyWishlists.deletedCount > 0) {
      console.log(`\n🗑️ Cleaned up empty data:`);
      console.log(`   - Empty carts: ${emptyCarts.deletedCount}`);
      console.log(`   - Empty wishlists: ${emptyWishlists.deletedCount}`);
    }
    
    console.log('\n🎉 Test data cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

async function showDatabaseStats() {
  console.log('\n📊 Database Statistics After Cleanup:');
  
  const orderCount = await orderModel.countDocuments();
  const userCount = await userModel.countDocuments();
  const cartCount = await cartModel.countDocuments();
  const wishlistCount = await wishlistModel.countDocuments();
  
  console.log(`   - Orders: ${orderCount}`);
  console.log(`   - Users: ${userCount}`);
  console.log(`   - Carts: ${cartCount}`);
  console.log(`   - Wishlists: ${wishlistCount}`);
}

async function main() {
  console.log('🚀 Test Orders Cleanup Script');
  console.log('================================');
  
  // Connect to database
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    // Show initial stats
    console.log('\n📊 Initial Database Statistics:');
    const initialOrderCount = await orderModel.countDocuments();
    const initialUserCount = await userModel.countDocuments();
    console.log(`   - Orders: ${initialOrderCount}`);
    console.log(`   - Users: ${initialUserCount}`);
    
    // Confirm before proceeding
    console.log('\n⚠️  WARNING: This will permanently delete all test orders and users!');
    console.log('   Make sure you have a backup if needed.');
    
    // In production, you might want to add a confirmation prompt here
    // For now, we'll proceed with the cleanup
    
    // Perform cleanup
    await cleanupTestData();
    
    // Show final stats
    await showDatabaseStats();
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log('   Your database is now clean and ready for production.');
    
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as cleanupTestData };
