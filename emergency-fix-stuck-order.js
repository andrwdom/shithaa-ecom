#!/usr/bin/env node

/**
 * EMERGENCY FIX FOR STUCK ORDER
 * 
 * This fixes the specific order that's stuck after successful payment
 */

import mongoose from 'mongoose';
import orderModel from './backend/models/orderModel.js';
import productModel from './backend/models/productModel.js';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');

console.log('🚨 EMERGENCY FIX FOR STUCK ORDER...');

// Find the stuck order
const stuckOrder = await orderModel.findOne({
  phonepeTransactionId: '2e735989-2aff-4769-914d-2dacbb82896c'
});

if (!stuckOrder) {
  console.log('❌ Order not found');
  process.exit(1);
}

console.log(`📋 Found stuck order: ${stuckOrder.orderId}`);
console.log(`   Status: ${stuckOrder.status}`);
console.log(`   Payment Status: ${stuckOrder.paymentStatus}`);
console.log(`   PhonePe Transaction: ${stuckOrder.phonepeTransactionId}`);

// Check if payment was successful
if (stuckOrder.phonepeResponse && stuckOrder.phonepeResponse.state === 'COMPLETED') {
  console.log('✅ Payment was successful, fixing order...');
  
  // Update order status immediately
  await orderModel.findByIdAndUpdate(stuckOrder._id, {
    status: 'CONFIRMED',
    orderStatus: 'CONFIRMED',
    paymentStatus: 'PAID',
    confirmedAt: new Date(),
    paidAt: new Date(),
    stockConfirmed: true,
    stockConfirmedAt: new Date(),
    updatedAt: new Date()
  });
  
  console.log('✅ Order status updated to CONFIRMED');
  
  // Update stock for each item
  if (stuckOrder.cartItems && stuckOrder.cartItems.length > 0) {
    for (const item of stuckOrder.cartItems) {
      if (item.productId && item.size && item.quantity) {
        try {
          const product = await productModel.findById(item.productId);
          if (product) {
            const sizeObj = product.sizes.find(s => s.size === item.size);
            if (sizeObj && sizeObj.stock >= item.quantity) {
              await productModel.updateOne(
                { _id: item.productId, 'sizes.size': item.size },
                { 
                  $inc: { 
                    'sizes.$.stock': -item.quantity,
                    'sizes.$.reserved': -item.quantity
                  }
                }
              );
              console.log(`✅ Stock updated for ${item.name} (${item.size})`);
            } else {
              console.log(`❌ Insufficient stock for ${item.name} (${item.size})`);
            }
          }
        } catch (stockError) {
          console.error(`❌ Stock update failed for ${item.name}:`, stockError.message);
        }
      }
    }
  }
  
  console.log('✅ Order fixed successfully!');
  console.log('🎉 The customer should now see their order as confirmed');
  
} else {
  console.log('❌ Payment was not successful');
}

process.exit(0);
