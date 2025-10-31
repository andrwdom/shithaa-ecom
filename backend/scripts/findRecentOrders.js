#!/usr/bin/env node

/**
 * FIND RECENT ORDERS - Show recent orders to help identify the one we're looking for
 */

import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

async function findRecentOrders() {
  await mongoose.connect(mongoUri);
  console.log('🔍 Searching for recent orders...\n');

  try {
    // Find orders from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentOrders = await orderModel.find({
      createdAt: { $gte: sevenDaysAgo }
    })
    .sort({ createdAt: -1 })
    .limit(20);

    if (recentOrders.length === 0) {
      console.log('⚠️  No orders found in last 7 days');
      
      // Try without date filter
      const allRecent = await orderModel.find({})
        .sort({ createdAt: -1 })
        .limit(10);
      
      if (allRecent.length > 0) {
        console.log(`\n📋 Showing ${allRecent.length} most recent orders:\n`);
        console.log('='.repeat(80));
        
        for (const order of allRecent) {
          const isPaid = 
            order.status === 'CONFIRMED' || 
            order.orderStatus === 'CONFIRMED' || 
            order.paymentStatus === 'PAID';
          
          console.log(`\n📦 Order ID: ${order.orderId || order._id}`);
          console.log(`   Status: ${order.status || order.orderStatus || 'N/A'}`);
          console.log(`   Payment: ${order.paymentStatus || 'N/A'}`);
          console.log(`   Email: ${order.email || order.userInfo?.email || 'N/A'}`);
          console.log(`   Phone: ${order.phone || 'N/A'}`);
          console.log(`   Total: ₹${order.total || order.totalPrice || 'N/A'}`);
          console.log(`   Created: ${order.createdAt}`);
          console.log(`   ${isPaid ? '✅ PROTECTED' : '⚠️  NOT PROTECTED'}`);
        }
      } else {
        console.log('❌ No orders found in database');
      }
      
      await mongoose.disconnect();
      return;
    }

    console.log(`✅ Found ${recentOrders.length} orders from last 7 days:\n`);
    console.log('='.repeat(80));

    let confirmedCount = 0;
    let protectedCount = 0;

    for (const order of recentOrders) {
      const isPaid = 
        order.status === 'CONFIRMED' || 
        order.orderStatus === 'CONFIRMED' || 
        order.paymentStatus === 'PAID';
      
      if (isPaid) protectedCount++;
      if (order.status === 'CONFIRMED' || order.orderStatus === 'CONFIRMED') confirmedCount++;

      console.log(`\n📦 Order: ${order.orderId || order._id}`);
      console.log(`   Status: ${order.status || order.orderStatus || 'N/A'}`);
      console.log(`   Payment: ${order.paymentStatus || 'N/A'}`);
      console.log(`   Email: ${order.email || order.userInfo?.email || 'N/A'}`);
      console.log(`   Phone: ${order.phone || order.shippingInfo?.phone || 'N/A'}`);
      console.log(`   Total: ₹${order.total || order.totalPrice || 'N/A'}`);
      console.log(`   Created: ${order.createdAt}`);
      
      // Show items
      const items = order.cartItems || order.items || [];
      if (items.length > 0) {
        console.log(`   Items:`);
        items.slice(0, 3).forEach(item => {
          console.log(`      - ${item.name || 'Product'} (${item.size || 'N/A'}) x${item.quantity || 1}`);
        });
        if (items.length > 3) {
          console.log(`      ... and ${items.length - 3} more`);
        }
      }
      
      if (isPaid) {
        console.log(`   ✅ PROTECTED: Stock will NOT be released`);
      } else {
        console.log(`   ⚠️  NOT PROTECTED: Order is not confirmed/paid`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total orders: ${recentOrders.length}`);
    console.log(`   Confirmed orders: ${confirmedCount}`);
    console.log(`   Protected orders (PAID/CONFIRMED): ${protectedCount}`);
    
    if (protectedCount > 0) {
      console.log(`\n✅ ${protectedCount} order(s) are protected by the stock release fix!`);
    }

    console.log('\n💡 To verify a specific order:');
    console.log('   node backend/scripts/verifyOrderStockProtection.js <ORDER_ID>\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

findRecentOrders().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

