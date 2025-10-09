#!/usr/bin/env node

/**
 * CRITICAL STOCK CONFIRMATION FIX
 * 
 * This script fixes the stock confirmation issue that's causing
 * successful payments to show as failed.
 */

import mongoose from 'mongoose';
import orderModel from './backend/models/orderModel.js';
import productModel from './backend/models/productModel.js';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');

console.log('🔧 FIXING STOCK CONFIRMATION ISSUE...');

// 1. Check the problematic product
const productId = '68e51144b14b1811337566a9';
const size = 'S';

console.log(`\n🔍 Checking product ${productId} size ${size}...`);

const product = await productModel.findById(productId);
if (!product) {
  console.log('❌ Product not found!');
  process.exit(1);
}

console.log(`✅ Product found: ${product.name}`);
console.log(`📊 Sizes:`, product.sizes.map(s => `${s.size}: stock=${s.stock}, reserved=${s.reserved}`));

const sizeObj = product.sizes.find(s => s.size === size);
if (!sizeObj) {
  console.log(`❌ Size ${size} not found for product ${product.name}`);
  console.log(`Available sizes:`, product.sizes.map(s => s.size));
  process.exit(1);
}

console.log(`📦 Size ${size} details:`, {
  stock: sizeObj.stock,
  reserved: sizeObj.reserved,
  available: sizeObj.stock - sizeObj.reserved
});

// 2. Fix stock issues
if (sizeObj.reserved > sizeObj.stock) {
  console.log(`🔧 Fixing reserved > stock issue...`);
  await productModel.updateOne(
    { _id: productId, 'sizes.size': size },
    { $set: { 'sizes.$.reserved': 0 } }
  );
  console.log(`✅ Fixed reserved count`);
}

// 3. Check for stuck orders with this product
console.log(`\n🔍 Checking for stuck orders...`);

const stuckOrders = await orderModel.find({
  status: 'DRAFT',
  'cartItems.productId': productId,
  'cartItems.size': size
});

console.log(`Found ${stuckOrders.length} stuck orders with this product`);

for (const order of stuckOrders) {
  console.log(`\n📋 Order ${order.orderId}:`);
  console.log(`  Status: ${order.status}`);
  console.log(`  Payment Status: ${order.paymentStatus}`);
  console.log(`  PhonePe Transaction: ${order.phonepeTransactionId}`);
  
  // Check if payment was successful
  if (order.phonepeResponse && order.phonepeResponse.state === 'COMPLETED') {
    console.log(`✅ Payment was successful, fixing order...`);
    
    // Update order status
    await orderModel.findByIdAndUpdate(order._id, {
      status: 'CONFIRMED',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      confirmedAt: new Date(),
      paidAt: new Date(),
      updatedAt: new Date()
    });
    
    // Update stock
    if (sizeObj.stock >= 1) {
      await productModel.updateOne(
        { _id: productId, 'sizes.size': size },
        { 
          $inc: { 
            'sizes.$.stock': -1,
            'sizes.$.reserved': -1
          }
        }
      );
      console.log(`✅ Stock updated for order ${order.orderId}`);
    } else {
      console.log(`❌ Insufficient stock for order ${order.orderId}`);
    }
  }
}

// 4. Check current stock status
const updatedProduct = await productModel.findById(productId);
const updatedSizeObj = updatedProduct.sizes.find(s => s.size === size);

console.log(`\n📊 Updated stock status:`);
console.log(`  Stock: ${updatedSizeObj.stock}`);
console.log(`  Reserved: ${updatedSizeObj.reserved}`);
console.log(`  Available: ${updatedSizeObj.stock - updatedSizeObj.reserved}`);

// 5. Test stock confirmation
console.log(`\n🧪 Testing stock confirmation...`);

try {
  const { confirmStockReservation } = await import('./backend/utils/stock.js');
  const result = await confirmStockReservation(productId, size, 1);
  console.log(`Stock confirmation test: ${result ? 'SUCCESS' : 'FAILED'}`);
} catch (error) {
  console.log(`Stock confirmation test failed: ${error.message}`);
}

console.log(`\n✅ STOCK CONFIRMATION FIX COMPLETED!`);

process.exit(0);
