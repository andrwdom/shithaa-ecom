#!/usr/bin/env node

/**
 * EMERGENCY SCRIPT: Fix Stuck DRAFT Orders
 * This script finds and fixes all orders stuck in DRAFT status
 * Run this immediately to fix existing customer orders
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
// PhonePe verification will be done via API calls

// Load environment variables
dotenv.config();

// Import models
import orderModel from './backend/models/orderModel.js';
import paymentSessionModel from './backend/models/paymentSessionModel.js';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅ Connected to MongoDB', 'green');
  } catch (error) {
    log(`❌ MongoDB connection failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function verifyPaymentWithPhonePe(transactionId) {
  try {
    // Use PhonePe API directly instead of SDK
    const phonepeApiUrl = process.env.PHONEPE_ENVIRONMENT === 'PRODUCTION' 
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/hermes';

    const payload = {
      merchantId: process.env.PHONEPE_MERCHANT_ID,
      transactionId: transactionId
    };

    // Create checksum
    const crypto = await import('crypto');
    const checksum = crypto.createHmac('sha256', process.env.PHONEPE_SALT_KEY)
      .update(JSON.stringify(payload))
      .digest('hex');

    const response = await fetch(`${phonepeApiUrl}/v3/transaction/${transactionId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': `${checksum}###${process.env.PHONEPE_SALT_INDEX}`,
        'Accept': 'application/json'
      }
    });

    const paymentStatus = await response.json();
    
    return {
      success: paymentStatus.code === 'PAYMENT_SUCCESS' || 
              paymentStatus.code === 'SUCCESS' || 
              paymentStatus.success === true,
      data: paymentStatus
    };
  } catch (error) {
    log(`⚠️ PhonePe verification failed for ${transactionId}: ${error.message}`, 'yellow');
    return { success: false, error: error.message };
  }
}

async function confirmDraftOrder(order, paymentStatus) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Update order status
      await orderModel.findByIdAndUpdate(
        order._id,
        {
          status: 'CONFIRMED',
          orderStatus: 'CONFIRMED',
          paymentStatus: 'PAID',
          confirmedAt: new Date(),
          paidAt: new Date(),
          phonepeResponse: paymentStatus.data,
          stockConfirmed: true,
          stockConfirmedAt: new Date(),
          updatedAt: new Date(),
          fixedByScript: true,
          fixedAt: new Date()
        },
        { session }
      );

      // Confirm stock reservations if needed
      if (order.cartItems && order.cartItems.length > 0) {
        try {
          const { confirmStockReservation } = await import('./backend/utils/stock.js');
          
          for (const item of order.cartItems) {
            await confirmStockReservation(
              item.productId,
              item.size,
              item.quantity,
              { session }
            );
          }
          
          log(`📦 Stock confirmed for order ${order.orderId}`, 'cyan');
        } catch (stockError) {
          log(`⚠️ Stock confirmation failed for order ${order.orderId}: ${stockError.message}`, 'yellow');
        }
      }
    });

    return true;
  } catch (error) {
    log(`❌ Failed to confirm order ${order.orderId}: ${error.message}`, 'red');
    return false;
  } finally {
    session.endSession();
  }
}

async function fixStuckDraftOrders() {
  log('🔍 Searching for stuck DRAFT orders...', 'blue');
  
  // Find all DRAFT orders
  const draftOrders = await orderModel.find({ status: 'DRAFT' });
  
  if (draftOrders.length === 0) {
    log('✅ No stuck DRAFT orders found!', 'green');
    return;
  }

  log(`📋 Found ${draftOrders.length} DRAFT orders`, 'yellow');
  
  let fixedCount = 0;
  let failedCount = 0;
  let noPaymentCount = 0;

  for (const order of draftOrders) {
    try {
      log(`\n🔧 Processing order: ${order.orderId || order._id}`, 'blue');
      log(`   Transaction ID: ${order.phonepeTransactionId}`, 'cyan');
      log(`   Customer: ${order.userInfo?.email || 'Unknown'}`, 'cyan');
      log(`   Amount: ₹${order.total || order.totalAmount || 'Unknown'}`, 'cyan');
      log(`   Created: ${order.createdAt}`, 'cyan');

      if (!order.phonepeTransactionId) {
        log(`   ⚠️ No PhonePe transaction ID found`, 'yellow');
        noPaymentCount++;
        continue;
      }

      // Verify payment with PhonePe
      log(`   🔍 Verifying payment with PhonePe...`, 'blue');
      const paymentStatus = await verifyPaymentWithPhonePe(order.phonepeTransactionId);

      if (paymentStatus.success) {
        log(`   ✅ Payment confirmed!`, 'green');
        
        // Confirm the order
        const confirmed = await confirmDraftOrder(order, paymentStatus);
        
        if (confirmed) {
          log(`   ✅ Order confirmed successfully!`, 'green');
          fixedCount++;
        } else {
          log(`   ❌ Failed to confirm order`, 'red');
          failedCount++;
        }
      } else {
        log(`   ❌ Payment not confirmed or failed`, 'red');
        log(`   📝 Status: ${paymentStatus.data?.message || 'Unknown'}`, 'yellow');
        noPaymentCount++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      log(`   ❌ Error processing order ${order.orderId}: ${error.message}`, 'red');
      failedCount++;
    }
  }

  // Summary
  log('\n📊 SUMMARY:', 'magenta');
  log(`✅ Fixed orders: ${fixedCount}`, 'green');
  log(`❌ Failed orders: ${failedCount}`, 'red');
  log(`⚠️ No payment found: ${noPaymentCount}`, 'yellow');
  log(`📋 Total processed: ${draftOrders.length}`, 'blue');

  if (fixedCount > 0) {
    log('\n🎉 SUCCESS! Fixed stuck orders are now confirmed and ready for fulfillment!', 'green');
  }

  if (failedCount > 0) {
    log('\n⚠️ Some orders could not be fixed automatically. Please check them manually.', 'yellow');
  }
}

async function main() {
  log('🛡️ EMERGENCY DRAFT ORDER FIX SCRIPT', 'magenta');
  log('=====================================', 'magenta');
  log('This script will find and fix all orders stuck in DRAFT status', 'blue');
  log('');

  try {
    await connectDB();
    await fixStuckDraftOrders();
  } catch (error) {
    log(`💥 Script failed: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('\n✅ Script completed. Database disconnected.', 'green');
  }
}

// Run the script
main().catch(error => {
  log(`💥 Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});
