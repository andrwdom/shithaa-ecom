/**
 * K6 Load Test: Stock Oversell Race Condition Reproduction
 * 
 * This test demonstrates overselling by simulating N concurrent users
 * attempting to reserve the last few items in stock.
 * 
 * BEFORE FIX: Will show overselling (reserved > initial stock)
 * AFTER FIX: Will show NO overselling (reserved <= initial stock)
 * 
 * Usage:
 *   k6 run k6-race-stock.js
 *   k6 run --vus 50 --iterations 50 k6-race-stock.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const oversellDetected = new Counter('oversell_detected');
const reservationSuccess = new Counter('reservation_success');
const reservationFailure = new Counter('reservation_failure');
const oversellRate = new Rate('oversell_rate');
const stockCheckTime = new Trend('stock_check_duration');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Moderate concurrency (realistic load)
    moderate_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30s',
      tags: { scenario: 'moderate' },
    },
    // Scenario 2: High concurrency burst (stress test)
    burst_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },  // Ramp to 50 VUs
        { duration: '30s', target: 50 },  // Hold at 50 VUs
        { duration: '10s', target: 0 },   // Ramp down
      ],
      startTime: '40s', // Start after moderate load
      tags: { scenario: 'burst' },
    },
  },
  thresholds: {
    'oversell_detected': ['count==0'],       // CRITICAL: Must be zero
    'http_req_failed': ['rate<0.05'],        // Less than 5% errors
    'http_req_duration': ['p(95)<3000'],     // 95% under 3s
    'stock_check_duration': ['p(90)<500'],   // Stock checks fast
  },
};

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const PRODUCT_ID = __ENV.PRODUCT_ID || null;
const INITIAL_STOCK = parseInt(__ENV.INITIAL_STOCK) || 10;
const VU_QUANTITY = parseInt(__ENV.VU_QUANTITY) || 1;

/**
 * Setup: Create test product with limited stock
 */
