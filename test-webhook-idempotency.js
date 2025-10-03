/**
 * Webhook Idempotency Test Script
 * 
 * Tests the webhook idempotency functionality to ensure:
 * 1. Duplicate webhooks are not processed twice
 * 2. Webhook events are properly tracked
 * 3. Race conditions are handled correctly
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:4000';
const WEBHOOK_ENDPOINT = '/api/payment/phonepe/webhook';

// Test configuration
const TEST_CONFIG = {
  username: process.env.PHONEPE_CALLBACK_USERNAME || 'test_user',
  password: process.env.PHONEPE_CALLBACK_PASSWORD || 'test_pass',
  testOrderId: `test_order_${Date.now()}`,
  testAmount: 10000, // 100.00 in paise
  concurrentRequests: 5,
  delayBetweenRequests: 100 // ms
};

/**
 * Generate PhonePe webhook signature
 */
function generateSignature(payload, username, password) {
  return crypto
    .createHash('sha256')
    .update(`${username}:${password}`)
    .digest('hex');
}

/**
 * Create test webhook payload
 */
function createWebhookPayload(orderId, amount, state = 'COMPLETED') {
  return {
    payload: {
      orderId: orderId,
      merchantTransactionId: orderId,
      transactionId: `txn_${orderId}`,
      amount: amount,
      state: state,
      status: state,
      currency: 'INR',
      paymentInstrument: {
        type: 'UPI',
        utr: `utr_${orderId}`
      }
    },
    event: 'payment.completed'
  };
}

/**
 * Send webhook request
 */
