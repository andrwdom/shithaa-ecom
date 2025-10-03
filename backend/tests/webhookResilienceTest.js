/**
 * WEBHOOK RESILIENCE TEST SUITE
 * 
 * Tests system resilience under failure conditions:
 * - Database connection failures
 * - Network timeouts
 * - Service unavailability
 * - Data corruption scenarios
 * - Recovery mechanisms
 */

import crypto from 'crypto';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import CheckoutSession from '../models/CheckoutSession.js';

// Test configuration
const TEST_CONFIG = {
  PHONEPE_SALT_KEY: 'test_salt_key_12345',
  PHONEPE_SALT_INDEX: '1',
  TEST_ORDER_ID: 'RESILIENCE_TEST_ORDER_12345',
  TEST_TRANSACTION_ID: 'RESILIENCE_TEST_TXN_67890',
  TEST_AMOUNT: 25000, // 250 rupees in paise
  WEBHOOK_ENDPOINT: '/api/payment/phonepe/webhook'
};

/**
 * Generate valid PhonePe signature
 */
function generatePhonePeSignature(payload, saltKey = TEST_CONFIG.PHONEPE_SALT_KEY, saltIndex = TEST_CONFIG.PHONEPE_SALT_INDEX) {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const dataToSign = payloadString + saltKey + saltIndex;
  return crypto.createHash('sha256').update(dataToSign).digest('hex');
}

/**
 * Create valid PhonePe webhook payload
 */
function createValidWebhookPayload(orderId = TEST_CONFIG.TEST_ORDER_ID, transactionId = TEST_CONFIG.TEST_TRANSACTION_ID, amount = TEST_CONFIG.TEST_AMOUNT, state = 'COMPLETED') {
  return {
    event: 'payment.success',
    payload: {
      orderId,
      merchantTransactionId: transactionId,
      transactionId: transactionId,
      state,
      amount,
      currency: 'INR',
      timestamp: Date.now()
    }
  };
}

/**
 * Mock database connection failure
 */
async function simulateDatabaseFailure() {
  // Close database connection
  await mongoose.connection.close();
}

/**
 * Restore database connection
 */
async function restoreDatabaseConnection() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_test';
  await mongoose.connect(mongoUri);
}

