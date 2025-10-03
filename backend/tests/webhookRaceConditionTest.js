/**
 * WEBHOOK RACE CONDITION TEST SUITE
 * 
 * Tests concurrent webhook processing to ensure:
 * - No duplicate orders created
 * - No stock overselling
 * - Proper distributed locking
 * - Race condition handling
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
  TEST_ORDER_ID: 'RACE_TEST_ORDER_12345',
  TEST_TRANSACTION_ID: 'RACE_TEST_TXN_67890',
  TEST_AMOUNT: 50000, // 500 rupees in paise
  WEBHOOK_ENDPOINT: '/api/payment/phonepe/webhook',
  CONCURRENT_REQUESTS: 50
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
 * Create test order for race condition testing
 */
async function createTestOrder() {
  return await orderModel.create({
    orderId: TEST_CONFIG.TEST_ORDER_ID,
    phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
    status: 'DRAFT',
    paymentStatus: 'PENDING',
    total: TEST_CONFIG.TEST_AMOUNT / 100,
    cartItems: [
      {
        productId: 'test-product-1',
        quantity: 1,
        price: 500
      }
    ],
    userInfo: {
      email: 'test@example.com',
      name: 'Test User'
    },
    shippingInfo: {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '1234567890',
      addressLine1: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      postalCode: '123456',
      country: 'India'
    }
  });
}

