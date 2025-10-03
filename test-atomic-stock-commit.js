/**
 * ATOMIC STOCK COMMIT TEST SCRIPT
 * 
 * Tests the atomic stock commit functionality to ensure:
 * 1. Stock is only deducted when payment is confirmed
 * 2. Race conditions are handled properly
 * 3. Partial failures are rolled back correctly
 * 4. Multi-item orders are processed atomically
 */

import mongoose from 'mongoose';
import { commitOrder, getOrderCommitStatus } from './backend/services/orderCommit.js';
import orderModel from './backend/models/orderModel.js';
import productModel from './backend/models/productModel.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const API_BASE_URL = 'http://localhost:4000/api';
const WEBHOOK_URL = `${API_BASE_URL}/payment/phonepe/webhook`;

// Test configuration
const TEST_CONFIG = {
  productId: '6894d2963e40a06c3ab2b75d', // Use a real product ID from your DB
  size: 'XL',
  initialStock: 10,
  testQuantity: 2,
  concurrentUsers: 5
};

/**
 * Setup test environment
 */
async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...');
  
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ Connected to MongoDB');

  // Reset product stock to known state
  await productModel.updateOne(
    { _id: TEST_CONFIG.productId, 'sizes.size': TEST_CONFIG.size },
    { 
      $set: { 
        'sizes.$.stock': TEST_CONFIG.initialStock,
        'sizes.$.reserved': 0
      }
    }
  );
  console.log(`✅ Reset product stock to ${TEST_CONFIG.initialStock} units`);

  // Clean up any existing test orders
  await orderModel.deleteMany({ 
    orderId: { $regex: /^TEST_/ }
  });
  console.log('✅ Cleaned up existing test orders');
}

/**
 * Create a test order
 */
async function createTestOrder(orderId, items) {
  const orderData = {
    orderId: `TEST_${orderId}`,
    status: 'DRAFT',
    paymentStatus: 'PENDING',
    items: items,
    userInfo: {
      email: `test${orderId}@example.com`,
      name: `Test User ${orderId}`
    },
    shippingInfo: {
      fullName: `Test User ${orderId}`,
      email: `test${orderId}@example.com`,
      phone: '9999999999',
      addressLine1: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      postalCode: '123456',
      country: 'India'
    },
    orderSummary: {
      total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    },
    paymentMethod: 'PhonePe',
    createdAt: new Date()
  };

  const order = await orderModel.create([orderData]);
  return order[0];
}

/**
 * Test 1: Basic atomic stock commit
 */
async function testBasicAtomicCommit() {
  console.log('\n🧪 Test 1: Basic Atomic Stock Commit');
  console.log('=====================================');

  try {
    // Create test order
    const order = await createTestOrder('BASIC_001', [{
      productId: TEST_CONFIG.productId,
      size: TEST_CONFIG.size,
      quantity: TEST_CONFIG.testQuantity,
      name: 'Test Product',
      price: 1000
    }]);

    console.log(`📦 Created test order: ${order.orderId}`);

    // Get initial stock
    const product = await productModel.findById(TEST_CONFIG.productId);
    const initialStock = product.sizes.find(s => s.size === TEST_CONFIG.size).stock;
    console.log(`📊 Initial stock: ${initialStock}`);

    // Commit order with payment info
    const paymentInfo = {
      phonepeTransactionId: `TXN_${order.orderId}`,
      transactionId: `TXN_${order.orderId}`,
      amount: 2000, // 20.00 in paise
      status: 'SUCCESS',
      rawPayload: { test: true }
    };

    const commitResult = await commitOrder(order._id, paymentInfo, {
      correlationId: `test_basic_${Date.now()}`
    });

    console.log('✅ Commit result:', commitResult);

    // Verify stock was deducted
    const updatedProduct = await productModel.findById(TEST_CONFIG.productId);
    const finalStock = updatedProduct.sizes.find(s => s.size === TEST_CONFIG.size).stock;
    const expectedStock = initialStock - TEST_CONFIG.testQuantity;

    console.log(`📊 Final stock: ${finalStock} (expected: ${expectedStock})`);

    if (finalStock === expectedStock) {
      console.log('✅ Test 1 PASSED: Stock correctly deducted');
    } else {
      console.log('❌ Test 1 FAILED: Stock not correctly deducted');
    }

    // Verify order status
    const updatedOrder = await orderModel.findById(order._id);
    console.log(`📋 Order status: ${updatedOrder.status}`);
    console.log(`💳 Payment status: ${updatedOrder.paymentStatus}`);
    console.log(`📦 Stock confirmed: ${updatedOrder.stockConfirmed}`);

    return commitResult.success;

  } catch (error) {
    console.error('❌ Test 1 FAILED with error:', error.message);
    return false;
  }
}

