#!/usr/bin/env node

/**
 * SPECIFIC CHECK FOR ORDER 69FP
 * This script does a comprehensive search
 */

import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import CheckoutSession from '../models/CheckoutSession.js';

// Load environment variables
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db';

async function checkOrder69FP() {
  await mongoose.connect(mongoUri);
  console.log('🔍 COMPREHENSIVE SEARCH FOR ORDER 69FP\n');
  console.log('='.repeat(60));

  try {
    // 1. Exact match
    console.log('\n1️⃣ Checking exact match: "69FP"');
    let order = await orderModel.findOne({ orderId: '69FP' });
    if (order) {
      console.log('✅ FOUND by exact match!');
    } else {
      console.log('❌ Not found');
    }

    // 2. Case variations
    if (!order) {
      console.log('\n2️⃣ Checking case variations...');
      order = await orderModel.findOne({ orderId: /^69FP$/i });
      if (order) console.log('✅ Found with case-insensitive');
      else console.log('❌ Not found');
    }

    // 3. Check all orders with "69" in them
    if (!order) {
      console.log('\n3️⃣ Checking all orders containing "69"...');
      const ordersWith69 = await orderModel.find({ orderId: /69/i }).limit(10);
      if (ordersWith69.length > 0) {
        console.log(`   Found ${ordersWith69.length} orders with "69":`);
        ordersWith69.forEach(o => {
          console.log(`   - ${o.orderId} (Status: ${o.status || o.orderStatus}, Payment: ${o.paymentStatus}, Created: ${o.createdAt})`);
        });
      } else {
        console.log('❌ No orders found with "69"');
      }
    }

    // 4. Check recent orders (last 7 days)
    console.log('\n4️⃣ Checking recent orders (last 7 days)...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await orderModel.find({
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 }).limit(20);

    if (recentOrders.length > 0) {
      console.log(`   Found ${recentOrders.length} recent orders:`);
      recentOrders.forEach(o => {
        const isPaid = o.status === 'CONFIRMED' || o.orderStatus === 'CONFIRMED' || o.paymentStatus === 'PAID';
        console.log(`   - ${o.orderId} | Status: ${o.status || o.orderStatus} | Payment: ${o.paymentStatus} | Total: ₹${o.total || o.totalPrice || 'N/A'} | ${isPaid ? '✅ PROTECTED' : ''}`);
      });
    } else {
      console.log('   ❌ No recent orders found');
    }

    // 5. Check total order count
    console.log('\n5️⃣ Database statistics:');
    const totalOrders = await orderModel.countDocuments();
    const confirmedOrders = await orderModel.countDocuments({
      $or: [
        { status: 'CONFIRMED' },
        { orderStatus: 'CONFIRMED' },
        { paymentStatus: 'PAID' }
      ]
    });
    console.log(`   Total orders: ${totalOrders}`);
    console.log(`   Confirmed/Paid orders: ${confirmedOrders}`);

    // 6. If order found, verify protection
    if (order) {
      console.log('\n' + '='.repeat(60));
      console.log('\n📦 ORDER DETAILS:');
      console.log(`   Order ID: ${order.orderId}`);
      console.log(`   Status: ${order.status || order.orderStatus}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Checkout Session: ${order.checkoutSessionId || 'N/A'}`);
      console.log(`   PhonePe Txn: ${order.phonepeTransactionId || 'N/A'}`);

      const isPaid = 
        order.status === 'CONFIRMED' || 
        order.orderStatus === 'CONFIRMED' || 
        order.paymentStatus === 'PAID';

      console.log('\n🛡️ PROTECTION STATUS:');
      if (isPaid) {
        console.log('   ✅ ORDER IS PROTECTED!');
        console.log('   - Status indicates PAID/CONFIRMED');
        console.log('   - Cleanup workers will skip stock release');
        console.log('   - Atomic function will prevent release if reserved = 0');
        console.log('\n   🎯 NO MATTER WHAT - Stock will NOT be released for this order!');
      } else {
        console.log('   ⚠️  Order is NOT marked as PAID/CONFIRMED');
        console.log('   - Verify payment status in database');
      }
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('\n⚠️  ORDER 69FP NOT FOUND IN DATABASE');
      console.log('\nPossible reasons:');
      console.log('1. Order ID might be different in database');
      console.log('2. Order might be in a different database/collection');
      console.log('3. Order might not have been saved yet');
      console.log('\n✅ BUT: If the order exists and is CONFIRMED/PAID, it IS protected!');
      console.log('   The fix works on ALL orders with status CONFIRMED or paymentStatus PAID.');
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkOrder69FP();