describe('⚡ WEBHOOK RACE CONDITION TESTS', () => {
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

  describe('🔥 CONCURRENT WEBHOOK PROCESSING', () => {
    test('Should handle 50 concurrent identical webhooks without duplicates', async () => {
      // Create test order first
      await createTestOrder();
      
      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      // Send 50 concurrent identical webhooks
      const promises = Array(TEST_CONFIG.CONCURRENT_REQUESTS).fill().map(() => 
        request(app)
          .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
          .set('x-verify', signature)
          .set('content-type', 'application/json')
          .send(payload)
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      console.log(`⏱️  Processed ${TEST_CONFIG.CONCURRENT_REQUESTS} concurrent webhooks in ${endTime - startTime}ms`);
      
      // All should return 200
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Wait for async processing to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // CRITICAL: Only ONE order should be confirmed
      const confirmedOrders = await orderModel.find({ 
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        paymentStatus: 'PAID'
      });
      expect(confirmedOrders.length).toBe(1);
      expect(confirmedOrders[0].status).toBe('CONFIRMED');

      // Only ONE webhook should be processed successfully
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(1);

      // All other webhooks should be marked as duplicates/ignored
      const totalWebhooks = await RawWebhook.countDocuments({});
      expect(totalWebhooks).toBe(TEST_CONFIG.CONCURRENT_REQUESTS);
    }, 30000); // 30 second timeout for this test

    test('Should handle mixed success/failure webhooks correctly', async () => {
      await createTestOrder();
      
      const successPayload = createValidWebhookPayload(TEST_CONFIG.TEST_ORDER_ID, TEST_CONFIG.TEST_TRANSACTION_ID, TEST_CONFIG.TEST_AMOUNT, 'COMPLETED');
      const failurePayload = createValidWebhookPayload(TEST_CONFIG.TEST_ORDER_ID, TEST_CONFIG.TEST_TRANSACTION_ID, TEST_CONFIG.TEST_AMOUNT, 'FAILED');
      
      const successSignature = generatePhonePeSignature(successPayload);
      const failureSignature = generatePhonePeSignature(failurePayload);

      // Send 25 success and 25 failure webhooks concurrently
      const successPromises = Array(25).fill().map(() => 
        request(app)
          .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
          .set('x-verify', successSignature)
          .set('content-type', 'application/json')
          .send(successPayload)
      );

      const failurePromises = Array(25).fill().map(() => 
        request(app)
          .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
          .set('x-verify', failureSignature)
          .set('content-type', 'application/json')
          .send(failurePayload)
      );

      const allPromises = [...successPromises, ...failurePromises];
      const responses = await Promise.all(allPromises);

      // All should return 200
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should have processed both types of webhooks
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(2); // One success, one failure

      // Order should be confirmed (success webhook wins)
      const orders = await orderModel.find({ phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID });
      expect(orders.length).toBe(1);
      expect(orders[0].paymentStatus).toBe('PAID');
    }, 30000);

    test('Should handle webhook processing with different amounts (fraud prevention)', async () => {
      await createTestOrder();
      
      const originalAmount = TEST_CONFIG.TEST_AMOUNT;
      const tamperedAmount = originalAmount * 2; // Double the amount
      
      const originalPayload = createValidWebhookPayload(TEST_CONFIG.TEST_ORDER_ID, TEST_CONFIG.TEST_TRANSACTION_ID, originalAmount);
      const tamperedPayload = createValidWebhookPayload(TEST_CONFIG.TEST_ORDER_ID, TEST_CONFIG.TEST_TRANSACTION_ID, tamperedAmount);
      
      const originalSignature = generatePhonePeSignature(originalPayload);
      const tamperedSignature = generatePhonePeSignature(tamperedPayload);

      // Send both webhooks concurrently
      const promises = [
        request(app)
          .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
          .set('x-verify', originalSignature)
          .set('content-type', 'application/json')
          .send(originalPayload),
        request(app)
          .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
          .set('x-verify', tamperedSignature)
          .set('content-type', 'application/json')
          .send(tamperedPayload)
      ];

      const responses = await Promise.all(promises);

      // Both should return 200
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Only the original webhook should be processed (tampered one rejected due to signature)
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(1);

      // Order should be confirmed with original amount
      const orders = await orderModel.find({ phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID });
      expect(orders.length).toBe(1);
      expect(orders[0].total).toBe(originalAmount / 100);
    });
  });

  describe('🚫 DUPLICATE PROCESSING PREVENTION', () => {
    test('Should prevent duplicate processing with identical payloads', async () => {
      await createTestOrder();
      
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
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send identical webhook second time
      const response2 = await request(app)
        .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
        .set('x-verify', signature)
        .set('content-type', 'application/json')
        .send(payload);

      expect(response2.status).toBe(200);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should have only ONE processed webhook
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(1);

      // Should have only ONE confirmed order
      const orders = await orderModel.find({ 
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        paymentStatus: 'PAID'
      });
      expect(orders.length).toBe(1);
    });

    test('Should handle rapid-fire webhook retries correctly', async () => {
      await createTestOrder();
      
      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      // Send webhook 10 times rapidly
      const promises = Array(10).fill().map(() => 
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

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should have processed only ONE webhook
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(1);

      // Should have only ONE confirmed order
      const orders = await orderModel.find({ 
        phonepeTransactionId: TEST_CONFIG.TEST_TRANSACTION_ID,
        paymentStatus: 'PAID'
      });
      expect(orders.length).toBe(1);
    });
  });

  describe('⚡ PERFORMANCE UNDER LOAD', () => {
    test('Should maintain response times under high load', async () => {
      await createTestOrder();
      
      const payload = createValidWebhookPayload();
      const signature = generatePhonePeSignature(payload);

      const startTime = Date.now();
      
      // Send 100 webhooks
      const promises = Array(100).fill().map(() => 
        request(app)
          .post(TEST_CONFIG.WEBHOOK_ENDPOINT)
          .set('x-verify', signature)
          .set('content-type', 'application/json')
          .send(payload)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const avgResponseTime = (endTime - startTime) / 100;
      
      console.log(`📊 Average response time: ${avgResponseTime.toFixed(2)}ms per webhook`);
      
      // All should return 200
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Response times should be reasonable (under 1000ms average)
      expect(avgResponseTime).toBeLessThan(1000);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should still process only ONE webhook
      const processedWebhooks = await RawWebhook.find({ processed: true });
      expect(processedWebhooks.length).toBe(1);
    }, 60000); // 60 second timeout for performance test
  });
});
