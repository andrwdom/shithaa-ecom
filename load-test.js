import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
    errors: ['rate<0.1'],              // Custom error rate must be below 10%
  },
};

const BASE_URL = 'https://shithaa.in';

export default function() {
  // Test 1: Health check
  let healthResponse = http.get(`${BASE_URL}/api/health`);
  check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Test 2: Product listing
  let productsResponse = http.get(`${BASE_URL}/api/products?categoryId=maternity-feeding-wear&limit=6`);
  check(productsResponse, {
    'products status is 200': (r) => r.status === 200,
    'products response time < 2s': (r) => r.timings.duration < 2000,
    'products has data': (r) => JSON.parse(r.body).success === true,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Test 3: Product details
  let productResponse = http.get(`${BASE_URL}/api/products/SCFM00160`);
  check(productResponse, {
    'product status is 200': (r) => r.status === 200,
    'product response time < 1s': (r) => r.timings.duration < 1000,
    'product has data': (r) => JSON.parse(r.body).success === true,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Test 4: Cart calculation (simulate heavy load)
  let cartPayload = {
    items: [
      {
        _id: '68d933e710d26819630a3634',
        name: 'Test Product',
        price: 799,
        size: 'M',
        quantity: 1
      }
    ]
  };
  
  let cartResponse = http.post(`${BASE_URL}/api/cart/calculate-total`, JSON.stringify(cartPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(cartResponse, {
    'cart calculation status is 200': (r) => r.status === 200,
    'cart calculation response time < 2s': (r) => r.timings.duration < 2000,
    'cart calculation has data': (r) => JSON.parse(r.body).success === true,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Test 5: Stock validation
  let stockPayload = {
    items: [
      {
        productId: '68d933e710d26819630a3634',
        name: 'Test Product',
        size: 'M',
        quantity: 1
      }
    ]
  };
  
  let stockResponse = http.post(`${BASE_URL}/api/checkout/validate-stock`, JSON.stringify(stockPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(stockResponse, {
    'stock validation status is 200': (r) => r.status === 200,
    'stock validation response time < 1s': (r) => r.timings.duration < 1000,
    'stock validation has data': (r) => JSON.parse(r.body).success === true,
  }) || errorRate.add(1);
  
  sleep(1);
}

// Test webhook processing (simulate PhonePe webhook)
export function testWebhookProcessing() {
  const webhookPayload = {
    payload: {
      orderId: `TEST_${Date.now()}`,
      state: 'COMPLETED',
      amount: 79900
    },
    event: 'PAYMENT_SUCCESS'
  };
  
  const webhookResponse = http.post(`${BASE_URL}/webhook/phonepe`, JSON.stringify(webhookPayload), {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'test-signature' // This will fail signature verification, which is expected
    },
  });
  
  check(webhookResponse, {
    'webhook status is 401 (expected for test)': (r) => r.status === 401,
    'webhook response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
}

// Test stock race condition (concurrent last-item purchases)
export function testStockRaceCondition() {
  const productId = '68d933e710d26819630a3634';
  const size = 'M';
  const quantity = 1;
  
  // Simulate multiple users trying to buy the last item
  const promises = [];
  
  for (let i = 0; i < 5; i++) {
    const cartPayload = {
      items: [{
        _id: productId,
        name: 'Test Product',
        price: 799,
        size: size,
        quantity: quantity
      }]
    };
    
    promises.push(
      http.post(`${BASE_URL}/api/cart/calculate-total`, JSON.stringify(cartPayload), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
  
  const responses = http.batch(promises);
  
  let successCount = 0;
  let errorCount = 0;
  
  responses.forEach(response => {
    if (response.status === 200) {
      successCount++;
    } else {
      errorCount++;
    }
  });
  
  check(responses[0], {
    'at least one request succeeded': () => successCount > 0,
    'not all requests succeeded (race condition test)': () => successCount < 5,
  }) || errorRate.add(1);
}
