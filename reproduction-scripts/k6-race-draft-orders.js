import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://shithaa.in';

export let options = {
  stages: [
    { duration: '30s', target: 5 },  // Ramp up
    { duration: '1m', target: 20 },  // Stay at 20 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.2'],
  },
};

export default function() {
  // Test draft order creation race condition
  const productId = '68d933e710d26819630a3634'; // Replace with actual product ID
  const size = 'M';
  const quantity = 1;
  
  // Create checkout session first
  const sessionPayload = {
    items: [{
      _id: productId,
      name: 'Test Product',
      price: 799,
      size: size,
      quantity: quantity
    }]
  };
  
  const sessionResponse = http.post(`${BASE_URL}/api/checkout/create-session`, JSON.stringify(sessionPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (sessionResponse.status !== 200) {
    console.log('Failed to create checkout session');
    return;
  }
  
  const sessionData = JSON.parse(sessionResponse.body);
  const sessionId = sessionData.sessionId;
  
  // Now simulate multiple concurrent payment initiations
  const promises = [];
  
  for (let i = 0; i < 5; i++) {
    const paymentPayload = {
      sessionId: sessionId,
      amount: 799,
      currency: 'INR',
      merchantTransactionId: `test_${Date.now()}_${i}`,
      redirectUrl: 'https://shithaa.in/payment/success',
      callbackUrl: 'https://shithaa.in/api/payment/phonepe/callback'
    };
    
    promises.push(
      http.post(`${BASE_URL}/api/payment/phonepe/create-session`, JSON.stringify(paymentPayload), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
  
  const responses = http.batch(promises);
  
  let successCount = 0;
  let duplicateOrderCount = 0;
  
  responses.forEach(response => {
    if (response.status === 200) {
      successCount++;
      const data = JSON.parse(response.body);
      if (data.orderId) {
        duplicateOrderCount++;
      }
    }
  });
  
  // This test will PASS if race condition exists (multiple draft orders created)
  // This test will FAIL if race condition is fixed (only one draft order created)
  check(responses[0], {
    'at least one payment session created': () => successCount > 0,
    'race condition detected (multiple draft orders)': () => duplicateOrderCount > 1,
  }) || errorRate.add(1);
  
  sleep(2);
}

export function testDraftOrderRace() {
  const productId = '68d933e710d26819630a3634';
  const size = 'M';
  const quantity = 1;
  
  // Create checkout session
  const sessionPayload = {
    items: [{
      _id: productId,
      name: 'Test Product',
      price: 799,
      size: size,
      quantity: quantity
    }]
  };
  
  const sessionResponse = http.post(`${BASE_URL}/api/checkout/create-session`, JSON.stringify(sessionPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (sessionResponse.status !== 200) {
    console.log('Failed to create checkout session');
    return;
  }
  
  const sessionData = JSON.parse(sessionResponse.body);
  const sessionId = sessionData.sessionId;
  
  // Test concurrent payment initiations
  const promises = [];
  const orderIds = new Set();
  
  for (let i = 0; i < 3; i++) {
    const paymentPayload = {
      sessionId: sessionId,
      amount: 799,
      currency: 'INR',
      merchantTransactionId: `test_${Date.now()}_${i}`,
      redirectUrl: 'https://shithaa.in/payment/success',
      callbackUrl: 'https://shithaa.in/api/payment/phonepe/callback'
    };
    
    promises.push(
      http.post(`${BASE_URL}/api/payment/phonepe/create-session`, JSON.stringify(paymentPayload), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
  
  const responses = http.batch(promises);
  
  let successCount = 0;
  responses.forEach(response => {
    if (response.status === 200) {
      successCount++;
      const data = JSON.parse(response.body);
      if (data.orderId) {
        orderIds.add(data.orderId);
      }
    }
  });
  
  console.log(`Draft order race test: ${successCount} out of 3 requests succeeded`);
  console.log(`Unique order IDs created: ${orderIds.size}`);
  console.log(`Expected: 1 unique order ID`);
  console.log(`Race condition detected: ${orderIds.size > 1 ? 'YES' : 'NO'}`);
  
  return orderIds.size;
}
