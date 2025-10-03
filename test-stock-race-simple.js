#!/usr/bin/env node

/**
 * SIMPLE STOCK RACE CONDITION TEST
 * 
 * This script tests for race conditions by making concurrent requests
 * to the same product/size combination.
 */

const http = require('http');
const { performance } = require('perf_hooks');

// Test configuration
const TEST_PRODUCT_ID = '507f1f77bcf86cd799439011'; // Replace with actual product ID
const TEST_SIZE = 'M';
const TEST_QUANTITY = 1;
const CONCURRENT_REQUESTS = 10;

// Track successful reservations
const successfulReservations = new Map();

function makeCheckoutRequest(requestId) {
  return new Promise((resolve) => {
    const correlationId = `test_${requestId}_${Date.now()}`;
    
    const checkoutPayload = {
      source: 'buynow',
      items: [{
        _id: TEST_PRODUCT_ID,
        productId: TEST_PRODUCT_ID,
        name: 'Test Product',
        price: 100,
        size: TEST_SIZE,
        quantity: TEST_QUANTITY,
        image: '',
        category: 'test'
      }],
      orderSummary: {
        subtotal: 100,
        total: 100,
        shipping: 0
      },
      email: `test_${requestId}@example.com`
    };

    const postData = JSON.stringify(checkoutPayload);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/checkout/session',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-request-id': correlationId
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === 200;
        const responseData = success ? JSON.parse(data) : null;
        
        if (success && responseData && responseData.data && responseData.data.sessionId) {
          const key = `${TEST_PRODUCT_ID}_${TEST_SIZE}`;
          if (successfulReservations.has(key)) {
            console.log(`🚨 RACE CONDITION DETECTED: Multiple reservations for ${key}`);
            console.log(`   Previous: ${successfulReservations.get(key)}`);
            console.log(`   Current: ${correlationId}`);
          } else {
            successfulReservations.set(key, correlationId);
            console.log(`✅ Reservation successful: ${correlationId}`);
          }
        } else {
          console.log(`❌ Request failed: ${correlationId} (HTTP ${res.statusCode})`);
        }
        
        resolve({ success, correlationId, statusCode: res.statusCode });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Request error: ${correlationId} - ${err.message}`);
      resolve({ success: false, correlationId, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function runRaceConditionTest() {
  console.log('🧪 Running Simple Stock Race Condition Test');
  console.log('==========================================');
  console.log(`Product ID: ${TEST_PRODUCT_ID}`);
  console.log(`Size: ${TEST_SIZE}`);
  console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log('');

  const startTime = performance.now();
  
  // Make concurrent requests
  const promises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    promises.push(makeCheckoutRequest(i));
  }

  console.log('🚀 Sending concurrent requests...');
  const results = await Promise.all(promises);
  
  const endTime = performance.now();
  const duration = endTime - startTime;

  // Analyze results
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const raceConditions = successfulReservations.size > 1 ? 1 : 0;

  console.log('');
  console.log('📊 TEST RESULTS');
  console.log('===============');
  console.log(`Duration: ${duration.toFixed(2)}ms`);
  console.log(`Successful requests: ${successful}`);
  console.log(`Failed requests: ${failed}`);
  console.log(`Unique successful reservations: ${successfulReservations.size}`);
  console.log(`Race conditions detected: ${raceConditions}`);

  if (raceConditions > 0) {
    console.log('');
    console.log('❌ CRITICAL: Race conditions detected!');
    console.log('   Multiple successful reservations for the same SKU');
    console.log('   This indicates check-then-write race conditions');
    console.log('   Fix required: Use atomic operations');
    process.exit(1);
  } else {
    console.log('');
    console.log('✅ SUCCESS: No race conditions detected');
    console.log('   Stock operations appear to be atomic');
    process.exit(0);
  }
}

// Run the test
runRaceConditionTest().catch(console.error);
