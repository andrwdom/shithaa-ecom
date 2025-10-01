#!/usr/bin/env node

/**
 * IMMEDIATE FIX: Fix the stuck DRAFT order
 * This script will manually confirm the order that's stuck
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import orderModel from './backend/models/orderModel.js';

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

async function fixStuckOrder() {
  log('🔍 Searching for stuck DRAFT order...', 'blue');
  
  // Find the specific stuck order from the logs
  const stuckOrder = await orderModel.findOne({ 
    phonepeTransactionId: '4e3a26e1-ac9f-4d7f-afea-75e6bfbf8d9d',
    status: 'DRAFT'
  });
  
  if (!stuckOrder) {
    log('✅ No stuck DRAFT order found with that transaction ID!', 'green');
    return;
  }

  log(`📋 Found stuck order: ${stuckOrder.orderId || stuckOrder._id}`, 'yellow');
  log(`   Transaction ID: ${stuckOrder.phonepeTransactionId}`, 'cyan');
  log(`   Customer: ${stuckOrder.userInfo?.email || 'Unknown'}`, 'cyan');
  log(`   Amount: ₹${stuckOrder.total || stuckOrder.totalAmount || 'Unknown'}`, 'cyan');
  log(`   Created: ${stuckOrder.createdAt}`, 'cyan');

  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Update order status to CONFIRMED
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

      // Confirm stock reservations if needed
      if (stuckOrder.cartItems && stuckOrder.cartItems.length > 0) {
        try {
          const { confirmStockReservation } = await import('./backend/utils/stock.js');
          
          for (const item of stuckOrder.cartItems) {
            await confirmStockReservation(
              item.productId,
              item.size,
              item.quantity,
              { session }
            );
          }
          
          log(`📦 Stock confirmed for order`, 'cyan');
        } catch (stockError) {
          log(`⚠️ Stock confirmation failed: ${stockError.message}`, 'yellow');
        }
      }
    });

    log(`✅ Order confirmed successfully!`, 'green');
    log(`🎉 Customer order is now ready for fulfillment!`, 'green');

  } catch (error) {
    log(`❌ Failed to confirm order: ${error.message}`, 'red');
  } finally {
    session.endSession();
  }
}

async function main() {
  log('🛡️ IMMEDIATE DRAFT ORDER FIX', 'magenta');
  log('==============================', 'magenta');
  log('This script will fix the stuck DRAFT order immediately', 'blue');
  log('');

  try {
    await connectDB();
    await fixStuckOrder();
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