/**
 * Test 2: Race condition handling
 */
async function testRaceConditionHandling() {
  console.log('\n🧪 Test 2: Race Condition Handling');
  console.log('===================================');

  try {
    // Reset stock
    await productModel.updateOne(
      { _id: TEST_CONFIG.productId, 'sizes.size': TEST_CONFIG.size },
      { 
        $set: { 
          'sizes.$.stock': 2, // Only 2 units available
          'sizes.$.reserved': 0
        }
      }
    );

    console.log('📊 Set stock to 2 units for race condition test');

    // Create multiple orders trying to buy the same last items
    const orders = [];
    for (let i = 0; i < 3; i++) {
      const order = await createTestOrder(`RACE_${i}`, [{
        productId: TEST_CONFIG.productId,
        size: TEST_CONFIG.size,
        quantity: 1, // Each trying to buy 1 unit
        name: 'Test Product',
        price: 1000
      }]);
      orders.push(order);
    }

    console.log(`📦 Created ${orders.length} competing orders`);

    // Try to commit all orders simultaneously
    const commitPromises = orders.map((order, index) => {
      const paymentInfo = {
        phonepeTransactionId: `TXN_RACE_${index}`,
        transactionId: `TXN_RACE_${index}`,
        amount: 1000,
        status: 'SUCCESS',
        rawPayload: { test: true, raceTest: true }
      };

      return commitOrder(order._id, paymentInfo, {
        correlationId: `test_race_${index}_${Date.now()}`
      }).catch(error => ({
        success: false,
        error: error.message,
        orderId: order._id
      }));
    });

    const results = await Promise.all(commitPromises);
    console.log('🏁 Race condition results:', results);

    // Check final stock
    const product = await productModel.findById(TEST_CONFIG.productId);
    const finalStock = product.sizes.find(s => s.size === TEST_CONFIG.size).stock;
    console.log(`📊 Final stock after race: ${finalStock}`);

    // Count successful commits
    const successfulCommits = results.filter(r => r.success).length;
    console.log(`✅ Successful commits: ${successfulCommits}`);

    // Verify no overselling occurred
    if (finalStock >= 0) {
      console.log('✅ Test 2 PASSED: No overselling occurred');
    } else {
      console.log('❌ Test 2 FAILED: Overselling detected (negative stock)');
    }

    return finalStock >= 0;

  } catch (error) {
    console.error('❌ Test 2 FAILED with error:', error.message);
    return false;
  }
}

/**
 * Test 3: Partial failure rollback
 */
async function testPartialFailureRollback() {
  console.log('\n🧪 Test 3: Partial Failure Rollback');
  console.log('===================================');

  try {
    // Reset stock
    await productModel.updateOne(
      { _id: TEST_CONFIG.productId, 'sizes.size': TEST_CONFIG.size },
      { 
        $set: { 
          'sizes.$.stock': 5,
          'sizes.$.reserved': 0
        }
      }
    );

    // Create order with multiple items (one will fail due to insufficient stock)
    const order = await createTestOrder('PARTIAL_001', [
      {
        productId: TEST_CONFIG.productId,
        size: TEST_CONFIG.size,
        quantity: 3, // This should succeed
        name: 'Test Product 1',
        price: 1000
      },
      {
        productId: TEST_CONFIG.productId,
        size: TEST_CONFIG.size,
        quantity: 5, // This should fail (only 5 total available)
        name: 'Test Product 2',
        price: 1000
      }
    ]);

    console.log('📦 Created multi-item order for partial failure test');

    const paymentInfo = {
      phonepeTransactionId: `TXN_PARTIAL_001`,
      transactionId: `TXN_PARTIAL_001`,
      amount: 8000,
      status: 'SUCCESS',
      rawPayload: { test: true, partialTest: true }
    };

    try {
      const commitResult = await commitOrder(order._id, paymentInfo, {
        correlationId: `test_partial_${Date.now()}`
      });
      console.log('❌ Test 3 FAILED: Order should have failed but succeeded');
      return false;
    } catch (error) {
      console.log('✅ Order correctly failed:', error.message);

      // Check that stock was rolled back
      const product = await productModel.findById(TEST_CONFIG.productId);
      const finalStock = product.sizes.find(s => s.size === TEST_CONFIG.size).stock;
      console.log(`📊 Final stock after rollback: ${finalStock}`);

      if (finalStock === 5) {
        console.log('✅ Test 3 PASSED: Stock correctly rolled back');
        return true;
      } else {
        console.log('❌ Test 3 FAILED: Stock not properly rolled back');
        return false;
      }
    }

  } catch (error) {
    console.error('❌ Test 3 FAILED with error:', error.message);
    return false;
  }
}

/**
 * Test 4: Idempotency
 */
