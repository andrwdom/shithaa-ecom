/**
 * WEBHOOK SECURITY TEST SUITE
 * 
 * Tests critical security vulnerabilities that could lead to:
 * - Payment spoofing
 * - Duplicate billing
 * - Fraud
 * - Data breaches
 */

import crypto from 'crypto';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';

// Test configuration
const TEST_CONFIG = {
  PHONEPE_SALT_KEY: 'test_salt_key_12345',
  PHONEPE_SALT_INDEX: '1',
  TEST_ORDER_ID: 'TEST_ORDER_12345',
  TEST_TRANSACTION_ID: 'TEST_TXN_67890',
  TEST_AMOUNT: 100000, // 1000 rupees in paise
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

describe('🚨 WEBHOOK SECURITY TESTS', () => {
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
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean state before each test
    await RawWebhook.deleteMany({});
    await orderModel.deleteMany({});
  });

  describe('🔐 SIGNATURE VERIFICATION TESTS', () => {
    test('Should ACCEPT webhook with valid PhonePe signature', async () => {
      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should REJECT webhook with invalid signature', async () => {
      const payload = createValidWebhookPayload();
      const invalidSignature = 'invalid_signature_12345';

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', invalidSignature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200); // Still returns 200 to prevent retries
      
      // Check that webhook was not processed
      const webhooks = await RawWebhook.find({});
      expect(webhooks.length).toBe(1);
      expect(webhooks[0].processed).toBe(false);
    });

    test('Should REJECT webhook with missing signature', async () => {
      const payload = createValidWebhookPayload();

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200); // Still returns 200 to prevent retries
      
      // Check that webhook was not processed
      const webhooks = await RawWebhook.find({});
      expect(webhooks.length).toBe(1);
      expect(webhooks[0].processed).toBe(false);
    });

    test('Should REJECT webhook with tampered payload', async () => {
      const originalPayload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(originalPayload);
      
      // Tamper with payload
      const tamperedPayload = createValidWebhookPayload(TEST_CONFIG.TEST_ORDER_ID, TEST_CONFIG.TEST_TRANSACTION_ID, 200000); // Double amount

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature) // Original signature
        .set('content-type', 'application/json')
        .send(tamperedPayload);

      expect(response.status).toBe(200);
      
      // Check that webhook was not processed
      const webhooks = await RawWebhook.find({});
      expect(webhooks.length).toBe(1);
      expect(webhooks[0].processed).toBe(false);
    });
  });

  describe('🔄 IDEMPOTENCY TESTS', () => {
    test('Should process webhook only ONCE when sent multiple times', async () => {
      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      // Send webhook 5 times
      const promises = Array(5).fill().map(() => 
        request(app)
          .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
          .set('x-verify', signature)
          .set('content-type', 'application/json')
          .send(payload)
      );

      const responses = await Promise.all(promises);
      
      // All should return 200
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // But only ONE order should be created
      const orders = await orderModel.find({ phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID });
      expect(orders.length).toBe(1);
      
      // Only ONE webhook should be processed
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(1);
    });

    test('Should handle SUCCESS and FAILURE webhooks for same orderId correctly', async () => {
      const successPayload = createValidWebhookPayload(TEST_CONFIG.TEST_ORDER_ID, TEST_CONFIG.TEST_TRANSACTION_ID, TEST_CONFIG.TEST_AMOUNT, 'COMPLETED');
      const failurePayload = createValidWebhookPayload(TEST_CONFIG.TEST_ORDER_ID, TEST_CONFIG.TEST_TRANSACTION_ID, TEST_CONFIG.TEST_AMOUNT, 'FAILED');
      
      const successSignature = generatePhonePeSignature(successPayload);
      const failureSignature = generatePhonePeSignature(failurePayload);

      // Send success webhook
      await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', successSignature)
        .set('content-type', 'application/json')
        .send(successPayload);

      // Send failure webhook for same transaction
      await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', failureSignature)
        .set('content-type', 'application/json')
        .send(failurePayload);

      // Should have processed both webhooks (different states)
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(2);
      
      // Should have one successful order
      const orders = await orderModel.find({ phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID });
      expect(orders.length).toBe(1);
      expect(orders[0].paymentStatus).toBe('PAID');
    });
  });

  describe('🚫 FRAUD PREVENTION TESTS', () => {
    test('Should REJECT webhook with excessive amount', async () => {
      const excessiveAmount = 10000000; // 1 crore rupees
      const payload = createValidWebhookPayload(TEST_CONFIG.TEST_ORDER_ID, TEST_CONFIG.TEST_TRANSACTION_ID, excessiveAmount);
      const signature = generatePhonePeSignature(payload);

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
      
      // Should not create emergency order due to amount validation
      const orders = await orderModel.find({ phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID });
      expect(orders.length).toBe(0);
    });

    test('Should REJECT webhook with negative amount', async () => {
      const negativeAmount = -100000;
      const payload = createValidWebhookPayload(TEST_CONFIG.TEST_ORDER_ID, TEST_CONFIG.TEST_TRANSACTION_ID, negativeAmount);
      const signature = generatePhonePeSignature(payload);

      const response = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(200);
      
      // Should not process due to amount validation
      const orders = await orderModel.find({ phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID });
      expect(orders.length).toBe(0);
    });
  });

  describe('🔒 GENERIC WEBHOOK ENDPOINT SECURITY', () => {
    test('Should REJECT webhook from unknown provider', async () => {
      const payload = { test: 'data' };

      const response = await request(app)
        .post('/api/webhook/unknown-provider')
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Unknown webhook provider');
    });

    test('Should REJECT PhonePe webhook without X-VERIFY header', async () => {
      const payload = { test: 'data' };

      const response = await request(app)
        .post('/api/webhook/phonepe')
        .set('content-type', 'application/json')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Missing signature header');
    });
  });
});