export function setup() {
  console.log('🚀 Setting up stock race condition test...');
  
  // Create or update test product
  const setupPayload = {
    name: 'K6 Test Product - Race Condition',
    sizes: [
      {
        size: 'M',
        stock: INITIAL_STOCK,
        reserved: 0
      }
    ],
    price: 1000,
    category: 'test',
    description: 'Test product for k6 race condition testing'
  };

  const setupRes = http.post(
    `${BASE_URL}/api/test/create-stock-test-product`,
    JSON.stringify(setupPayload),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (setupRes.status !== 200 && setupRes.status !== 201) {
    console.error(`❌ Setup failed: ${setupRes.status} - ${setupRes.body}`);
    throw new Error(`Setup failed with status ${setupRes.status}`);
  }

  const setupData = JSON.parse(setupRes.body);
  const productId = setupData.productId || setupData.data?.productId || PRODUCT_ID;

  if (!productId) {
    throw new Error('Failed to get product ID from setup response');
  }

  console.log(`✅ Test product created: ${productId}`);
  console.log(`   Initial stock: ${INITIAL_STOCK} units (size M)`);
  console.log(`   Each VU will try to reserve: ${VU_QUANTITY} unit(s)`);
  console.log(`   Expected max reservations: ${INITIAL_STOCK}`);
  console.log('');

  return {
    productId,
    size: 'M',
    initialStock: INITIAL_STOCK,
    quantity: VU_QUANTITY
  };
}

/**
 * Main test: Each VU attempts to reserve stock
 */
export default function(data) {
  const vuId = __VU;
  const iterationId = __ITER;
  
  group('Stock Reservation Flow', function() {
    // Step 1: Check stock availability
    const checkStart = Date.now();
    const checkRes = http.get(
      `${BASE_URL}/api/stock/availability/${data.productId}?size=${data.size}`,
      {
        tags: { operation: 'check_availability' }
      }
    );
    stockCheckTime.add(Date.now() - checkStart);

    const stockAvailable = check(checkRes, {
      'stock check returns 200': (r) => r.status === 200,
    });

    if (!stockAvailable) {
      console.error(`[VU ${vuId}] ❌ Stock check failed: ${checkRes.status}`);
      return;
    }

    const stockData = JSON.parse(checkRes.body);
    const available = stockData.available || stockData.data?.available || 0;

    // Step 2: Attempt reservation
    const reservePayload = {
      productId: data.productId,
      size: data.size,
      quantity: data.quantity,
      sessionId: `k6_session_${vuId}_${iterationId}`,
      correlationId: `k6_${vuId}_${iterationId}_${Date.now()}`
    };

    const reserveRes = http.post(
      `${BASE_URL}/api/stock/reserve`,
      JSON.stringify(reservePayload),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { operation: 'reserve_stock' }
      }
    );

    const reserved = check(reserveRes, {
      'reservation completes': (r) => r.status === 200 || r.status === 409,
      'no server errors': (r) => r.status !== 500,
    });

    if (reserveRes.status === 200) {
      const body = JSON.parse(reserveRes.body);
      if (body.success) {
        reservationSuccess.add(1);
        console.log(`[VU ${vuId}] ✅ Reserved ${data.quantity} unit(s) (stock was ${available})`);
      } else {
        reservationFailure.add(1);
        console.log(`[VU ${vuId}] ❌ Reservation failed: ${body.message || 'Unknown error'}`);
      }
    } else if (reserveRes.status === 409) {
      reservationFailure.add(1);
      const body = JSON.parse(reserveRes.body);
      console.log(`[VU ${vuId}] ℹ️ Insufficient stock (expected): ${body.message || 'Out of stock'}`);
    } else {
      console.error(`[VU ${vuId}] ⚠️ Unexpected status: ${reserveRes.status}`);
    }

    // Random delay to simulate realistic user behavior
    sleep(randomIntBetween(1, 3));

    // Step 3: Occasionally cancel reservation (simulate cart abandonment)
    if (reserveRes.status === 200 && Math.random() < 0.2) {
      const releaseRes = http.post(
        `${BASE_URL}/api/stock/release`,
        JSON.stringify({
          productId: data.productId,
          size: data.size,
          quantity: data.quantity,
          sessionId: reservePayload.sessionId
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { operation: 'release_stock' }
        }
      );

      console.log(`[VU ${vuId}] 🔄 Released reservation (simulated abandonment)`);
    }
  });

  sleep(1);
}

/**
 * Teardown: Verify no overselling occurred
 */
export function teardown(data) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 STOCK RACE CONDITION TEST RESULTS');
  console.log('='.repeat(60) + '\n');

  // Wait for all async operations to complete
  sleep(3);

  // Fetch final stock state
  const stockRes = http.get(`${BASE_URL}/api/products/${data.productId}`);
  
  if (stockRes.status !== 200) {
    console.error(`❌ Failed to fetch final stock state: ${stockRes.status}`);
    return;
  }

  const product = JSON.parse(stockRes.body);
  const productData = product.data || product;
  const sizeObj = productData.sizes?.find(s => s.size === data.size);
  
  if (!sizeObj) {
    console.error(`❌ Size ${data.size} not found in product`);
    return;
  }

  // Calculate metrics
  const finalStock = sizeObj.stock;
  const finalReserved = sizeObj.reserved || 0;
  const finalAvailable = finalStock - finalReserved;
  const totalConsumed = data.initialStock - finalStock;
  const successfulReservations = reservationSuccess.count;
  const failedReservations = reservationFailure.count;
  const totalAttempts = successfulReservations + failedReservations;

  console.log('📦 INITIAL STATE:');
  console.log(`   Stock: ${data.initialStock} units`);
  console.log(`   Reserved: 0 units`);
  console.log(`   Available: ${data.initialStock} units`);
  console.log('');

  console.log('📦 FINAL STATE:');
  console.log(`   Stock: ${finalStock} units`);
  console.log(`   Reserved: ${finalReserved} units`);
  console.log(`   Available: ${finalAvailable} units`);
  console.log('');

  console.log('📈 OPERATIONS:');
  console.log(`   Total Attempts: ${totalAttempts}`);
  console.log(`   Successful: ${successfulReservations}`);
  console.log(`   Failed: ${failedReservations}`);
  console.log(`   Success Rate: ${Math.round((successfulReservations / totalAttempts) * 100)}%`);
  console.log('');

  // CRITICAL: Check for overselling
  const expectedMaxReserved = data.initialStock;
  const actualReserved = finalReserved;
  
  console.log('🔍 OVERSELL DETECTION:');
  console.log(`   Expected Max Reserved: ${expectedMaxReserved}`);
  console.log(`   Actual Reserved: ${actualReserved}`);
  
  if (actualReserved > expectedMaxReserved) {
    const oversold = actualReserved - expectedMaxReserved;
    console.error(`\n❌❌❌ OVERSELLING DETECTED ❌❌❌`);
    console.error(`   ${oversold} units oversold!`);
    console.error(`   Reserved: ${actualReserved} > Initial Stock: ${expectedMaxReserved}`);
    console.error('');
    console.error('🚨 CRITICAL: Atomic operations are NOT working correctly!');
    console.error('🚨 This will cause customer complaints and revenue loss.');
    console.error('');
    oversellDetected.add(oversold);
    oversellRate.add(1);
  } else {
    console.log(`\n✅✅✅ NO OVERSELLING DETECTED ✅✅✅`);
    console.log(`   Reserved ${actualReserved} <= Initial Stock ${expectedMaxReserved}`);
    console.log(`   System correctly prevented overselling!`);
    console.log('');
    oversellRate.add(0);
  }

  // Check for negative stock
  if (finalStock < 0) {
    console.error(`\n❌ NEGATIVE STOCK DETECTED: ${finalStock}`);
    console.error('🚨 This should NEVER happen!');
  }

  // Check invariant: stock + reserved >= 0
  if (finalStock + finalReserved < 0) {
    console.error(`\n❌ INVARIANT VIOLATION: stock(${finalStock}) + reserved(${finalReserved}) < 0`);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('');

  // Cleanup test product
  const cleanupRes = http.del(`${BASE_URL}/api/test/cleanup-product/${data.productId}`);
  if (cleanupRes.status === 200) {
    console.log('✅ Test product cleaned up');
  }
}

/**
 * Handle summary (k6 built-in)
 */
export function handleSummary(data) {
  const oversellCount = data.metrics.oversell_detected?.values?.count || 0;
  const oversellRateValue = data.metrics.oversell_rate?.values?.rate || 0;
  
  return {
    'stdout': JSON.stringify({
      summary: 'Stock Race Condition Test',
      passed: oversellCount === 0,
      oversellDetected: oversellCount > 0,
      oversellUnits: oversellCount,
      oversellRate: oversellRateValue,
      reservations: {
        success: data.metrics.reservation_success?.values?.count || 0,
        failure: data.metrics.reservation_failure?.values?.count || 0,
      },
      performance: {
        avgCheckTime: data.metrics.stock_check_duration?.values?.avg || 0,
        p95Duration: data.metrics.http_req_duration?.values['p(95)'] || 0,
      },
      recommendation: oversellCount === 0 
        ? '✅ SAFE TO DEPLOY - No overselling detected'
        : '❌ DO NOT DEPLOY - Fix atomic operations first'
    }, null, 2),
  };
}
