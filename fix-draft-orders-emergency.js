#!/usr/bin/env node

/**
 * EMERGENCY FIX: Resolve stuck draft orders where payments succeeded but orders remain as drafts
 * This script identifies and fixes orders that should be confirmed but are stuck in DRAFT status
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

async function findStuckDraftOrders() {
  console.log('🔍 Searching for stuck draft orders...');
  
  // Find orders that are DRAFT but have successful payment sessions
  const stuckOrders = await orderModel.find({
    status: 'DRAFT',
    paymentStatus: 'PENDING',
    phonepeTransactionId: { $exists: true, $ne: null }
  }).sort({ createdAt: -1 });

  console.log(`📊 Found ${stuckOrders.length} potential stuck draft orders`);

  const ordersToFix = [];

  for (const order of stuckOrders) {
    console.log(`\n🔍 Checking order ${order.orderId} (${order.phonepeTransactionId})`);
    
    // Check if there's a successful payment session
    const paymentSession = await PaymentSession.findOne({
      phonepeTransactionId: order.phonepeTransactionId
    });

    if (paymentSession && paymentSession.status === 'success') {
      console.log(`✅ Found successful payment session for ${order.orderId}`);
      ordersToFix.push({
        order,
        paymentSession,
        reason: 'successful_payment_session'
      });
    } else {
      console.log(`❌ No successful payment session found for ${order.orderId}`);
    }
  }

  return ordersToFix;
}

async function fixStuckOrder(orderData) {
  const { order, paymentSession, reason } = orderData;
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      console.log(`🔧 Fixing order ${order.orderId} - reason: ${reason}`);
      
      // Update order status to CONFIRMED
      await orderModel.findByIdAndUpdate(
        order._id,
        {
          status: 'CONFIRMED',
          orderStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
          paidAt: paymentSession.completedAt || new Date(),
          confirmedAt: new Date(),
          phonepeResponse: paymentSession.phonepeResponse || { verified: true, method: 'emergency_fix' },
          emergencyFix: {
            fixedAt: new Date(),
            reason: reason,
            fixedBy: 'emergency_script'
          }
        },
        { session }
      );

      // Update payment session to mark as processed
      await PaymentSession.findByIdAndUpdate(
        paymentSession._id,
        {
          emergencyFixed: true,
          emergencyFixedAt: new Date()
        },
        { session }
      );

      console.log(`✅ Successfully fixed order ${order.orderId}`);
    });
    
    return { success: true, orderId: order.orderId };
  } catch (error) {
    console.error(`❌ Failed to fix order ${order.orderId}:`, error);
    return { success: false, orderId: order.orderId, error: error.message };
  } finally {
    await session.endSession();
  }
}

async function main() {
  console.log('🚨 EMERGENCY DRAFT ORDER FIX SCRIPT');
  console.log('=====================================');
  
  await connectDB();
  
  try {
    const ordersToFix = await findStuckDraftOrders();
    
    if (ordersToFix.length === 0) {
      console.log('✅ No stuck draft orders found!');
      return;
    }
    
    console.log(`\n🔧 Found ${ordersToFix.length} orders to fix:`);
    ordersToFix.forEach((item, index) => {
      console.log(`${index + 1}. Order ${item.order.orderId} - ${item.reason}`);
    });
    
    // Ask for confirmation
    console.log('\n⚠️  This will update orders from DRAFT to CONFIRMED status.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n🔧 Starting to fix orders...');
    
    const results = [];
    for (const orderData of ordersToFix) {
      const result = await fixStuckOrder(orderData);
      results.push(result);
      
      // Small delay between fixes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 FIX RESULTS:');
    console.log('================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successfully fixed: ${successful.length} orders`);
    successful.forEach(result => {
      console.log(`   - ${result.orderId}`);
    });
    
    if (failed.length > 0) {
      console.log(`❌ Failed to fix: ${failed.length} orders`);
      failed.forEach(result => {
        console.log(`   - ${result.orderId}: ${result.error}`);
      });
    }
    
    console.log('\n🎉 Emergency fix completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the script
main().catch(console.error);
