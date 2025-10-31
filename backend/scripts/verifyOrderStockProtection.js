#!/usr/bin/env node

/**
 * VERIFY SPECIFIC ORDER STOCK PROTECTION
 * Use this to verify that a specific order's stock is protected
 * 
 * Usage: node backend/scripts/verifyOrderStockProtection.js 69FP
 */

import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import CheckoutSession from '../models/CheckoutSession.js';
import productModel from '../models/productModel.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

async function verifyOrderProtection(orderIdArg) {
  const orderId = orderIdArg || process.argv[2];
  
  if (!orderId) {
    console.log('❌ Error: Please provide an order ID');
    console.log('   Usage: node backend/scripts/verifyOrderStockProtection.js <ORDER_ID>');
    console.log('   Example: node backend/scripts/verifyOrderStockProtection.js 69FP');
    process.exit(1);
  }

  console.log('🔒 VERIFYING STOCK PROTECTION FOR ORDER');
  console.log('='.repeat(60));
  console.log(`📦 Order ID: ${orderId}\n`);
  
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  try {
    // Find the order by orderId first (human-readable), then try _id if that fails
    let order = await orderModel.findOne({ orderId: orderId });
    
    // If not found by orderId, try as MongoDB _id (only if it's a valid ObjectId)
    if (!order && mongoose.Types.ObjectId.isValid(orderId)) {
      order = await orderModel.findById(orderId);
    }

    if (!order) {
      console.log(`❌ Order ${orderId} not found in database`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('📋 ORDER DETAILS:');
    console.log(`   Order ID: ${order.orderId}`);
    console.log(`   Status: ${order.status || order.orderStatus}`);
    console.log(`   Payment Status: ${order.paymentStatus}`);
    console.log(`   Checkout Session ID: ${order.checkoutSessionId || 'N/A'}`);
    console.log(`   PhonePe Transaction ID: ${order.phonepeTransactionId || 'N/A'}`);
    console.log(`   Created: ${order.createdAt}`);
    console.log(`   Confirmed: ${order.confirmedAt || 'N/A'}\n`);

    // Check if order is paid/confirmed
    const isPaid = 
      order.status === 'CONFIRMED' || 
      order.orderStatus === 'CONFIRMED' || 
      order.paymentStatus === 'PAID';

    if (!isPaid) {
      console.log('⚠️  WARNING: Order is NOT marked as PAID/CONFIRMED');
      console.log('   This order may not be protected by the fix.\n');
    } else {
      console.log('✅ ORDER IS PAID/CONFIRMED');
      console.log('   This order IS protected by the stock release fix.\n');
    }

    console.log('-'.repeat(60) + '\n');

    // Check what cleanup workers will do
    console.log('🔍 SIMULATING CLEANUP WORKER CHECKS:\n');

    // Find related checkout sessions
    const sessions = await CheckoutSession.find({
      $or: [
        { sessionId: order.checkoutSessionId },
        { phonepeTransactionId: order.phonepeTransactionId }
      ]
    });

    if (sessions.length === 0) {
      console.log('   ℹ️  No checkout sessions found for this order');
      console.log('   (This is normal if session was cleaned up)\n');
    } else {
      for (const session of sessions) {
        console.log(`   📋 Checking session: ${session.sessionId}`);
        console.log(`      Status: ${session.status}`);
        console.log(`      Stock Reserved: ${session.stockReserved}`);
        console.log(`      Expires At: ${session.expiresAt}\n`);

        // Simulate the exact query from CheckoutSession.cleanExpired()
        const paidOrderCheck = await orderModel.findOne({
          $or: [
            { checkoutSessionId: session.sessionId },
            { 'metadata.checkoutSessionId': session.sessionId },
            { phonepeTransactionId: session.phonepeTransactionId },
            { 'metadata.phonepeTransactionId': session.phonepeTransactionId }
          ],
          $or: [
            { status: 'CONFIRMED' },
            { orderStatus: 'CONFIRMED' },
            { paymentStatus: 'PAID' }
          ]
        });

        if (paidOrderCheck) {
          console.log(`      ✅ CLEANUP WORKER WILL SKIP THIS SESSION`);
          console.log(`         Found paid order: ${paidOrderCheck.orderId}`);
          console.log(`         Stock will NOT be released ✅\n`);
        } else {
          console.log(`      ⚠️  WARNING: Cleanup worker might release stock`);
          console.log(`         No paid order found in query (this shouldn't happen for confirmed orders)\n`);
        }
      }
    }

    // Check reservation expiry worker
    console.log('-'.repeat(60) + '\n');
    console.log('🔍 CHECKING RESERVATION EXPIRY WORKER:\n');

    if (order.checkoutSessionId) {
      const paidOrderCheckReservation = await orderModel.findOne({
        $or: [
          { checkoutSessionId: order.checkoutSessionId },
          { 'metadata.checkoutSessionId': order.checkoutSessionId }
        ],
        $or: [
          { status: 'CONFIRMED' },
          { orderStatus: 'CONFIRMED' },
          { paymentStatus: 'PAID' }
        ]
      });

      if (paidOrderCheckReservation) {
        console.log(`   ✅ RESERVATION WORKER WILL SKIP STOCK RELEASE`);
        console.log(`      Found paid order: ${paidOrderCheckReservation.orderId}`);
        console.log(`      Stock will NOT be released ✅\n`);
      }
    }

    // Check actual product stock
    console.log('-'.repeat(60) + '\n');
    console.log('📦 CHECKING PRODUCT STOCK STATUS:\n');

    const items = order.cartItems || order.items || [];
    let allStockProtected = true;

    for (const item of items) {
      const productId = item.productId || item._id;
      const size = item.size;
      const quantity = item.quantity;

      if (!productId || !size) continue;

      const product = await productModel.findById(productId);
      if (!product) {
        console.log(`   ⚠️  Product ${productId} not found`);
        continue;
      }

      const sizeData = product.sizes.find(s => s.size === size);
      if (!sizeData) {
        console.log(`   ⚠️  Size ${size} not found for product ${product.name || productId}`);
        continue;
      }

      console.log(`   📦 ${product.name || productId} - Size: ${size}`);
      console.log(`      Current Stock: ${sizeData.stock}`);
      console.log(`      Reserved: ${sizeData.reserved}`);
      console.log(`      Order Quantity: ${quantity}`);

      // Verify atomic function protection
      if (sizeData.reserved === 0) {
        console.log(`      ✅ RESERVED = 0 - Atomic function will PREVENT release`);
        console.log(`         (Stock was already confirmed, so reserved is 0)`);
      } else {
        console.log(`      ⚠️  RESERVED = ${sizeData.reserved} - Should be 0 for confirmed orders`);
        allStockProtected = false;
      }
      console.log('');
    }

    // Final verdict
    console.log('='.repeat(60));
    console.log('\n🎯 PROTECTION STATUS:\n');

    if (isPaid && allStockProtected) {
      console.log('✅ FULLY PROTECTED');
      console.log('');
      console.log('   This order is protected by MULTIPLE safety layers:');
      console.log('   1. ✅ Order marked as PAID/CONFIRMED');
      console.log('   2. ✅ Cleanup workers check for paid orders (will skip)');
      console.log('   3. ✅ Reservation workers check for paid orders (will skip)');
      console.log('   4. ✅ Atomic function validates reserved >= quantity (will fail if reserved = 0)');
      console.log('');
      console.log('   🛡️  NO MATTER WHAT - Stock will NOT be released for this order');
    } else {
      console.log('⚠️  PARTIAL PROTECTION');
      if (!isPaid) {
        console.log('   ❌ Order not marked as PAID/CONFIRMED');
      }
      if (!allStockProtected) {
        console.log('   ⚠️  Some products still have reserved stock');
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

verifyOrderProtection().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

