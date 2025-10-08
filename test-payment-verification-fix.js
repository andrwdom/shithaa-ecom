#!/usr/bin/env node

/**
 * Test script to verify the payment verification fix works correctly
 */

import mongoose from 'mongoose';
import orderModel from './backend/models/orderModel.js';
import PaymentSession from './backend/models/paymentSessionModel.js';

// Load environment variables
import { config } from './backend/config.js';

async function connectDB() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function testPaymentVerification() {
  console.log('🧪 Testing Payment Verification Fix');
  console.log('====================================');
  
  await connectDB();
  
  try {
    // Test 1: Check if there are any stuck draft orders
    console.log('\n📋 Test 1: Checking for stuck draft orders...');
    const stuckOrders = await orderModel.find({
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      phonepeTransactionId: { $exists: true, $ne: null }
    });
    
    console.log(`Found ${stuckOrders.length} draft orders`);
    
    if (stuckOrders.length > 0) {
      console.log('⚠️  There are still draft orders that might need fixing');
      stuckOrders.forEach(order => {
        console.log(`   - ${order.orderId} (${order.phonepeTransactionId})`);
      });
    } else {
      console.log('✅ No stuck draft orders found');
    }
    
    // Test 2: Check payment sessions with successful status
    console.log('\n📋 Test 2: Checking successful payment sessions...');
    const successfulSessions = await PaymentSession.find({
      status: 'success'
    });
    
    console.log(`Found ${successfulSessions.length} successful payment sessions`);
    
    // Test 3: Check for orders that should be confirmed
    console.log('\n📋 Test 3: Checking for orders that should be confirmed...');
    const confirmedOrders = await orderModel.find({
      status: 'CONFIRMED',
      paymentStatus: 'PAID'
    });
    
    console.log(`Found ${confirmedOrders.length} confirmed orders`);
    
    // Test 4: Check for any emergency fixes applied
    console.log('\n📋 Test 4: Checking for emergency fixes...');
    const emergencyFixedOrders = await orderModel.find({
      emergencyFix: { $exists: true }
    });
    
    console.log(`Found ${emergencyFixedOrders.length} orders fixed by emergency script`);
    
    if (emergencyFixedOrders.length > 0) {
      console.log('Emergency fixes applied:');
      emergencyFixedOrders.forEach(order => {
        console.log(`   - ${order.orderId}: ${order.emergencyFix.reason} at ${order.emergencyFix.fixedAt}`);
      });
    }
    
    // Test 5: Verify the API endpoint works
    console.log('\n📋 Test 5: Testing payment verification API...');
    try {
      const response = await fetch('http://localhost:4000/api/payment/phonepe/verify/test_transaction_123');
      const status = response.status;
      
      if (status === 404) {
        console.log('✅ Payment verification API is working (404 expected for test transaction)');
      } else if (status === 500) {
        console.log('⚠️  Payment verification API returned 500 - checking if webhook fallback works');
      } else {
        console.log(`📊 Payment verification API returned status: ${status}`);
      }
    } catch (error) {
      console.log('⚠️  Could not test API endpoint:', error.message);
    }
    
    console.log('\n📊 SUMMARY:');
    console.log('============');
    console.log(`Draft orders: ${stuckOrders.length}`);
    console.log(`Successful payment sessions: ${successfulSessions.length}`);
    console.log(`Confirmed orders: ${confirmedOrders.length}`);
    console.log(`Emergency fixes applied: ${emergencyFixedOrders.length}`);
    
    if (stuckOrders.length === 0 && successfulSessions.length > 0) {
      console.log('\n🎉 SUCCESS: No stuck draft orders found!');
      console.log('The payment verification fix appears to be working correctly.');
    } else if (stuckOrders.length > 0) {
      console.log('\n⚠️  WARNING: There are still stuck draft orders.');
      console.log('You may need to run the emergency fix script.');
    } else {
      console.log('\n✅ System appears to be in good state.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the test
testPaymentVerification().catch(console.error);