async function testIdempotency() {
  console.log('\n🧪 Test 4: Idempotency');
  console.log('======================');

  try {
    // Create test order
    const order = await createTestOrder('IDEMPOTENT_001', [{
      productId: TEST_CONFIG.productId,
      size: TEST_CONFIG.size,
      quantity: 1,
      name: 'Test Product',
      price: 1000
    }]);

    const paymentInfo = {
      phonepeTransactionId: `TXN_IDEMPOTENT_001`,
      transactionId: `TXN_IDEMPOTENT_001`,
      amount: 1000,
      status: 'SUCCESS',
      rawPayload: { test: true, idempotencyTest: true }
    };

    // First commit
    const result1 = await commitOrder(order._id, paymentInfo, {
      correlationId: `test_idempotent_1_${Date.now()}`
    });
    console.log('✅ First commit result:', result1.action);

    // Second commit (should be idempotent)
    const result2 = await commitOrder(order._id, paymentInfo, {
      correlationId: `test_idempotent_2_${Date.now()}`
    });
    console.log('✅ Second commit result:', result2.action);

    if (result2.action === 'already_committed') {
      console.log('✅ Test 4 PASSED: Idempotency working correctly');
      return true;
    } else {
      console.log('❌ Test 4 FAILED: Idempotency not working');
      return false;
    }

  } catch (error) {
    console.error('❌ Test 4 FAILED with error:', error.message);
    return false;
  }
}

/**
 * Test 5: Concurrent webhook simulation
 */
async function testConcurrentWebhookSimulation() {
  console.log('\n🧪 Test 5: Concurrent Webhook Simulation');
  console.log('==========================================');

  try {
    // Reset stock
    await productModel.updateOne(
      { _id: TEST_CONFIG.productId, 'sizes.size': TEST_CONFIG.size },
      { 
        $set: { 
          'sizes.$.stock': 3,
          'sizes.$.reserved': 0
        }
      }
    );

    // Create orders
    const orders = [];
    for (let i = 0; i < 5; i++) {
      const order = await createTestOrder(`CONCURRENT_${i}`, [{
        productId: TEST_CONFIG.productId,
        size: TEST_CONFIG.size,
        quantity: 1,
        name: 'Test Product',
        price: 1000
      }]);
      orders.push(order);
    }

    console.log(`📦 Created ${orders.length} orders for concurrent test`);

    // Simulate concurrent webhook processing
    const webhookPromises = orders.map((order, index) => {
      return new Promise(async (resolve) => {
        // Simulate webhook delay
        await new Promise(r => setTimeout(r, Math.random() * 100));
        
        const paymentInfo = {
          phonepeTransactionId: `TXN_CONCURRENT_${index}`,
          transactionId: `TXN_CONCURRENT_${index}`,
          amount: 1000,
          status: 'SUCCESS',
          rawPayload: { test: true, concurrentTest: true }
        };

        try {
          const result = await commitOrder(order._id, paymentInfo, {
            correlationId: `test_concurrent_${index}_${Date.now()}`
          });
          resolve({ success: true, result, orderId: order._id });
        } catch (error) {
          resolve({ success: false, error: error.message, orderId: order._id });
        }
      });
    });

    const results = await Promise.all(webhookPromises);
    console.log('🏁 Concurrent webhook results:', results);

    // Check final stock
    const product = await productModel.findById(TEST_CONFIG.productId);
    const finalStock = product.sizes.find(s => s.size === TEST_CONFIG.size).stock;
    console.log(`📊 Final stock after concurrent processing: ${finalStock}`);

    const successfulCommits = results.filter(r => r.success).length;
    console.log(`✅ Successful commits: ${successfulCommits}`);

    if (finalStock >= 0 && successfulCommits <= 3) {
      console.log('✅ Test 5 PASSED: Concurrent processing handled correctly');
      return true;
    } else {
      console.log('❌ Test 5 FAILED: Concurrent processing issues detected');
      return false;
    }

  } catch (error) {
    console.error('❌ Test 5 FAILED with error:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Atomic Stock Commit Tests');
  console.log('=====================================');

  try {
    await setupTestEnvironment();

    const results = {
      test1: await testBasicAtomicCommit(),
      test2: await testRaceConditionHandling(),
      test3: await testPartialFailureRollback(),
      test4: await testIdempotency(),
      test5: await testConcurrentWebhookSimulation()
    };

    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    console.log(`Test 1 (Basic Atomic Commit): ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (Race Condition): ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (Partial Failure Rollback): ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 4 (Idempotency): ${results.test4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 5 (Concurrent Webhooks): ${results.test5 ? '✅ PASS' : '❌ FAIL'}`);

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Atomic stock commit is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.');
    }

  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests, testBasicAtomicCommit, testRaceConditionHandling, testPartialFailureRollback, testIdempotency, testConcurrentWebhookSimulation };
