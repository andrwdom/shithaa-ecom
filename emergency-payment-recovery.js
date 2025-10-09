#!/usr/bin/env node

/**
 * EMERGENCY PAYMENT RECOVERY
 * 
 * Run this script if payments are still failing.
 * It will attempt to recover any lost payments.
 */

import mongoose from 'mongoose';
import orderModel from './backend/models/orderModel.js';
import PaymentSession from './backend/models/PaymentSession.js';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');

console.log('🚨 EMERGENCY PAYMENT RECOVERY STARTING...');

// 1. Find all orders with PhonePe transaction IDs
const ordersWithTransactions = await orderModel.find({
  phonepeTransactionId: { $exists: true, $ne: null }
});

console.log(`Found ${ordersWithTransactions.length} orders with PhonePe transactions`);

let recovered = 0;
let failed = 0;

for (const order of ordersWithTransactions) {
  try {
    console.log(`\n🔍 Checking order ${order.orderId} (${order.phonepeTransactionId})`);
    
    // Check if order is already successful
    if (order.paymentStatus === 'PAID' && order.orderStatus === 'CONFIRMED') {
      console.log(`✅ Order ${order.orderId} is already successful`);
      continue;
    }
    
    // Check PhonePe response for success indicators
    if (order.phonepeResponse) {
      const state = order.phonepeResponse.state?.toUpperCase();
      const responseCode = order.phonepeResponse.responseCode;
      
      console.log(`📊 Payment state: ${state}, Response code: ${responseCode}`);
      
      const isSuccess = (
        state === 'PAID' ||
        state === 'COMPLETED' ||
        state === 'SUCCESS' ||
        state === 'SUCCESSFUL' ||
        state === 'CAPTURED' ||
        responseCode === 'SUCCESS' ||
        responseCode === '000' ||
        (responseCode && responseCode.toString().startsWith('00'))
      );
      
      if (isSuccess) {
        console.log(`🔧 Recovering order ${order.orderId} - payment was successful`);
        
        // Update order status
        await orderModel.findByIdAndUpdate(order._id, {
          paymentStatus: 'PAID',
          orderStatus: 'CONFIRMED',
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          paidAt: new Date(),
          updatedAt: new Date()
        });
        
        // Update stock if needed
        if (!order.stockConfirmed && order.cartItems && order.cartItems.length > 0) {
          console.log(`📦 Updating stock for order ${order.orderId}`);
          
          for (const item of order.cartItems) {
            if (item.productId && item.size && item.quantity) {
              try {
                const product = await (await import('./backend/models/productModel.js')).default.findById(item.productId);
                if (product) {
                  const sizeObj = product.sizes.find(s => s.size === item.size);
                  if (sizeObj && sizeObj.stock >= item.quantity) {
                    await (await import('./backend/models/productModel.js')).default.updateOne(
                      { _id: item.productId, 'sizes.size': item.size },
                      { 
                        $inc: { 
                          'sizes.$.stock': -item.quantity,
                          'sizes.$.reserved': -item.quantity
                        }
                      }
                    );
                    console.log(`✅ Stock updated for ${item.name} (${item.size})`);
                  }
                }
              } catch (stockError) {
                console.error(`❌ Stock update failed for ${item.name}:`, stockError.message);
              }
            }
          }
          
          // Mark as stock confirmed
          await orderModel.findByIdAndUpdate(order._id, {
            stockConfirmed: true,
            stockConfirmedAt: new Date()
          });
        }
        
        recovered++;
        console.log(`✅ Order ${order.orderId} recovered successfully`);
        
      } else {
        console.log(`❌ Order ${order.orderId} payment was not successful`);
        failed++;
      }
    } else {
      console.log(`⚠️ Order ${order.orderId} has no PhonePe response data`);
    }
    
  } catch (error) {
    console.error(`❌ Error processing order ${order.orderId}:`, error.message);
    failed++;
  }
}

console.log(`\n📊 RECOVERY SUMMARY:`);
console.log(`✅ Recovered: ${recovered} orders`);
console.log(`❌ Failed: ${failed} orders`);
console.log(`📋 Total processed: ${ordersWithTransactions.length} orders`);

// 2. Clean up orphaned payment sessions
console.log(`\n🧹 Cleaning up orphaned payment sessions...`);

const orphanedSessions = await PaymentSession.find({
  status: 'pending',
  createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
});

console.log(`Found ${orphanedSessions.length} orphaned sessions`);

for (const session of orphanedSessions) {
  await PaymentSession.findByIdAndUpdate(session._id, {
    status: 'expired',
    updatedAt: new Date()
  });
}

console.log(`✅ Cleaned up ${orphanedSessions.length} orphaned sessions`);

console.log(`\n🚨 EMERGENCY RECOVERY COMPLETED!`);
console.log(`\nNext steps:`);
console.log(`1. Check the recovered orders in your admin panel`);
console.log(`2. Verify stock levels are correct`);
console.log(`3. Test a new payment to ensure the system is working`);
console.log(`4. Consider running the bulletproof monitoring script`);

process.exit(0);
