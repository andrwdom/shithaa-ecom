#!/usr/bin/env node

/**
 * PhonePe Webhook Signature Tester
 * 
 * This script generates valid PhonePe webhook signatures and sends test webhooks
 * to verify your webhook endpoint is working correctly.
 * 
 * Usage:
 *   PHONEPE_WEBHOOK_USERNAME=your_username PHONEPE_WEBHOOK_PASSWORD=your_password node test-webhook-phonepe.js
 */

const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  // Your backend URL
  BACKEND_URL: 'https://your-backend.example',
  WEBHOOK_PATH: '/api/payment/phonepe/webhook',
  
  // Test data
  TEST_ORDER_ID: 'test-order-' + Date.now(),
  TEST_TRANSACTION_ID: 'test-txn-' + Date.now(),
  TEST_AMOUNT: 10000, // 100.00 INR in paise
  
  // PhonePe credentials (from environment variables)
  USERNAME: process.env.PHONEPE_WEBHOOK_USERNAME || 'your_username',
  PASSWORD: process.env.PHONEPE_WEBHOOK_PASSWORD || 'your_password'
};

/**
 * Generate PhonePe webhook signature
 * PhonePe uses SHA256(username:password) in Authorization header
 */
function generatePhonePeSignature(username, password) {
  const credentials = `${username}:${password}`;
  return crypto
    .createHash('sha256')
    .update(credentials)
    .digest('hex');
}

/**
 * Create test webhook payload
 */
