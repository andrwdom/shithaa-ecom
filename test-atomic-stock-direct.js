import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: 50, // 50 concurrent users
  duration: '10s',
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'http_req_failed': ['rate<0.1'], // Less than 10% failures
  },
};

export default function () {
  // Test the atomic stock reservation endpoint directly
  const payload = JSON.stringify({
    items: [{
      productId: '507f1f77bcf86cd799439011', // Replace with actual product ID
      size: 'M',
      quantity: 1
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
  
  const success = check(response, {
    'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has response body': (r) => r.body && r.body.length > 0,
  });

  if (response.status === 200) {
    console.log(`✅ SUCCESS: VU ${__VU} - Reservation successful`);
  } else if (response.status === 400) {
    console.log(`❌ FAILED: VU ${__VU} - Insufficient stock (expected)`);
  } else {
    console.log(`⚠️ ERROR: VU ${__VU} - Status ${response.status}: ${response.body}`);
  }

  return response;
}