async function sendWebhook(payload, requestId) {
  const signature = generateSignature(
    JSON.stringify(payload), 
    TEST_CONFIG.username, 
    TEST_CONFIG.password
  );

  const response = await fetch(`${BASE_URL}${WEBHOOK_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PhonePe-Signature': signature,
      'X-Request-ID': requestId,
      'User-Agent': 'WebhookIdempotencyTest/1.0'
    },
    body: JSON.stringify(payload)
  });

  return {
    status: response.status,
    data: await response.json(),
    requestId
  };
}

/**
 * Test webhook idempotency
 */
async function testWebhookIdempotency() {
  console.log('🧪 Starting Webhook Idempotency Test');
  console.log('=====================================');
  
  const orderId = TEST_CONFIG.testOrderId;
  const payload = createWebhookPayload(orderId, TEST_CONFIG.testAmount);
  
  console.log(`📋 Test Order ID: ${orderId}`);
  console.log(`💰 Test Amount: ${TEST_CONFIG.testAmount} paise`);
  console.log(`🔄 Sending ${TEST_CONFIG.concurrentRequests} concurrent requests...`);
  
  // Send multiple concurrent requests with the same order ID
  const requests = [];
  for (let i = 0; i < TEST_CONFIG.concurrentRequests; i++) {
    const requestId = `test_${Date.now()}_${i}`;
    requests.push(sendWebhook(payload, requestId));
    
    // Small delay between requests to simulate real-world scenario
    if (i < TEST_CONFIG.concurrentRequests - 1) {
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.delayBetweenRequests));
    }
  }
  
  // Wait for all requests to complete
  const results = await Promise.all(requests);
  
  console.log('\n📊 Test Results:');
  console.log('================');
  
  // Analyze results
  const successfulRequests = results.filter(r => r.status === 200);
  const failedRequests = results.filter(r => r.status !== 200);
  
  console.log(`✅ Successful requests: ${successfulRequests.length}/${TEST_CONFIG.concurrentRequests}`);
  console.log(`❌ Failed requests: ${failedRequests.length}/${TEST_CONFIG.concurrentRequests}`);
  
  if (failedRequests.length > 0) {
    console.log('\n❌ Failed Request Details:');
    failedRequests.forEach((req, index) => {
      console.log(`  ${index + 1}. Status: ${req.status}, Request ID: ${req.requestId}`);
      console.log(`     Response: ${JSON.stringify(req.data)}`);
    });
  }
  
  // Check webhook events in database
  console.log('\n🔍 Checking Webhook Events in Database...');
  await checkWebhookEvents(orderId);
  
  // Test duplicate webhook after processing
  console.log('\n🔄 Testing Duplicate Webhook After Processing...');
  await testDuplicateAfterProcessing(orderId);
  
  console.log('\n✅ Webhook Idempotency Test Completed');
}

/**
 * Check webhook events in database
 */
async function checkWebhookEvents(orderId) {
  try {
    const response = await fetch(`${BASE_URL}/api/webhook-management/events?limit=10`);
    const data = await response.json();
    
    if (data.success) {
      const events = data.events.filter(e => e.eventId === orderId);
      console.log(`📋 Found ${events.length} webhook events for order ${orderId}`);
      
      events.forEach((event, index) => {
        console.log(`  ${index + 1}. Event ID: ${event.eventId}`);
        console.log(`     Status: ${event.status}`);
        console.log(`     Received: ${new Date(event.receivedAt).toISOString()}`);
        console.log(`     Processed: ${event.processedAt ? new Date(event.processedAt).toISOString() : 'N/A'}`);
        console.log(`     Retry Count: ${event.retryCount}`);
        if (event.errorMessage) {
          console.log(`     Error: ${event.errorMessage}`);
        }
        console.log('');
      });
      
      // Verify idempotency
      const processedEvents = events.filter(e => e.status === 'processed');
      if (processedEvents.length === 1) {
        console.log('✅ IDEMPOTENCY VERIFIED: Only one webhook was processed');
      } else if (processedEvents.length > 1) {
        console.log('❌ IDEMPOTENCY FAILED: Multiple webhooks were processed');
      } else {
        console.log('⚠️  No webhooks were processed (check for errors)');
      }
    } else {
      console.log('❌ Failed to fetch webhook events from database');
    }
  } catch (error) {
    console.log(`❌ Error checking webhook events: ${error.message}`);
  }
}

/**
 * Test duplicate webhook after processing
 */
async function testDuplicateAfterProcessing(orderId) {
  const payload = createWebhookPayload(orderId, TEST_CONFIG.testAmount);
  const requestId = `duplicate_test_${Date.now()}`;
  
  console.log(`🔄 Sending duplicate webhook for order ${orderId}...`);
  
  const result = await sendWebhook(payload, requestId);
  
  console.log(`📊 Duplicate Request Result:`);
  console.log(`   Status: ${result.status}`);
  console.log(`   Response: ${JSON.stringify(result.data)}`);
  
  if (result.status === 200) {
    console.log('✅ Duplicate webhook accepted (expected)');
  } else {
    console.log('❌ Duplicate webhook rejected (unexpected)');
  }
}

/**
 * Test webhook with different order IDs
 */
async function testDifferentOrderIds() {
  console.log('\n🧪 Testing Different Order IDs');
  console.log('===============================');
  
  const orderIds = [
    `test_order_${Date.now()}_1`,
    `test_order_${Date.now()}_2`,
    `test_order_${Date.now()}_3`
  ];
  
  for (const orderId of orderIds) {
    const payload = createWebhookPayload(orderId, TEST_CONFIG.testAmount);
    const requestId = `different_test_${Date.now()}`;
    
    console.log(`🔄 Sending webhook for order ${orderId}...`);
    
    const result = await sendWebhook(payload, requestId);
    
    console.log(`   Status: ${result.status}`);
    console.log(`   Response: ${JSON.stringify(result.data)}`);
    
    // Small delay between different orders
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('✅ Different Order IDs test completed');
}

/**
 * Test webhook failure scenarios
 */
async function testFailureScenarios() {
  console.log('\n🧪 Testing Failure Scenarios');
  console.log('=============================');
  
  // Test with invalid signature
  console.log('🔄 Testing invalid signature...');
  const payload = createWebhookPayload(`test_fail_${Date.now()}`, TEST_CONFIG.testAmount);
  
  const response = await fetch(`${BASE_URL}${WEBHOOK_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PhonePe-Signature': 'invalid_signature',
      'X-Request-ID': `fail_test_${Date.now()}`,
      'User-Agent': 'WebhookIdempotencyTest/1.0'
    },
    body: JSON.stringify(payload)
  });
  
  console.log(`   Status: ${response.status}`);
  const data = await response.json();
  console.log(`   Response: ${JSON.stringify(data)}`);
  
  // Test with missing order ID
  console.log('\n🔄 Testing missing order ID...');
  const invalidPayload = {
    payload: {
      amount: TEST_CONFIG.testAmount,
      state: 'COMPLETED'
    },
    event: 'payment.completed'
  };
  
  const signature = generateSignature(
    JSON.stringify(invalidPayload), 
    TEST_CONFIG.username, 
    TEST_CONFIG.password
  );
  
  const response2 = await fetch(`${BASE_URL}${WEBHOOK_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PhonePe-Signature': signature,
      'X-Request-ID': `fail_test_2_${Date.now()}`,
      'User-Agent': 'WebhookIdempotencyTest/1.0'
    },
    body: JSON.stringify(invalidPayload)
  });
  
  console.log(`   Status: ${response2.status}`);
  const data2 = await response2.json();
  console.log(`   Response: ${JSON.stringify(data2)}`);
  
  console.log('✅ Failure scenarios test completed');
}

/**
 * Main test runner
 */
async function runTests() {
  try {
    console.log('🚀 Webhook Idempotency Test Suite');
    console.log('==================================');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log(`📡 Webhook Endpoint: ${WEBHOOK_ENDPOINT}`);
    console.log(`🔐 Username: ${TEST_CONFIG.username}`);
    console.log(`🔑 Password: ${TEST_CONFIG.password ? '***' : 'NOT SET'}`);
    console.log('');
    
    // Test 1: Basic idempotency
    await testWebhookIdempotency();
    
    // Test 2: Different order IDs
    await testDifferentOrderIds();
    
    // Test 3: Failure scenarios
    await testFailureScenarios();
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export {
  testWebhookIdempotency,
  testDifferentOrderIds,
  testFailureScenarios,
  runTests
};
