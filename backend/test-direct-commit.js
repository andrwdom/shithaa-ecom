/**
 * DIRECT ATOMIC STOCK COMMIT TEST
 * 
 * This test directly tests the commitOrder function without any order model complexity
 */

import mongoose from 'mongoose';
import { commitOrder } from './services/orderCommit.js';
import productModel from './models/productModel.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function directTest() {
  console.log('🚀 Direct Atomic Stock Commit Test');
  console.log('==================================');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db');
    console.log('✅ Connected to MongoDB');

    // 1. Find a product with stock
    const product = await productModel.findOne({ 'sizes.stock': { $gt: 0 } });
    if (!product) {
      throw new Error('No products with stock found');
    }

    const size = product.sizes.find(s => s.stock > 0);
    console.log(`📦 Testing with product: ${product.name} (${product._id})`);
    console.log(`📏 Size: ${size.size}, Stock: ${size.stock}`);

    // 2. Create a mock order object directly (bypass order model)
    const mockOrder = {
      _id: new mongoose.Types.ObjectId(),
      orderId: `DIRECT_TEST_${Date.now()}`,
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      cartItems: [{
        productId: product._id,
        size: size.size,
        quantity: 1,
        name: product.name,
        price: 1000
      }],
      total: 1000,
      userInfo: {
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    console.log('📋 Created mock order with correct productId:', mockOrder.cartItems[0].productId);

    // 3. Test the commitOrder function directly
    console.log('🔄 Testing commitOrder function...');
    
    const paymentInfo = {
      phonepeTransactionId: `TXN_${mockOrder.orderId}`,
      transactionId: `TXN_${mockOrder.orderId}`,
      amount: 1000,
      status: 'SUCCESS',
      rawPayload: { test: true }
    };

    // Mock the order lookup by directly passing the order
    const result = await commitOrder(mockOrder._id, paymentInfo, {
      correlationId: `direct_test_${Date.now()}`,
      mockOrder: mockOrder // Pass the mock order directly
    });

    console.log('✅ SUCCESS! Atomic stock commit worked!');
    console.log('📊 Result:', result);

    // 4. Verify stock was actually deducted
    const updatedProduct = await productModel.findById(product._id);
    const updatedSize = updatedProduct.sizes.find(s => s.size === size.size);
    console.log(`📉 Stock after commit: ${updatedSize.stock} (was ${size.stock})`);

    if (updatedSize.stock === size.stock - 1) {
      console.log('🎉 STOCK DEDUCTION SUCCESSFUL!');
    } else {
      console.log('❌ Stock deduction failed');
    }

    // 5. Restore stock for clean test
    await productModel.updateOne(
      { _id: product._id, 'sizes.size': size.size },
      { $inc: { 'sizes.$.stock': 1 } }
    );
    console.log('🔄 Stock restored for clean test');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the test
directTest();
