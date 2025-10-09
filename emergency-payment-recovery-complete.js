#!/usr/bin/env node

/**
 * EMERGENCY PAYMENT RECOVERY - COMPLETE SYSTEM
 * 
 * This script performs comprehensive recovery of all payment issues.
 * Run this if you're experiencing payment problems.
 */

import mongoose from 'mongoose';
import orderModel from './backend/models/orderModel.js';
import productModel from './backend/models/productModel.js';
import PaymentSession from './backend/models/PaymentSession.js';
import CheckoutSession from './backend/models/CheckoutSession.js';
import bulletproofPaymentProcessor from './backend/services/bulletproofPaymentProcessor.js';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');

console.log('🚨 EMERGENCY PAYMENT RECOVERY STARTING...');
console.log('This will attempt to recover all payment issues.');

// 1. Find all orders with PhonePe transaction IDs
console.log('\n1. Scanning for orders with PhonePe transactions...');
const ordersWithTransactions = await orderModel.find({
  phonepeTransactionId: { $exists: true, $ne: null }
});

console.log(`Found ${ordersWithTransactions.length} orders with PhonePe transactions`);

let recovered = 0;
let failed = 0;
let alreadyConfirmed = 0;

// 2. Process each order
for (const order of ordersWithTransactions) {
  try {
    console.log(`\n🔍 Processing order ${order.orderId} (${order.phonepeTransactionId})`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Payment Status: ${order.paymentStatus}`);
    
    // Check if already confirmed
    if (order.paymentStatus === 'PAID' && order.status === 'CONFIRMED') {
      console.log('   ✅ Already confirmed - skipping');
      alreadyConfirmed++;
      continue;
    }
    
    // Check PhonePe response
    if (order.phonepeResponse) {
      const response = order.phonepeResponse;
      console.log(`   PhonePe State: ${response.state}`);
      console.log(`   PhonePe Response Code: ${response.responseCode}`);
      
      // Determine if payment was successful
      const isSuccess = (
        response.state === 'PAID' ||
        response.state === 'COMPLETED' ||
        response.state === 'SUCCESS' ||
        response.state === 'SUCCESSFUL' ||
        response.state === 'CAPTURED' ||
        response.responseCode === 'SUCCESS' ||
        response.responseCode === '000' ||
        response.responseCode === 'PAYMENT_SUCCESS' ||
        (response.responseCode && response.responseCode.toString().startsWith('00'))
      );
      
      if (isSuccess) {
        console.log('   ✅ Payment was successful - attempting recovery...');
        
        // Use bulletproof processor to recover
        const result = await bulletproofPaymentProcessor.processPayment(
          order.phonepeTransactionId,
          response,
          'emergency_recovery',
          `emergency_${Date.now()}`
        );
        
        if (result.success) {
          console.log('   ✅ Successfully recovered!');
          recovered++;
        } else {
          console.log(`   ❌ Recovery failed: ${result.message}`);
          failed++;
        }
      } else {
        console.log('   ⚠️ Payment was not successful - skipping');
      }
    } else {
      console.log('   ⚠️ No PhonePe response data - skipping');
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing order ${order.orderId}:`, error.message);
    failed++;
  }
}

// 3. Check for orphaned payment sessions
console.log('\n2. Checking for orphaned payment sessions...');
const orphanedSessions = await PaymentSession.find({
  status: 'success',
  orderId: { $exists: false }
});

console.log(`Found ${orphanedSessions.length} orphaned payment sessions`);

let sessionRecovered = 0;
let sessionFailed = 0;

for (const session of orphanedSessions) {
  try {
    console.log(`\n🔍 Processing session ${session._id} (${session.phonepeTransactionId})`);
    
    const result = await bulletproofPaymentProcessor.processPayment(
      session.phonepeTransactionId,
      session.phonepeResponse || { state: 'COMPLETED' },
      'session_recovery',
      `session_${Date.now()}`
    );
    
    if (result.success) {
      console.log('   ✅ Session recovered successfully!');
      sessionRecovered++;
    } else {
      console.log(`   ❌ Session recovery failed: ${result.message}`);
      sessionFailed++;
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing session ${session._id}:`, error.message);
    sessionFailed++;
  }
}

// 4. Check for stuck checkout sessions
console.log('\n3. Checking for stuck checkout sessions...');
const stuckCheckoutSessions = await CheckoutSession.find({
  status: 'awaiting_payment',
  createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // Older than 10 minutes
});

console.log(`Found ${stuckCheckoutSessions.length} stuck checkout sessions`);

let checkoutRecovered = 0;
let checkoutFailed = 0;

for (const session of stuckCheckoutSessions) {
  try {
    console.log(`\n🔍 Processing checkout session ${session._id}`);
    
    // Mark as expired
    await CheckoutSession.findByIdAndUpdate(session._id, {
      status: 'expired',
      expiredAt: new Date()
    });
    
    console.log('   ✅ Checkout session marked as expired');
    checkoutRecovered++;
    
  } catch (error) {
    console.error(`   ❌ Error processing checkout session ${session._id}:`, error.message);
    checkoutFailed++;
  }
}

// 5. Summary
console.log('\n📊 RECOVERY SUMMARY:');
console.log(`Orders processed: ${ordersWithTransactions.length}`);
console.log(`  - Already confirmed: ${alreadyConfirmed}`);
console.log(`  - Successfully recovered: ${recovered}`);
console.log(`  - Failed to recover: ${failed}`);
console.log(`\nPayment sessions processed: ${orphanedSessions.length}`);
console.log(`  - Successfully recovered: ${sessionRecovered}`);
console.log(`  - Failed to recover: ${sessionFailed}`);
console.log(`\nCheckout sessions processed: ${stuckCheckoutSessions.length}`);
console.log(`  - Successfully recovered: ${checkoutRecovered}`);
console.log(`  - Failed to recover: ${checkoutFailed}`);

// 6. Final recommendations
console.log('\n🎯 RECOMMENDATIONS:');
if (recovered > 0 || sessionRecovered > 0) {
  console.log('✅ Some payments were successfully recovered!');
  console.log('   - Check your orders to verify they are now confirmed');
  console.log('   - Verify stock has been updated correctly');
  console.log('   - Test a new payment to ensure the system is working');
} else {
  console.log('⚠️ No payments were recovered.');
  console.log('   - This might indicate a deeper system issue');
  console.log('   - Check your logs for any error messages');
  console.log('   - Verify your PhonePe integration is working correctly');
}

console.log('\n🔧 NEXT STEPS:');
console.log('1. Deploy the bulletproof payment system');
console.log('2. Set up 24/7 monitoring');
console.log('3. Test the payment flow end-to-end');
console.log('4. Monitor logs for any remaining issues');

console.log('\n✅ Emergency recovery completed!');

// Close MongoDB connection
await mongoose.connection.close();
