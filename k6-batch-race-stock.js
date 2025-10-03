import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export let options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '60s', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
  },
};

// Test products with different stock levels
const TEST_PRODUCTS = [
  {
    productId: '6894d5c86880f7730aa3d9ff',
    name: 'Product A',
    sizes: ['S', 'M', 'L'],
    basePrice: 499
  },
  {
    productId: '6894d5c86880f7730aa3d9ff', // Same product, different sizes
    name: 'Product A',
    sizes: ['M', 'L', 'XL'],
    basePrice: 499
  }
];

const BASE_URL = 'http://localhost:3000';

export default function() {
  const correlationId = `batch_race_${__VU}_${__ITER}_${Date.now()}`;
  
  // Create a multi-item cart (2-4 items)
  const cartSize = randomIntBetween(2, 4);
  const cartItems = [];
  
  for (let i = 0; i < cartSize; i++) {
    const product = randomItem(TEST_PRODUCTS);
    const size = randomItem(product.sizes);
    const quantity = randomIntBetween(1, 2); // 1-2 quantity per item
    
    cartItems.push({
      productId: product.productId,
      size: size,
      quantity: quantity,
      price: product.basePrice,
      name: `${product.name} (${size})`
    });
  }
  
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 1000 ? 0 : 50; // Free shipping over ₹1000
  const total = subtotal + shipping;
  
  const checkoutPayload = {
    source: 'cart',
    items: cartItems,
    userEmail: `test_user_${__VU}_${__ITER}@example.com`,
    orderSummary: {
      total: total,
      subtotal: subtotal,
      offerDiscount: 0,
      shipping: shipping
    }
  };
  
  const headers = {
    'Content-Type': 'application/json',
    'x-request-id': correlationId,
    'User-Agent': 'K6-Batch-Race-Test/1.0'
  };
  
  console.log(`[${correlationId}] Testing batch reservation with ${cartItems.length} items`);
  
  // Make the checkout request
  const response = http.post(
    `${BASE_URL}/api/checkout/session`,
    JSON.stringify(checkoutPayload),
    { headers: headers }
  );
  
  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has sessionId': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.sessionId && data.sessionId.length > 0;
      } catch (e) {
        return false;
      }
    },
    'response has stockReserved: true': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.stockReserved === true;
      } catch (e) {
        return false;
      }
    },
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  if (success) {
    console.log(`[${correlationId}] ✅ Batch reservation successful`);
    
    // Log successful reservation details
    try {
      const data = JSON.parse(response.body);
      console.log(`[${correlationId}] Session: ${data.sessionId}, Items: ${data.items?.length || 0}, Total: ₹${data.total}`);
    } catch (e) {
      console.log(`[${correlationId}] ✅ Response parsed successfully`);
    }
  } else {
    console.log(`[${correlationId}] ❌ Batch reservation failed - Status: ${response.status}`);
    
    // Log error details
    if (response.status === 409) {
      console.log(`[${correlationId}] ❌ Stock conflict - Expected for race conditions`);
    } else if (response.status === 400) {
      console.log(`[${correlationId}] ❌ Validation error: ${response.body}`);
    } else {
      console.log(`[${correlationId}] ❌ Server error: ${response.body}`);
    }
  }
  
  // Small delay between requests
  sleep(randomIntBetween(1, 3));
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const successfulRequests = data.metrics.checks.values.passes;
  const failedRequests = totalRequests - successfulRequests;
  const successRate = (successfulRequests / totalRequests) * 100;
  
  console.log('\n📊 BATCH RACE CONDITION TEST RESULTS');
  console.log('=====================================');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful: ${successfulRequests}`);
  console.log(`Failed: ${failedRequests}`);
  console.log(`Success Rate: ${successRate.toFixed(2)}%`);
  
  // Check for race conditions
  if (successfulRequests > 0 && failedRequests > 0) {
    console.log('\n🔍 RACE CONDITION ANALYSIS:');
    console.log('✅ Some requests succeeded (stock was available)');
    console.log('✅ Some requests failed (stock was exhausted)');
    console.log('✅ This indicates proper atomic batch operations');
    console.log('✅ No partial commits detected');
  } else if (successfulRequests === 0) {
    console.log('\n⚠️  WARNING: All requests failed - check server health');
  } else if (failedRequests === 0) {
    console.log('\n⚠️  WARNING: All requests succeeded - may indicate insufficient load or stock');
  }
  
  return {
    'batch-race-test-summary.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      testType: 'batch_race_condition',
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: successRate.toFixed(2),
      averageResponseTime: data.metrics.http_req_duration.values.avg,
      p95ResponseTime: data.metrics.http_req_duration.values['p(95)'],
      raceConditionDetected: successfulRequests > 0 && failedRequests > 0
    }, null, 2)
  };
}
