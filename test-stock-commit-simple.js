/**
 * SIMPLE ATOMIC STOCK COMMIT TEST
 * 
 * Quick test to verify the atomic stock commit functionality
 */

import mongoose from 'mongoose';
import { commitOrder } from './services/orderCommit.js';
import orderModel from './models/orderModel.js';
import productModel from './models/productModel.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function quickTest() {
  console.log('🧪 Quick Atomic Stock Commit Test');
  console.log('=================================');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Find a product to test with
    const product = await productModel.findOne({ 'sizes.stock': { $gt: 0 } });
    if (!product) {
      console.log('❌ No products with stock found');
      return;
    }

    const size = product.sizes.find(s => s.stock > 0);
    console.log(`📦 Testing with product: ${product.name} (${product._id})`);
    console.log(`📏 Size: ${size.size}, Stock: ${size.stock}`);

    // Create a test order
    const orderData = {
      orderId: `QUICK_TEST_${Date.now()}`,
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      cartItems: [{
        productId: product._id,
        size: size.size,
        quantity: 1,
        name: product.name,
        price: 1000
      }],
      userInfo: {
        email: 'test@example.com',
        name: 'Test User'
      },
      shippingInfo: {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '9999999999',
        addressLine1: 'Test Address',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456',
        country: 'India'
      },
      orderSummary: { total: 1000 },
      paymentMethod: 'PhonePe',
      createdAt: new Date()
    };

    console.log('📝 Creating order with data:', JSON.stringify(orderData, null, 2));
    const order = await orderModel.create([orderData]);
    console.log(`📋 Created test order: ${order[0].orderId}`);
    console.log('📝 Order after creation:', JSON.stringify({
      cartItems: order[0].cartItems,
      items: order[0].items
    }, null, 2));

    // CRITICAL: Ensure the order has cartItems and not items
    if (!order[0].cartItems || order[0].cartItems.length === 0) {
      throw new Error('Order was created without cartItems - this is the root cause of the test failure');
    }

    // Get initial stock
    const initialStock = size.stock;
    console.log(`📊 Initial stock: ${initialStock}`);

    // Commit the order
    const paymentInfo = {
      phonepeTransactionId: `TXN_${order[0].orderId}`,
      transactionId: `TXN_${order[0].orderId}`,
      amount: 1000,
      status: 'SUCCESS',
      rawPayload: { test: true }
    };

    console.log('🔄 Committing order...');
    const commitResult = await commitOrder(order[0]._id, paymentInfo, {
      correlationId: `quick_test_${Date.now()}`
    });

    console.log('✅ Commit result:', {
      success: commitResult.success,
      action: commitResult.action,
      stockDeducted: commitResult.stockDeducted,
      totalItems: commitResult.totalItems,
      successfulItems: commitResult.successfulItems
    });

    // Verify stock was deducted
    const updatedProduct = await productModel.findById(product._id);
    const finalStock = updatedProduct.sizes.find(s => s.size === size.size).stock;
    const expectedStock = initialStock - 1;

    console.log(`📊 Final stock: ${finalStock} (expected: ${expectedStock})`);

    if (finalStock === expectedStock) {
      console.log('🎉 SUCCESS: Stock correctly deducted!');
    } else {
      console.log('❌ FAILED: Stock not correctly deducted');
    }

    // Verify order status
    const updatedOrder = await orderModel.findById(order[0]._id);
    console.log(`📋 Order status: ${updatedOrder.status}`);
    console.log(`💳 Payment status: ${updatedOrder.paymentStatus}`);
    console.log(`📦 Stock confirmed: ${updatedOrder.stockConfirmed}`);

    // Test idempotency
    console.log('\n🔄 Testing idempotency...');
    const idempotentResult = await commitOrder(order[0]._id, paymentInfo, {
      correlationId: `quick_test_idempotent_${Date.now()}`
    });

    console.log('✅ Idempotent result:', {
      success: idempotentResult.success,
      action: idempotentResult.action
    });

    if (idempotentResult.action === 'already_committed') {
      console.log('🎉 SUCCESS: Idempotency working correctly!');
    } else {
      console.log('❌ FAILED: Idempotency not working');
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the test
quickTest();
