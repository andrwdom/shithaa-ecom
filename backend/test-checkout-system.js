#!/usr/bin/env node

/**
 * Test script for the new checkout system
 * Run with: node test-checkout-system.js
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

// Main test runner
const runTests = async () => {
  log('🚀 Starting checkout system tests...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    log('✅ Connected to MongoDB');

    // Run tests
    await testCheckoutSessionCreation();
    await testStockValidation();
    await testPaymentEventCreation();
    await testCheckoutSessionExpiration();
    await testStockReservation();
    await testDatabaseIndexes();
    await testCleanupExpiredSessions();

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
      process.exit(0);
    } else {
      log('💥 Some tests failed!');
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
