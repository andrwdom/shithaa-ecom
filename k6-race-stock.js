import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';

export let options = {
  vus: 200,          // 200 concurrent virtual users
  duration: '30s',   // 30 seconds test duration
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95th percentile under 2s
    http_req_failed: ['rate<0.1']      // Less than 10% failures
  }
};

// Configuration - UPDATE THESE VALUES
const BASE_URL = 'https://your-backend.example'; // Replace with your backend URL
const TEST_PRODUCT_ID = 'SCFL00186'; // Replace with a real product ID that has stock = 1
const TEST_SIZE = 'XL'; // Replace with a real size

// Test payload for checkout session creation
const CHECKOUT_PAYLOAD = JSON.stringify({
  source: 'buynow',
  items: [{
    productId: TEST_PRODUCT_ID,
    size: TEST_SIZE,
    quantity: 1,
    price: 499,
    name: 'Test Product',
    image: 'test-image.jpg'
  }],
  email: 'test@example.com',
  orderSummary: {
    subtotal: 499,
    offerDiscount: 0,
    shipping: 0,
    total: 499
  }
});

const headers = {
  'Content-Type': 'application/json',
  'X-Request-ID': `race_test_${__VU}_${__ITER}`
};

export default function () {
  const correlationId = `race_${__VU}_${__ITER}_${Date.now()}`;
  
  // Step 1: Create checkout session (this should reserve stock atomically)
  const sessionResponse = http.post(`${BASE_URL}/api/checkout/session`, CHECKOUT_PAYLOAD, {
    headers: {
      ...headers,
      'X-Request-ID': correlationId
    }
  });

  // Check if session creation was successful
  const sessionSuccess = check(sessionResponse, {
    'checkout session created': (r) => r.status === 200 || r.status === 201,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has sessionId': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success && data.data && data.data.sessionId;
      } catch (e) {
        return false;
      }
    }
  });

  if (sessionSuccess) {
    try {
      const sessionData = JSON.parse(sessionResponse.body);
      const sessionId = sessionData.data.sessionId;
      
      // Step 2: Create payment session (this should create draft order)
      const paymentPayload = JSON.stringify({
        checkoutSessionId: sessionId,
        shipping: {
          fullName: 'Test User',
          phone: '9876543210',
          addressLine1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        email: 'test@example.com'
      });

      const paymentResponse = http.post(`${BASE_URL}/api/payment/phonepe/create-session`, paymentPayload, {
        headers: {
          ...headers,
          'X-Request-ID': correlationId
        }
      });

      check(paymentResponse, {
        'payment session created': (r) => r.status === 200 || r.status === 201,
        'has orderId': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.success && data.orderId;
          } catch (e) {
            return false;
          }
        }
      });

    } catch (e) {
      console.error(`[${correlationId}] Error processing session:`, e);
    }
  }

  // Small delay to prevent overwhelming the system
  sleep(0.1);
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const successfulRequests = data.metrics.checks.values.rate * totalRequests;
  const failedRequests = totalRequests - successfulRequests;
  
  const summary = {
    'Total Requests': totalRequests,
    'Successful Requests': Math.round(successfulRequests),
    'Failed Requests': Math.round(failedRequests),
    'Success Rate': `${(data.metrics.checks.values.rate * 100).toFixed(2)}%`,
    'Average Response Time': `${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
    '95th Percentile': `${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`
  };

  console.log('\n=== RACE CONDITION TEST RESULTS ===');
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  // CRITICAL: Only 1 successful checkout should happen for stock=1
  if (successfulRequests > 1) {
    console.log('\n❌ CRITICAL FAILURE: Multiple successful checkouts detected!');
    console.log('This indicates a race condition in stock reservation.');
    console.log('Expected: 1 successful checkout, Got:', Math.round(successfulRequests));
  } else if (successfulRequests === 1) {
    console.log('\n✅ SUCCESS: Only 1 checkout succeeded as expected');
  } else {
    console.log('\n⚠️  WARNING: No successful checkouts - check if product has stock');
  }

  return {
    'race-test-results.json': JSON.stringify(summary, null, 2)
  };
}
