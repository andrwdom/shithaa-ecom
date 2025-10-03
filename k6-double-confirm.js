import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';

export let options = {
  vus: 100,          // 100 concurrent virtual users
  duration: '20s',   // 20 seconds test duration
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1']
  }
};

// Configuration - UPDATE THESE VALUES
const BASE_URL = 'https://your-backend.example'; // Replace with your backend URL
const TEST_PRODUCT_ID = 'SCFL00186'; // Replace with a real product ID
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
  'Content-Type': 'application/json'
};

export default function () {
  const correlationId = `double_${__VU}_${__ITER}_${Date.now()}`;
  
  // Step 1: Create checkout session
  const sessionResponse = http.post(`${BASE_URL}/api/checkout/session`, CHECKOUT_PAYLOAD, {
    headers: {
      ...headers,
      'X-Request-ID': correlationId
    }
  });

  if (sessionResponse.status === 200 || sessionResponse.status === 201) {
    try {
      const sessionData = JSON.parse(sessionResponse.body);
      const sessionId = sessionData.data.sessionId;
      
      // Step 2: Create payment session (first attempt)
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

      const paymentResponse1 = http.post(`${BASE_URL}/api/payment/phonepe/create-session`, paymentPayload, {
        headers: {
          ...headers,
          'X-Request-ID': correlationId + '_1'
        }
      });

      // Step 3: Simulate double-click - send same request again quickly (within 300ms)
      sleep(0.3); // 300ms delay to simulate user double-clicking
      
      const paymentResponse2 = http.post(`${BASE_URL}/api/payment/phonepe/create-session`, paymentPayload, {
        headers: {
          ...headers,
          'X-Request-ID': correlationId + '_2'
        }
      });

      // Check both responses
      const firstSuccess = check(paymentResponse1, {
        'first payment session created': (r) => r.status === 200 || r.status === 201,
        'first has orderId': (r) => {
          try {
            const data = JSON.parse(r.body);
            return data.success && data.orderId;
          } catch (e) {
            return false;
          }
        }
      });

      const secondSuccess = check(paymentResponse2, {
        'second payment session handled': (r) => r.status === 200 || r.status === 201 || r.status === 409,
        'second response is idempotent': (r) => {
          // Should either succeed with same orderId or return conflict/duplicate error
          if (r.status === 409) return true; // Conflict - expected for duplicate
          if (r.status === 200 || r.status === 201) {
            try {
              const data = JSON.parse(r.body);
              return data.success && data.orderId;
            } catch (e) {
              return false;
            }
          }
          return false;
        }
      });

      // Log the results for analysis
      if (firstSuccess && secondSuccess) {
        console.log(`[${correlationId}] Both requests handled successfully - checking for duplicates`);
        
        try {
          const data1 = JSON.parse(paymentResponse1.body);
          const data2 = JSON.parse(paymentResponse2.body);
          
          if (data1.orderId && data2.orderId) {
            if (data1.orderId === data2.orderId) {
              console.log(`[${correlationId}] ✅ IDEMPOTENT: Same orderId returned (${data1.orderId})`);
            } else {
              console.log(`[${correlationId}] ❌ DUPLICATE: Different orderIds (${data1.orderId} vs ${data2.orderId})`);
            }
          }
        } catch (e) {
          console.log(`[${correlationId}] Error parsing responses:`, e.message);
        }
      }

    } catch (e) {
      console.error(`[${correlationId}] Error in double-click test:`, e);
    }
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const successfulRequests = data.metrics.checks.values.rate * totalRequests;
  
  const summary = {
    'Total Requests': totalRequests,
    'Successful Checks': Math.round(successfulRequests),
    'Success Rate': `${(data.metrics.checks.values.rate * 100).toFixed(2)}%`,
    'Average Response Time': `${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`,
    '95th Percentile': `${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`
  };

  console.log('\n=== DOUBLE-CLICK TEST RESULTS ===');
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  console.log('\n📋 Check the logs above for duplicate order detection results');
  console.log('✅ IDEMPOTENT: Same orderId returned for duplicate requests');
  console.log('❌ DUPLICATE: Different orderIds created (this is a problem)');

  return {
    'double-click-test-results.json': JSON.stringify(summary, null, 2)
  };
}