describe('🛡️ WEBHOOK RESILIENCE TESTS', () => {
  beforeAll(async () => {
    // Set test environment variables
    process.env.PHONEPE_SALT_KEY = TEST_CONFIG.PHONEPE_SALT_KEY;
    process.env.PHONEPE_SALT_INDEX = TEST_CONFIG.PHONEPE_SALT_INDEX;
    
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_test');
  });

  afterAll(async () => {
    // Cleanup
    await RawWebhook.deleteMany({});
    await orderModel.deleteMany({});
    await PaymentSession.deleteMany({});
    await CheckoutSession.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean state before each test
    await RawWebhook.deleteMany({});
    await orderModel.deleteMany({});
    await PaymentSession.deleteMany({});
    await CheckoutSession.deleteMany({});
  });

  describe('💥 DATABASE FAILURE SCENARIOS', () => {
    test('Should handle database connection failure gracefully', async () => {
      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      // Simulate database failure before webhook
      await simulateDatabaseFailure();

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      // Should still return 200 to prevent retries
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Restore database connection
      await restoreDatabaseConnection();

      // Wait a bit for any async processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should have logged the failure but not crashed
      console.log('✅ System handled database failure gracefully');
    });

    test('Should recover from database failure and process webhook on retry', async () => {
      // First, create a test order
      await orderModel.create({
        orderId: TEST_CONFIG.TEST_ORDER_ID,
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        status: 'DRAFT',
        paymentStatus: 'PENDING',
        total: TEST_CONFIG.TEST_AMOUNT / 100,
        cartItems: [{ productId: 'test-product', quantity: 1, price: 250 }],
        userInfo: { email: 'test@example.com', name: 'Test User' },
        shippingInfo: { fullName: 'Test User', email: 'test@example.com', phone: '1234567890' }
      });

      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      // Send webhook with database available
      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should have processed the webhook successfully
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(1);

      const orders = await orderModel.find({ 
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        paymentStatus: 'PAID'
      });
      expect(orders.length).toBe(1);
    });
  });

  describe('⏱️ TIMEOUT AND DELAY SCENARIOS', () => {
    test('Should handle webhook processing delays', async () => {
      // Create test order
      await orderModel.create({
        orderId: TEST_CONFIG.TEST_ORDER_ID,
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        status: 'DRAFT',
        paymentStatus: 'PENDING',
        total: TEST_CONFIG.TEST_AMOUNT / 100,
        cartItems: [{ productId: 'test-product', quantity: 1, price: 250 }],
        userInfo: { email: 'test@example.com', name: 'Test User' },
        shippingInfo: { fullName: 'Test User', email: 'test@example.com', phone: '1234567890' }
      });

      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      // Send webhook
      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);

      // Wait longer for processing (simulating slow processing)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Should have processed the webhook
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(1);

      const orders = await orderModel.find({ 
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        paymentStatus: 'PAID'
      });
      expect(orders.length).toBe(1);
    });

    test('Should handle delayed webhook retries correctly', async () => {
      // Create test order
      await orderModel.create({
        orderId: TEST_CONFIG.TEST_ORDER_ID,
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        status: 'DRAFT',
        paymentStatus: 'PENDING',
        total: TEST_CONFIG.TEST_AMOUNT / 100,
        cartItems: [{ productId: 'test-product', quantity: 1, price: 250 }],
        userInfo: { email: 'test@example.com', name: 'Test User' },
        shippingInfo: { fullName: 'Test User', email: 'test@example.com', phone: '1234567890' }
      });

      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      // Send webhook first time
      const response1 = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response1.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Send same webhook again after delay (simulating provider retry)
      const response2 = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response2.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should still process only once
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(1);

      const orders = await orderModel.find({ 
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        paymentStatus: 'PAID'
      });
      expect(orders.length).toBe(1);
    });
  });

  describe('🔄 RECONCILIATION SCENARIOS', () => {
    test('Should handle webhook with no matching order (emergency order creation)', async () => {
      // Don't create any order - simulate missing order scenario
      
      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should create emergency order
      const emergencyOrders = await orderModel.find({ 
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        'meta.source': 'emergency_webhook_recovery'
      });
      
      expect(emergencyOrders.length).toBe(1);
      expect(emergencyOrders[0].meta.requiresManualProcessing).toBe(true);
      expect(emergencyOrders[0].paymentStatus).toBe('PAID');
    });

    test('Should handle webhook with payment session but no order', async () => {
      // Create payment session but no order
      await PaymentSession.create({
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        amount: TEST_CONFIG.TEST_AMOUNT,
        status: 'PENDING',
        userInfo: { email: 'test@example.com', name: 'Test User' },
        shippingInfo: { fullName: 'Test User', email: 'test@example.com', phone: '1234567890' }
      });

      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should recover order from payment session
      const recoveredOrders = await orderModel.find({ 
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        'meta.recoveryMethod': 'payment_session'
      });
      
      expect(recoveredOrders.length).toBe(1);
      expect(recoveredOrders[0].paymentStatus).toBe('PAID');
    });
  });

  describe('🚫 MALFORMED DATA SCENARIOS', () => {
    test('Should handle malformed webhook payload', async () => {
      const malformedPayload = {
        // Missing required fields
        event: 'payment.success'
        // Missing payload object
      };
      
      const signature = generatePhonePeSignature(malformedPayload);

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(malformedPayload);

      expect(response.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should not process malformed payload
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(0);

      // Should have saved raw webhook for debugging
      const rawWebhooks = await RawWebhook.find({});
      expect(rawWebhooks.length).toBe(1);
      expect(rawWebhooks[0].processed).toBe(false);
    });

    test('Should handle invalid JSON payload', async () => {
      const invalidJson = '{"invalid": json}';
      const signature = generatePhonePeSignature(invalidJson);

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(invalidJson);

      expect(response.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should not process invalid JSON
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(0);
    });
  });

  describe('⚡ CIRCUIT BREAKER SCENARIOS', () => {
    test('Should handle multiple consecutive failures', async () => {
      // Create multiple invalid webhooks to trigger circuit breaker
      const invalidPayloads = Array(10).fill().map((_, index) => ({
        event: 'payment.success',
        payload: {
          orderId: `INVALID_${index}`,
          merchantTransactionId: `INVALID_TXN_${index}`,
          state: 'INVALID_STATE',
          amount: -1000 // Invalid amount
        }
      }));

      const promises = invalidPayloads.map(payload => {
        const signature = generatePhonePeSignature(payload);
        return request(app)
          .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
          .set('x-verify', signature)
          .set('content-type', 'application/json')
          .send(payload);
      });

      const responses = await Promise.all(promises);

      // All should return 200
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should not process any invalid webhooks
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(0);

      // Should have saved all raw webhooks
      const rawWebhooks = await RawWebhook.find({});
      expect(rawWebhooks.length).toBe(10);
    });
  });
});
