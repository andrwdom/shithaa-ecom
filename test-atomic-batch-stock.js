import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const stockOversellRate = new Rate('stock_oversell_rate');
const successfulReservations = new Rate('successful_reservations');

export let options = {
  vus: 100, // Simulate 100 concurrent users
  duration: '30s',
  thresholds: {
    'stock_oversell_rate': ['rate<0.01'], // Less than 1% overselling
    'successful_reservations': ['rate>0.01'], // At least 1% success rate
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
  },
};

// Test data - replace with actual product ID from your database
const TEST_PRODUCT_ID = '507f1f77bcf86cd799439011'; // Replace with actual product ID
const TEST_SIZE = 'M';
const TEST_QUANTITY = 1;

export function setup() {
  // Setup: Set stock to 1 for test product
  console.log('Setting up test: Setting stock to 1 for test product');
  
  // You can add a setup request here to set the test product stock to 1
  // This would typically be done via an admin API or direct database update
  
  return {
    productId: TEST_PRODUCT_ID,
    size: TEST_SIZE,
    quantity: TEST_QUANTITY
  };
}

export default function (data) {
  const payload = JSON.stringify({
    items: [{
      productId: data.productId,
      size: data.size,
      quantity: data.quantity
    }],
    email: `test-${__VU}-${__ITER}@example.com`,
    orderSummary: {
      total: 100,
      subtotal: 100,
      shipping: 0
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': `test-${__VU}-${__ITER}-${Date.now()}`
    },
  };

  const response = http.post('http://localhost:4000/api/checkout/session', payload, params);
  
  const checks = check(response, {
    'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
    'response time < 5s': (r) => r.timings.duration < 5000,
    'has response body': (r) => r.body && r.body.length > 0,
  });

  // Track success rate
  if (response.status === 200) {
    successfulReservations.add(1);
    console.log(`✅ SUCCESS: VU ${__VU} - Reservation successful`);
  } else if (response.status === 400) {
    successfulReservations.add(0);
    console.log(`❌ FAILED: VU ${__VU} - ${response.body}`);
  } else {
    successfulReservations.add(0);
    console.log(`⚠️ ERROR: VU ${__VU} - Status ${response.status}: ${response.body}`);
  }

  // Check for overselling (this would need to be verified via database query)
  // For now, we'll assume 400 status means no overselling
  if (response.status === 400) {
    stockOversellRate.add(0); // No overselling
  } else {
    stockOversellRate.add(1); // Potential overselling if we get 200 when we shouldn't
  }

  return response;
}

export function teardown(data) {
  console.log('Test completed. Check MongoDB to verify no overselling occurred.');
  console.log('Expected: Only 1 successful reservation, others should fail with 400 status');
}