function createWebhookPayload(orderId, transactionId, amount, state = 'COMPLETED') {
  return JSON.stringify({
    event: 'PAYMENT_SUCCESS',
    payload: {
      orderId: orderId,
      transactionId: transactionId,
      merchantTransactionId: transactionId,
      state: state,
      amount: amount,
      responseCode: state === 'COMPLETED' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      responseMessage: state === 'COMPLETED' ? 'Payment successful' : 'Payment failed',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Send webhook request
 */
function sendWebhook(url, payload, signature, correlationId) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': signature,
        'X-Request-ID': correlationId,
        'User-Agent': 'PhonePe-Webhook-Tester/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          correlationId
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Test webhook idempotency by sending the same webhook multiple times
 */
async function testWebhookIdempotency() {
  console.log('\n🔄 Testing Webhook Idempotency...');
  
  const orderId = CONFIG.TEST_ORDER_ID + '-idempotency';
  const transactionId = CONFIG.TEST_TRANSACTION_ID + '-idempotency';
  const payload = createWebhookPayload(orderId, transactionId, CONFIG.TEST_AMOUNT);
  const signature = generatePhonePeSignature(CONFIG.USERNAME, CONFIG.PASSWORD);
  const webhookUrl = CONFIG.BACKEND_URL + CONFIG.WEBHOOK_PATH;
  
  const results = [];
  
  // Send the same webhook 3 times
  for (let i = 0; i < 3; i++) {
    const correlationId = `idempotency_test_${i}_${Date.now()}`;
    
    try {
      console.log(`  📤 Sending webhook ${i + 1}/3...`);
      const result = await sendWebhook(webhookUrl, payload, signature, correlationId);
      results.push(result);
      
      console.log(`  📥 Response ${i + 1}: ${result.statusCode} - ${result.body.substring(0, 100)}...`);
      
      // Wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  ❌ Error sending webhook ${i + 1}:`, error.message);
      results.push({ error: error.message, correlationId });
    }
  }
  
  // Analyze results
  const successfulRequests = results.filter(r => r.statusCode === 200);
  const failedRequests = results.filter(r => r.statusCode !== 200);
  
  console.log(`\n📊 Idempotency Test Results:`);
  console.log(`  ✅ Successful requests: ${successfulRequests.length}/3`);
  console.log(`  ❌ Failed requests: ${failedRequests.length}/3`);
  
  if (successfulRequests.length === 3) {
    console.log(`  🎯 All webhooks accepted - check your database for duplicate orders`);
    console.log(`  🔍 Expected: Only 1 order should be created for orderId: ${orderId}`);
  } else {
    console.log(`  ⚠️  Some webhooks failed - check your webhook endpoint`);
  }
  
  return results;
}

/**
 * Test webhook with different payment states
 */
async function testWebhookStates() {
  console.log('\n🔄 Testing Different Payment States...');
  
  const states = [
    { state: 'COMPLETED', expected: 'success' },
    { state: 'FAILED', expected: 'failure' },
    { state: 'CANCELLED', expected: 'cancelled' }
  ];
  
  const results = [];
  
  for (const { state, expected } of states) {
    const orderId = CONFIG.TEST_ORDER_ID + `-${state.toLowerCase()}`;
    const transactionId = CONFIG.TEST_TRANSACTION_ID + `-${state.toLowerCase()}`;
    const payload = createWebhookPayload(orderId, transactionId, CONFIG.TEST_AMOUNT, state);
    const signature = generatePhonePeSignature(CONFIG.USERNAME, CONFIG.PASSWORD);
    const webhookUrl = CONFIG.BACKEND_URL + CONFIG.WEBHOOK_PATH;
    const correlationId = `state_test_${state}_${Date.now()}`;
    
    try {
      console.log(`  📤 Testing ${state} state...`);
      const result = await sendWebhook(webhookUrl, payload, signature, correlationId);
      results.push({ state, expected, result });
      
      console.log(`  📥 Response: ${result.statusCode} - ${result.body.substring(0, 100)}...`);
      
      // Wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`  ❌ Error testing ${state}:`, error.message);
      results.push({ state, expected, error: error.message });
    }
  }
  
  return results;
}

/**
 * Test webhook signature validation
 */
async function testSignatureValidation() {
  console.log('\n🔐 Testing Signature Validation...');
  
  const orderId = CONFIG.TEST_ORDER_ID + '-signature-test';
  const transactionId = CONFIG.TEST_TRANSACTION_ID + '-signature-test';
  const payload = createWebhookPayload(orderId, transactionId, CONFIG.TEST_AMOUNT);
  const webhookUrl = CONFIG.BACKEND_URL + CONFIG.WEBHOOK_PATH;
  
  // Test 1: Valid signature
  console.log('  📤 Testing with valid signature...');
  const validSignature = generatePhonePeSignature(CONFIG.USERNAME, CONFIG.PASSWORD);
  const validResult = await sendWebhook(webhookUrl, payload, validSignature, 'valid_sig_test');
  console.log(`  📥 Valid signature response: ${validResult.statusCode}`);
  
  // Test 2: Invalid signature
  console.log('  📤 Testing with invalid signature...');
  const invalidSignature = 'invalid_signature_12345';
  const invalidResult = await sendWebhook(webhookUrl, payload, invalidSignature, 'invalid_sig_test');
  console.log(`  📥 Invalid signature response: ${invalidResult.statusCode}`);
  
  // Test 3: Missing signature
  console.log('  📤 Testing with missing signature...');
  const noSigResult = await sendWebhook(webhookUrl, payload, '', 'no_sig_test');
  console.log(`  📥 No signature response: ${noSigResult.statusCode}`);
  
  const results = {
    valid: validResult,
    invalid: invalidResult,
    missing: noSigResult
  };
  
  console.log(`\n📊 Signature Validation Results:`);
  console.log(`  ✅ Valid signature: ${validResult.statusCode} (should be 200)`);
  console.log(`  ❌ Invalid signature: ${invalidResult.statusCode} (should be 401)`);
  console.log(`  ❌ Missing signature: ${noSigResult.statusCode} (should be 401)`);
  
  return results;
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting PhonePe Webhook Tests...');
  console.log(`📍 Backend URL: ${CONFIG.BACKEND_URL}`);
  console.log(`🔑 Username: ${CONFIG.USERNAME}`);
  console.log(`🔐 Password: ${CONFIG.PASSWORD ? '***' : 'NOT SET'}`);
  
  if (!CONFIG.USERNAME || !CONFIG.PASSWORD || CONFIG.USERNAME === 'your_username') {
    console.error('\n❌ Please set PHONEPE_WEBHOOK_USERNAME and PHONEPE_WEBHOOK_PASSWORD environment variables');
    console.error('   Example: PHONEPE_WEBHOOK_USERNAME=your_username PHONEPE_WEBHOOK_PASSWORD=your_password node test-webhook-phonepe.js');
    process.exit(1);
  }
  
  try {
    // Test 1: Signature validation
    await testSignatureValidation();
    
    // Test 2: Different payment states
    await testWebhookStates();
    
    // Test 3: Idempotency
    await testWebhookIdempotency();
    
    console.log('\n✅ All tests completed!');
    console.log('\n📋 Next Steps:');
    console.log('  1. Check your database for created orders');
    console.log('  2. Verify only one order was created per transaction ID');
    console.log('  3. Check your logs for any errors or warnings');
    console.log('  4. Verify webhook processing in your admin panel');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  generatePhonePeSignature,
  createWebhookPayload,
  sendWebhook,
  testWebhookIdempotency,
  testWebhookStates,
  testSignatureValidation
};
