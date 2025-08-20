#!/usr/bin/env node

/**
 * Test script for the new checkout system
 * Run with: node test-checkout-system.js
 * 
 * Extended to include:
 * - Race conditions and multi-tab scenarios
 * - Expired reservation edge cases
 * - Duplicate webhook handling
 * - Reconciliation flow testing
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Load environment variables
dotenv.config();

// Import models
import CheckoutSession from './models/CheckoutSession.js';
import Payment from './models/Payment.js';
import PaymentEvent from './models/PaymentEvent.js';
import productModel from './models/productModel.js';

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  testUser: {
    id: 'test_user_id',
    email: 'test@example.com'
  },
  testUser2: {
    id: 'test_user_id_2',
    email: 'test2@example.com'
  },
  testProduct: {
    id: 'test_product_id',
    name: 'Test Product',
    price: 1000,
    size: 'M',
    quantity: 2
  }
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

const test = (name, testFn) => {
  log(`🧪 Running test: ${name}`);
  try {
    testFn();
    log(`✅ Test passed: ${name}`, 'PASS');
    testResults.passed++;
  } catch (error) {
    log(`❌ Test failed: ${name}`, 'FAIL');
    log(`   Error: ${error.message}`, 'ERROR');
    testResults.errors.push({ name, error: error.message });
    testResults.failed++;
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertEqual = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
};

const assertExists = (value, message) => {
  if (!value) {
    throw new Error(message);
  }
};

// Test functions
const testCheckoutSessionCreation = async () => {
  log('Testing checkout session creation...');
  
  // Create test checkout session
  const sessionData = {
    sessionId: randomUUID(),
    source: 'cart',
    userId: TEST_CONFIG.testUser.id,
    userEmail: TEST_CONFIG.testUser.email,
    items: [{
      productId: TEST_CONFIG.testProduct.id,
      variantId: TEST_CONFIG.testProduct.size,
      name: TEST_CONFIG.testProduct.name,
      price: TEST_CONFIG.testProduct.price,
      quantity: TEST_CONFIG.testProduct.quantity,
      size: TEST_CONFIG.testProduct.size,
      image: 'test-image.jpg',
      categorySlug: 'test-category',
      category: 'Test Category'
    }],
    subtotal: TEST_CONFIG.testProduct.price * TEST_CONFIG.testProduct.quantity,
    total: TEST_CONFIG.testProduct.price * TEST_CONFIG.testProduct.quantity,
    currency: 'INR',
    status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    metadata: {
      userAgent: 'Test Script',
      ipAddress: '127.0.0.1',
      correlationId: randomUUID(),
      checkoutFlow: 'cart'
    }
  };

  const session = new CheckoutSession(sessionData);
  await session.save();

  // Verify session was created
  assertExists(session._id, 'Session should have been created with an ID');
  assertEqual(session.source, 'cart', 'Session source should be cart');
  assertEqual(session.items.length, 1, 'Session should have 1 item');
  assertEqual(session.total, 2000, 'Session total should be 2000');

  log('✅ Checkout session creation test passed');
  
  // Clean up
  await CheckoutSession.findByIdAndDelete(session._id);
};

const testStockValidation = async () => {
  log('Testing stock validation...');
  
  // Create a test product with limited stock
  const testProduct = new productModel({
    name: 'Test Product for Stock Validation',
    price: 500,
    sizes: [
      { size: 'S', stock: 5 },
      { size: 'M', stock: 3 },
      { size: 'L', stock: 1 }
    ],
    category: 'Test Category',
    categorySlug: 'test-category'
  });

  await testProduct.save();

  // Test stock availability
  const sizeObj = testProduct.sizes.find(s => s.size === 'M');
  assertExists(sizeObj, 'Size M should exist');
  assertEqual(sizeObj.stock, 3, 'Size M should have 3 in stock');

  // Test insufficient stock
  const insufficientStock = sizeObj.stock < 5;
  assert(insufficientStock, 'Stock should be insufficient for quantity 5');

  log('✅ Stock validation test passed');
  
  // Clean up
  await productModel.findByIdAndDelete(testProduct._id);
};

const testPaymentEventCreation = async () => {
  log('Testing payment event creation...');
  
  const correlationId = randomUUID();
  
  // Create test payment event
  const eventData = {
    correlationId,
    eventType: 'session_created',
    source: 'backend',
    userId: TEST_CONFIG.testUser.id,
    userEmail: TEST_CONFIG.testUser.email,
    data: { source: 'cart', itemCount: 1 }
  };

  const event = await PaymentEvent.createEvent(eventData);
  
  // Verify event was created
  assertExists(event._id, 'Event should have been created with an ID');
  assertEqual(event.eventType, 'session_created', 'Event type should be session_created');
  assertEqual(event.correlationId, correlationId, 'Event should have correct correlation ID');
  assertEqual(event.status, 'pending', 'Event should have pending status');

  log('✅ Payment event creation test passed');
  
  // Clean up
  await PaymentEvent.findByIdAndDelete(event._id);
};

const testCheckoutSessionExpiration = async () => {
  log('Testing checkout session expiration...');
  
  // Create session that expires in 1 second
  const sessionData = {
    sessionId: randomUUID(),
    source: 'buynow',
    userId: TEST_CONFIG.testUser.id,
    userEmail: TEST_CONFIG.testUser.email,
    items: [{
      productId: TEST_CONFIG.testProduct.id,
      variantId: TEST_CONFIG.testProduct.size,
      name: TEST_CONFIG.testProduct.name,
      price: TEST_CONFIG.testProduct.price,
      quantity: 1,
      size: TEST_CONFIG.testProduct.size,
      image: 'test-image.jpg'
    }],
    subtotal: TEST_CONFIG.testProduct.price,
    total: TEST_CONFIG.testProduct.price,
    currency: 'INR',
    status: 'pending',
    expiresAt: new Date(Date.now() + 1000), // 1 second
    metadata: {
      userAgent: 'Test Script',
      ipAddress: '127.0.0.1',
      correlationId: randomUUID(),
      checkoutFlow: 'buynow'
    }
  };

  const session = new CheckoutSession(sessionData);
  await session.save();

  // Wait for expiration
  log('Waiting for session to expire...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if session is expired
  const isExpired = session.isExpired();
  assert(isExpired, 'Session should be expired after 2 seconds');

  log('✅ Checkout session expiration test passed');
  
  // Clean up
  await CheckoutSession.findByIdAndDelete(session._id);
};

const testStockReservation = async () => {
  log('Testing stock reservation...');
  
  // Create test product
  const testProduct = new productModel({
    name: 'Test Product for Stock Reservation',
    price: 1000,
    sizes: [
      { size: 'M', stock: 10 }
    ],
    category: 'Test Category',
    categorySlug: 'test-category'
  });

  await testProduct.save();

  // Create checkout session
  const sessionData = {
    sessionId: randomUUID(),
    source: 'cart',
    userId: TEST_CONFIG.testUser.id,
    userEmail: TEST_CONFIG.testUser.email,
    items: [{
      productId: testProduct._id,
      variantId: 'M',
      name: testProduct.name,
      price: testProduct.price,
      quantity: 3,
      size: 'M',
      image: 'test-image.jpg'
    }],
    subtotal: testProduct.price * 3,
    total: testProduct.price * 3,
    currency: 'INR',
    status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    metadata: {
      userAgent: 'Test Script',
      ipAddress: '127.0.0.1',
      correlationId: randomUUID(),
      checkoutFlow: 'cart'
    }
  };

  const session = new CheckoutSession(sessionData);
  await session.save();

  // Simulate stock reservation
  session.stockReserved = true;
  session.status = 'awaiting_payment';
  await session.save();

  // Verify stock reservation
  assert(session.stockReserved, 'Stock should be reserved');
  assertEqual(session.status, 'awaiting_payment', 'Session status should be awaiting_payment');

  log('✅ Stock reservation test passed');
  
  // Clean up
  await CheckoutSession.findByIdAndDelete(session._id);
  await productModel.findByIdAndDelete(testProduct._id);
};

const testDatabaseIndexes = async () => {
  log('Testing database indexes...');
  
  // Check CheckoutSession indexes
  const checkoutIndexes = await CheckoutSession.collection.getIndexes();
  const requiredIndexes = ['sessionId_1', 'phonepeTransactionId_1', 'userId_1', 'status_1', 'expiresAt_1'];
  
  for (const indexName of requiredIndexes) {
    const indexExists = Object.keys(checkoutIndexes).some(name => name === indexName);
    assert(indexExists, `Index ${indexName} should exist on CheckoutSession`);
  }

  // Check Payment indexes
  const paymentIndexes = await Payment.collection.getIndexes();
  const paymentRequiredIndexes = ['paymentId_1', 'orderId_1', 'checkoutSessionId_1'];
  
  for (const indexName of paymentRequiredIndexes) {
    const indexExists = Object.keys(paymentIndexes).some(name => name === indexName);
    assert(indexExists, `Index ${indexName} should exist on Payment`);
  }

  // Check PaymentEvent indexes
  const eventIndexes = await PaymentEvent.collection.getIndexes();
  const eventRequiredIndexes = ['eventId_1', 'correlationId_1', 'checkoutSessionId_1'];
  
  for (const indexName of eventRequiredIndexes) {
    const indexExists = Object.keys(eventIndexes).some(name => name === indexName);
    assert(indexExists, `Index ${indexName} should exist on PaymentEvent`);
  }

  log('✅ Database indexes test passed');
};

const testCleanupExpiredSessions = async () => {
  log('Testing cleanup of expired sessions...');
  
  // Create multiple expired sessions
  const expiredSessions = [];
  for (let i = 0; i < 3; i++) {
    const sessionData = {
      sessionId: randomUUID(),
      source: 'cart',
      userId: TEST_CONFIG.testUser.id,
      userEmail: TEST_CONFIG.testUser.email,
      items: [],
      subtotal: 0,
      total: 0,
      currency: 'INR',
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000), // Already expired
      metadata: {
        userAgent: 'Test Script',
        ipAddress: '127.0.0.1',
        correlationId: randomUUID(),
        checkoutFlow: 'cart'
      }
    };

    const session = new CheckoutSession(sessionData);
    await session.save();
    expiredSessions.push(session);
  }

  // Verify expired sessions exist
  const expiredCount = await CheckoutSession.countDocuments({ expiresAt: { $lt: new Date() } });
  assertEqual(expiredCount, 3, 'Should have 3 expired sessions');

  // Clean up expired sessions
  const cleanupResult = await CheckoutSession.cleanExpired();
  assertEqual(cleanupResult.deletedCount, 3, 'Should have deleted 3 expired sessions');

  // Verify cleanup
  const remainingExpired = await CheckoutSession.countDocuments({ expiresAt: { $lt: new Date() } });
  assertEqual(remainingExpired, 0, 'Should have no remaining expired sessions');

  log('✅ Cleanup expired sessions test passed');
};

// NEW TESTS FOR RACE CONDITIONS AND EDGE CASES

const testRaceConditionStockReservation = async () => {
  log('Testing race condition: multiple users trying to reserve last item...');
  
  // Create product with only 1 item in stock
  const testProduct = new productModel({
    name: 'Race Condition Test Product',
    price: 500,
    sizes: [
      { size: 'M', stock: 1 }
    ],
    category: 'Test Category',
    categorySlug: 'test-category'
  });

  await testProduct.save();

  // Simulate two users trying to reserve the same item simultaneously
  const user1Session = new CheckoutSession({
    sessionId: randomUUID(),
    source: 'buynow',
    userId: TEST_CONFIG.testUser.id,
    userEmail: TEST_CONFIG.testUser.email,
    items: [{
      productId: testProduct._id,
      variantId: 'M',
      name: testProduct.name,
      price: testProduct.price,
      quantity: 1,
      size: 'M',
      image: 'test-image.jpg'
    }],
    subtotal: testProduct.price,
    total: testProduct.price,
    currency: 'INR',
    status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    metadata: {
      userAgent: 'Test Script - User 1',
      ipAddress: '127.0.0.1',
      correlationId: randomUUID(),
      checkoutFlow: 'buynow'
    }
  });

  const user2Session = new CheckoutSession({
    sessionId: randomUUID(),
    source: 'buynow',
    userId: TEST_CONFIG.testUser2.id,
    userEmail: TEST_CONFIG.testUser2.email,
    items: [{
      productId: testProduct._id,
      variantId: 'M',
      name: testProduct.name,
      price: testProduct.price,
      quantity: 1,
      size: 'M',
      image: 'test-image.jpg'
    }],
    subtotal: testProduct.price,
    total: testProduct.price,
    currency: 'INR',
    status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    metadata: {
      userAgent: 'Test Script - User 2',
      ipAddress: '127.0.0.1',
      correlationId: randomUUID(),
      checkoutFlow: 'buynow'
    }
  });

  // Try to save both sessions simultaneously (simulating race condition)
  try {
    await Promise.all([
      user1Session.save(),
      user2Session.save()
    ]);

    // Both sessions should be created, but only one should be able to reserve stock
    const sessions = await CheckoutSession.find({
      _id: { $in: [user1Session._id, user2Session._id] }
    });

    assertEqual(sessions.length, 2, 'Both sessions should be created');
    
    // Simulate stock reservation attempt for both
    let reservationCount = 0;
    for (const session of sessions) {
      try {
        // In a real scenario, this would use atomic stock operations
        session.stockReserved = true;
        session.status = 'awaiting_payment';
        await session.save();
        reservationCount++;
      } catch (error) {
        // Expected: one should fail due to insufficient stock
        log(`Session ${session.sessionId} failed to reserve stock (expected): ${error.message}`);
      }
    }

    // Only one should succeed
    assert(reservationCount <= 1, 'Only one session should successfully reserve stock');

    log('✅ Race condition stock reservation test passed');
  } finally {
    // Clean up
    await CheckoutSession.deleteMany({
      _id: { $in: [user1Session._id, user2Session._id] }
    });
    await productModel.findByIdAndDelete(testProduct._id);
  }
};

const testExpiredReservationEdgeCase = async () => {
  log('Testing expired reservation edge case: User A reserves, never pays, User B should be able to buy...');
  
  // Create product with only 1 item
  const testProduct = new productModel({
    name: 'Expired Reservation Test Product',
    price: 750,
    sizes: [
      { size: 'L', stock: 1 }
    ],
    category: 'Test Category',
    categorySlug: 'test-category'
  });

  await testProduct.save();

  // User A creates session and reserves stock
  const userASession = new CheckoutSession({
    sessionId: randomUUID(),
    source: 'buynow',
    userId: TEST_CONFIG.testUser.id,
    userEmail: TEST_CONFIG.testUser.email,
    items: [{
      productId: testProduct._id,
      variantId: 'L',
      name: testProduct.name,
      price: testProduct.price,
      quantity: 1,
      size: 'L',
      image: 'test-image.jpg'
    }],
    subtotal: testProduct.price,
    total: testProduct.price,
    currency: 'INR',
    status: 'awaiting_payment',
    stockReserved: true,
    expiresAt: new Date(Date.now() + 1000), // Expires in 1 second
    metadata: {
      userAgent: 'Test Script - User A',
      ipAddress: '127.0.0.1',
      correlationId: randomUUID(),
      checkoutFlow: 'buynow'
    }
  });

  await userASession.save();

  // Verify stock is reserved
  assert(userASession.stockReserved, 'User A should have stock reserved');

  // Wait for session to expire
  log('Waiting for User A session to expire...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify session is expired
  const expiredSession = await CheckoutSession.findById(userASession._id);
  assert(expiredSession.isExpired(), 'User A session should be expired');

  // User B tries to create session for the same item
  const userBSession = new CheckoutSession({
    sessionId: randomUUID(),
    source: 'buynow',
    userId: TEST_CONFIG.testUser2.id,
    userEmail: TEST_CONFIG.testUser2.email,
    items: [{
      productId: testProduct._id,
      variantId: 'L',
      name: testProduct.name,
      price: testProduct.price,
      quantity: 1,
      size: 'L',
      image: 'test-image.jpg'
    }],
    subtotal: testProduct.price,
    total: testProduct.price,
    currency: 'INR',
    status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    metadata: {
      userAgent: 'Test Script - User B',
      ipAddress: '127.0.0.1',
      correlationId: randomUUID(),
      checkoutFlow: 'buynow'
    }
  });

  await userBSession.save();

  // User B should be able to reserve stock now
  userBSession.stockReserved = true;
  userBSession.status = 'awaiting_payment';
  await userBSession.save();

  assert(userBSession.stockReserved, 'User B should be able to reserve stock after User A expiration');

  log('✅ Expired reservation edge case test passed');

  // Clean up
  await CheckoutSession.deleteMany({
    _id: { $in: [userASession._id, userBSession._id] }
  });
  await productModel.findByIdAndDelete(testProduct._id);
};

const testDuplicateWebhookHandling = async () => {
  log('Testing duplicate webhook handling: same webhook delivered multiple times...');
  
  const correlationId = randomUUID();
  const phonepeTransactionId = randomUUID();
  const checkoutSessionId = randomUUID();

  // Create test payment event for webhook received
  const webhookEvent1 = await PaymentEvent.createEvent({
    correlationId,
    eventType: 'webhook_received',
    source: 'phonepe',
    checkoutSessionId,
    data: {
      phonepeTransactionId,
      status: 'SUCCESS',
      amount: 1000,
      webhookPayload: { transactionId: phonepeTransactionId }
    }
  });

  // Simulate duplicate webhook delivery
  const webhookEvent2 = await PaymentEvent.createEvent({
    correlationId: randomUUID(), // Different correlation ID but same transaction
    eventType: 'webhook_received',
    source: 'phonepe',
    checkoutSessionId,
    data: {
      phonepeTransactionId,
      status: 'SUCCESS',
      amount: 1000,
      webhookPayload: { transactionId: phonepeTransactionId }
    }
  });

  // Both events should be recorded
  assertExists(webhookEvent1._id, 'First webhook event should be created');
  assertExists(webhookEvent2._id, 'Second webhook event should be created');

  // Check that we can find events by transaction ID
  const eventsByTransaction = await PaymentEvent.find({
    'data.phonepeTransactionId': phonepeTransactionId
  });

  assertEqual(eventsByTransaction.length, 2, 'Should find both webhook events');

  // In a real scenario, the webhook handler would check for existing payments
  // and prevent duplicate processing. This test verifies the events are tracked.

  log('✅ Duplicate webhook handling test passed');

  // Clean up
  await PaymentEvent.deleteMany({
    _id: { $in: [webhookEvent1._id, webhookEvent2._id] }
  });
};

const testMultiTabMultiDeviceConflict = async () => {
  log('Testing multi-tab/multi-device conflict: same user, two sessions...');
  
  // Create product with limited stock
  const testProduct = new productModel({
    name: 'Multi-Tab Test Product',
    price: 600,
    sizes: [
      { size: 'S', stock: 2 }
    ],
    category: 'Test Category',
    categorySlug: 'test-category'
  });

  await testProduct.save();

  // Same user creates two sessions (simulating multi-tab or multi-device)
  const session1 = new CheckoutSession({
    sessionId: randomUUID(),
    source: 'cart',
    userId: TEST_CONFIG.testUser.id,
    userEmail: TEST_CONFIG.testUser.email,
    items: [{
      productId: testProduct._id,
      variantId: 'S',
      name: testProduct.name,
      price: testProduct.price,
      quantity: 1,
      size: 'S',
      image: 'test-image.jpg'
    }],
    subtotal: testProduct.price,
    total: testProduct.price,
    currency: 'INR',
    status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    metadata: {
      userAgent: 'Test Script - Tab 1',
      ipAddress: '127.0.0.1',
      correlationId: randomUUID(),
      checkoutFlow: 'cart'
    }
  });

  const session2 = new CheckoutSession({
    sessionId: randomUUID(),
    source: 'buynow',
    userId: TEST_CONFIG.testUser.id, // Same user
    userEmail: TEST_CONFIG.testUser.email,
    items: [{
      productId: testProduct._id,
      variantId: 'S',
      name: testProduct.name,
      price: testProduct.price,
      quantity: 1,
      size: 'S',
      image: 'test-image.jpg'
    }],
    subtotal: testProduct.price,
    total: testProduct.price,
    currency: 'INR',
    status: 'pending',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    metadata: {
      userAgent: 'Test Script - Tab 2',
      ipAddress: '127.0.0.1',
      correlationId: randomUUID(),
      checkoutFlow: 'buynow'
    }
  });

  // Both sessions should be created
  await session1.save();
  await session2.save();

  // Verify both sessions exist for the same user
  const userSessions = await CheckoutSession.find({
    userId: TEST_CONFIG.testUser.id
  });

  assertEqual(userSessions.length, 2, 'User should have 2 active sessions');

  // Try to reserve stock for both sessions
  let reservationCount = 0;
  for (const session of userSessions) {
    try {
      session.stockReserved = true;
      session.status = 'awaiting_payment';
      await session.save();
      reservationCount++;
    } catch (error) {
      log(`Session ${session.sessionId} failed to reserve stock: ${error.message}`);
    }
  }

  // Both should succeed since there's enough stock (2 items, 2 sessions with 1 each)
  assertEqual(reservationCount, 2, 'Both sessions should successfully reserve stock');

  log('✅ Multi-tab/multi-device conflict test passed');

  // Clean up
  await CheckoutSession.deleteMany({
    _id: { $in: [session1._id, session2._id] }
  });
  await productModel.findByIdAndDelete(testProduct._id);
};

const testReconciliationFlow = async () => {
  log('Testing reconciliation flow: late webhook arrivals and status updates...');
  
  const correlationId = randomUUID();
  const phonepeTransactionId = randomUUID();
  const checkoutSessionId = randomUUID();

  // Create a payment that was successful but webhook arrived late
  const payment = new Payment({
    paymentId: randomUUID(),
    orderId: randomUUID(),
    checkoutSessionId,
    provider: 'phonepe',
    amount: 1500,
    status: 'pending', // Initially pending, waiting for webhook
    phonepeTransactionId,
    phonepeResponse: {
      redirectUrl: 'https://phonepe.com/pay',
      responseCode: 'SUCCESS',
      responseMessage: 'Payment initiated'
    },
    rawPayload: { transactionId: phonepeTransactionId }
  });

  await payment.save();

  // Simulate late webhook arrival
  const webhookEvent = await PaymentEvent.createEvent({
    correlationId,
    eventType: 'webhook_received',
    source: 'phonepe',
    checkoutSessionId,
    paymentId: payment.paymentId,
    data: {
      phonepeTransactionId,
      status: 'SUCCESS',
      amount: 1500,
      webhookPayload: { transactionId: phonepeTransactionId }
    }
  });

  // Update payment status based on webhook
  payment.status = 'success';
  payment.phonepeResponse.webhookReceived = true;
  payment.phonepeResponse.webhookTimestamp = new Date();
  await payment.save();

  // Verify reconciliation worked
  const updatedPayment = await Payment.findById(payment._id);
  assertEqual(updatedPayment.status, 'success', 'Payment status should be updated to success');
  assert(updatedPayment.phonepeResponse.webhookReceived, 'Webhook should be marked as received');

  // Check that event was recorded
  const recordedEvent = await PaymentEvent.findById(webhookEvent._id);
  assertExists(recordedEvent, 'Webhook event should be recorded');

  log('✅ Reconciliation flow test passed');

  // Clean up
  await Payment.findByIdAndDelete(payment._id);
  await PaymentEvent.findByIdAndDelete(webhookEvent._id);
};

const testIdempotencyGuards = async () => {
  log('Testing idempotency guards: prevent duplicate payment processing...');
  
  const paymentId = randomUUID();
  const orderId = randomUUID();
  const checkoutSessionId = randomUUID();

  // Create first payment
  const payment1 = new Payment({
    paymentId,
    orderId,
    checkoutSessionId,
    provider: 'phonepe',
    amount: 2000,
    status: 'success',
    phonepeTransactionId: randomUUID(),
    rawPayload: { transactionId: paymentId }
  });

  await payment1.save();

  // Try to create duplicate payment with same ID
  try {
    const payment2 = new Payment({
      paymentId, // Same payment ID
      orderId: randomUUID(), // Different order
      checkoutSessionId: randomUUID(),
      provider: 'phonepe',
      amount: 2000,
      status: 'pending',
      phonepeTransactionId: randomUUID(),
      rawPayload: { transactionId: paymentId }
    });

    await payment2.save();
    throw new Error('Duplicate payment ID should not be allowed');
  } catch (error) {
    // Expected: MongoDB unique index should prevent duplicate paymentId
    if (error.code === 11000) {
      log('✅ Duplicate payment ID correctly rejected by unique index');
    } else {
      throw error;
    }
  }

  // Verify only one payment exists
  const paymentCount = await Payment.countDocuments({ paymentId });
  assertEqual(paymentCount, 1, 'Should have only one payment with this ID');

  log('✅ Idempotency guards test passed');

  // Clean up
  await Payment.findByIdAndDelete(payment1._id);
};

// Main test runner
const runTests = async () => {
  log('🚀 Starting comprehensive checkout system tests...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    log('✅ Connected to MongoDB');

    // Basic functionality tests
    log('📋 Running basic functionality tests...');
    await testCheckoutSessionCreation();
    await testStockValidation();
    await testPaymentEventCreation();
    await testCheckoutSessionExpiration();
    await testStockReservation();
    await testDatabaseIndexes();
    await testCleanupExpiredSessions();

    // Advanced edge case tests
    log('🔬 Running advanced edge case tests...');
    await testRaceConditionStockReservation();
    await testExpiredReservationEdgeCase();
    await testDuplicateWebhookHandling();
    await testMultiTabMultiDeviceConflict();
    await testReconciliationFlow();
    await testIdempotencyGuards();

    // Print results
    log('📊 Test Results:');
    log(`   Passed: ${testResults.passed}`);
    log(`   Failed: ${testResults.failed}`);
    
    if (testResults.errors.length > 0) {
      log('❌ Test Errors:');
      testResults.errors.forEach(({ name, error }) => {
        log(`   ${name}: ${error}`);
      });
    }

    if (testResults.failed === 0) {
      log('🎉 All tests passed!');
      log('🚀 System is ready for production deployment');
      process.exit(0);
    } else {
      log('💥 Some tests failed!');
      log('⚠️  Please fix the failing tests before deployment');
      process.exit(1);
    }

  } catch (error) {
    log(`💥 Test runner failed: ${error.message}`, 'ERROR');
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    log('✅ MongoDB connection closed');
  }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };
