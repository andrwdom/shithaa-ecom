/**
 * K6 RACE CONDITION TEST
 * 
 * This script tests for race conditions in stock operations by simulating
 * concurrent requests for the same product/size combination.
 * 
 * EXPECTED BEHAVIOR: Only ONE request should succeed (return 201) per SKU
 * FAILURE INDICATOR: Multiple 201 responses for the same SKU indicates race condition
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const stockRaceCondition = new Rate('stock_race_condition');
const stockSuccess = new Rate('stock_success');

export let options = {
  stages: [
    { duration: '30s', target: 200 }, // Ramp up to 200 VUs
    { duration: '60s', target: 200 }, // Stay at 200 VUs for 1 minute
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'stock_race_condition': ['rate<0.01'], // Less than 1% race conditions
    'stock_success': ['rate>0.95'],       // More than 95% success rate
    'http_req_duration': ['p(95)<2000'],  // 95% of requests under 2s
  },
};

// Test data - using a specific product that we know exists
const TEST_PRODUCT_ID = '507f1f77bcf86cd799439011'; // Replace with actual product ID
const TEST_SIZE = 'M';
const TEST_QUANTITY = 1;

// Track successful reservations per product/size combination
const successfulReservations = new Map();

export default function() {
  const correlationId = `k6_${__VU}_${__ITER}_${Date.now()}`;
  
  // Create checkout session with stock reservation
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
    email: `test_${__VU}_${__ITER}@example.com`
  };

  const headers = {
    'Content-Type': 'application/json',
    'x-request-id': correlationId
  };

  // Step 1: Create checkout session (this should reserve stock)
  const createResponse = http.post('http://localhost:3000/api/checkout/session', 
    JSON.stringify(checkoutPayload), 
    { headers }
  );

  const createSuccess = check(createResponse, {
    'checkout session created': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  if (createSuccess) {
    const sessionData = JSON.parse(createResponse.body);
    const sessionId = sessionData.data.sessionId;
    
    if (sessionId) {
      // Track successful reservation
      const key = `${TEST_PRODUCT_ID}_${TEST_SIZE}`;
      if (successfulReservations.has(key)) {
        // RACE CONDITION DETECTED: Multiple successful reservations for same SKU
        console.log(`🚨 RACE CONDITION DETECTED: Multiple reservations for ${key}`);
        console.log(`   Previous reservation: ${successfulReservations.get(key)}`);
        console.log(`   Current reservation: ${correlationId}`);
        stockRaceCondition.add(1);
      } else {
        successfulReservations.set(key, correlationId);
        stockSuccess.add(1);
      }

      // Step 2: Try to reserve stock again (should fail due to insufficient stock)
      const reserveResponse = http.post(`http://localhost:3000/api/checkout/session/${sessionId}/reserve-stock`, 
        JSON.stringify({}), 
        { headers }
      );

      check(reserveResponse, {
        'stock reservation handled': (r) => r.status === 200 || r.status === 409,
        'stock reservation response time < 1s': (r) => r.timings.duration < 1000,
      });

      // Step 3: Cancel session to release stock
      const cancelResponse = http.delete(`http://localhost:3000/api/checkout/session/${sessionId}`, 
        { headers }
      );

      check(cancelResponse, {
        'session cancelled': (r) => r.status === 200,
        'cancel response time < 1s': (r) => r.timings.duration < 1000,
      });
    }
  } else {
    // Request failed - this is expected for some requests due to stock limits
    console.log(`❌ Checkout session creation failed: ${createResponse.status} - ${createResponse.body}`);
  }

  // Small delay to prevent overwhelming the system
  sleep(0.1);
}

export function handleSummary(data) {
  const raceConditions = data.metrics.stock_race_condition?.values?.rate || 0;
  const successRate = data.metrics.stock_success?.values?.rate || 0;
  
  console.log('\n🚨 RACE CONDITION TEST RESULTS:');
  console.log('================================');
  console.log(`Race Conditions Detected: ${(raceConditions * 100).toFixed(2)}%`);
  console.log(`Success Rate: ${(successRate * 100).toFixed(2)}%`);
  console.log(`Total Requests: ${data.metrics.http_reqs?.values?.count || 0}`);
  
  if (raceConditions > 0.01) {
    console.log('\n❌ CRITICAL: Race conditions detected!');
    console.log('   Multiple successful reservations for the same SKU');
    console.log('   This indicates check-then-write race conditions');
    console.log('   Fix required: Use atomic operations');
  } else {
    console.log('\n✅ SUCCESS: No race conditions detected');
    console.log('   Stock operations are properly atomic');
  }
  
  return {
    'race-condition-test-results.json': JSON.stringify(data, null, 2),
  };
}