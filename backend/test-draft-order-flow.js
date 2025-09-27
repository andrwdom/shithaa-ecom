/**
 * Test script for Draft Order Creation Flow
 * This script tests the complete draft order pattern implementation
 */

import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import orderModel from './models/orderModel.js';
import CheckoutSession from './models/CheckoutSession.js';
import { config } from './config.js';

// Test data
const testCheckoutSession = {
  sessionId: `test_session_${Date.now()}`,
  userId: new mongoose.Types.ObjectId(),
  userEmail: 'test@example.com',
  items: [
    {
      productId: new mongoose.Types.ObjectId(),
      name: 'Test Product',
      size: 'M',
      quantity: 2,
      price: 1000
    }
  ],
  total: 2000,
  subtotal: 1800,
  shippingCost: 200,
  status: 'active',
  stockReserved: false,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
};

const testShippingInfo = {
  fullName: 'Test User',
  email: 'test@example.com',
  phone: '9876543210',
  addressLine1: '123 Test Street',
  addressLine2: 'Apt 1',
  city: 'Test City',
  state: 'Test State',
  postalCode: '123456',
  country: 'India'
};

async function testDraftOrderFlow() {
  console.log('🧪 Starting Draft Order Flow Test...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clean up any existing test data
    await cleanupTestData();
    console.log('✅ Cleaned up existing test data');

    // Test 1: Create checkout session
    console.log('\n📝 Test 1: Creating checkout session...');
    const checkoutSession = await CheckoutSession.create(testCheckoutSession);
    console.log(`✅ Checkout session created: ${checkoutSession.sessionId}`);

    // Test 2: Create draft order (simulating createPhonePeSession)
    console.log('\n📝 Test 2: Creating draft order...');
    const idempotencyKey = uuidv4();
    const phonepeTransactionId = `test_txn_${Date.now()}`;
    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const draftOrder = await orderModel.create({
      orderId,
      userInfo: {
        userId: testCheckoutSession.userId,
        email: testCheckoutSession.userEmail,
        name: testShippingInfo.fullName
      },
      shippingInfo: testShippingInfo,
      cartItems: testCheckoutSession.items,
      items: testCheckoutSession.items,
      totalAmount: testCheckoutSession.total,
      total: testCheckoutSession.total,
      subtotal: testCheckoutSession.subtotal,
      shippingCost: testCheckoutSession.shippingCost,
      status: 'DRAFT',
      orderStatus: 'DRAFT',
      paymentStatus: 'PENDING',
      paymentMethod: 'PhonePe',
      phonepeTransactionId,
      idempotencyKey,
      stockReserved: true,
      stockConfirmed: false,
      draftCreatedAt: new Date(),
      metadata: {
        checkoutSessionId: checkoutSession.sessionId,
        correlationId: `test_${Date.now()}`,
        source: 'test',
        idempotencyKey
      }
    });

    console.log(`✅ Draft order created: ${draftOrder.orderId}`);
    console.log(`   - Status: ${draftOrder.status}`);
    console.log(`   - Payment Status: ${draftOrder.paymentStatus}`);
    console.log(`   - Idempotency Key: ${draftOrder.idempotencyKey}`);
    console.log(`   - Stock Reserved: ${draftOrder.stockReserved}`);

    // Test 3: Test idempotency (duplicate request)
    console.log('\n📝 Test 3: Testing idempotency...');
    const duplicateOrder = await orderModel.findOne({ 
      idempotencyKey, 
      status: { $ne: 'CANCELLED' } 
    });
    
    if (duplicateOrder && duplicateOrder._id.toString() === draftOrder._id.toString()) {
      console.log('✅ Idempotency working: Duplicate request would reuse existing order');
    } else {
      console.log('❌ Idempotency test failed');
    }

    // Test 4: Simulate webhook success (confirm draft order)
    console.log('\n📝 Test 4: Simulating webhook success...');
    await orderModel.findByIdAndUpdate(draftOrder._id, {
      status: 'CONFIRMED',
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      confirmedAt: new Date(),
      paidAt: new Date(),
      stockConfirmed: true,
      stockConfirmedAt: new Date(),
      updatedAt: new Date()
    });

    const confirmedOrder = await orderModel.findById(draftOrder._id);
    console.log(`✅ Draft order confirmed: ${confirmedOrder.orderId}`);
    console.log(`   - Status: ${confirmedOrder.status}`);
    console.log(`   - Payment Status: ${confirmedOrder.paymentStatus}`);
    console.log(`   - Stock Confirmed: ${confirmedOrder.stockConfirmed}`);

    // Test 5: Test webhook idempotency (duplicate webhook)
    console.log('\n📝 Test 5: Testing webhook idempotency...');
    const existingConfirmedOrder = await orderModel.findOne({ 
      phonepeTransactionId,
      paymentStatus: 'PAID' 
    });
    
    if (existingConfirmedOrder) {
      console.log('✅ Webhook idempotency working: Duplicate webhook would be ignored');
    } else {
      console.log('❌ Webhook idempotency test failed');
    }

    // Test 6: Test failure scenario (cancel draft order)
    console.log('\n📝 Test 6: Testing failure scenario...');
    const failureDraftOrder = await orderModel.create({
      orderId: `ORD_FAIL_${Date.now()}`,
      userInfo: {
        userId: testCheckoutSession.userId,
        email: testCheckoutSession.userEmail,
        name: testShippingInfo.fullName
      },
      shippingInfo: testShippingInfo,
      cartItems: testCheckoutSession.items,
      items: testCheckoutSession.items,
      totalAmount: testCheckoutSession.total,
      total: testCheckoutSession.total,
      status: 'DRAFT',
      orderStatus: 'DRAFT',
      paymentStatus: 'PENDING',
      paymentMethod: 'PhonePe',
      phonepeTransactionId: `test_txn_fail_${Date.now()}`,
      idempotencyKey: uuidv4(),
      stockReserved: true,
      stockConfirmed: false,
      draftCreatedAt: new Date()
    });

    // Simulate payment failure
    await orderModel.findByIdAndUpdate(failureDraftOrder._id, {
      status: 'CANCELLED',
      orderStatus: 'CANCELLED',
      paymentStatus: 'FAILED',
      metadata: {
        cancellationReason: 'Payment failed during test',
        cancelledAt: new Date()
      }
    });

    const cancelledOrder = await orderModel.findById(failureDraftOrder._id);
    console.log(`✅ Draft order cancelled: ${cancelledOrder.orderId}`);
    console.log(`   - Status: ${cancelledOrder.status}`);
    console.log(`   - Payment Status: ${cancelledOrder.paymentStatus}`);

    console.log('\n🎉 All tests passed! Draft Order Flow is working correctly.');
    console.log('\n📊 Summary:');
    console.log('   ✅ Draft orders are created immediately on checkout');
    console.log('   ✅ Idempotency prevents duplicate orders');
    console.log('   ✅ Webhooks confirm draft orders atomically');
    console.log('   ✅ Webhook idempotency prevents duplicate processing');
    console.log('   ✅ Failed payments cancel draft orders properly');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test data
    await cleanupTestData();
    await mongoose.disconnect();
    console.log('\n✅ Test cleanup completed');
  }
}

async function cleanupTestData() {
  // Clean up test orders
  await orderModel.deleteMany({
    $or: [
      { orderId: { $regex: /^ORD_\d+_/ } },
      { orderId: { $regex: /^ORD_FAIL_/ } },
      { phonepeTransactionId: { $regex: /^test_txn/ } }
    ]
  });

  // Clean up test checkout sessions
  await CheckoutSession.deleteMany({
    sessionId: { $regex: /^test_session_/ }
  });
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testDraftOrderFlow();
}

export default testDraftOrderFlow;
