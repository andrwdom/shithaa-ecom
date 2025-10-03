import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://shithaa.in';

export let options = {
  stages: [
    { duration: '30s', target: 10 }, // Ramp up
    { duration: '1m', target: 50 },  // Stay at 50 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function() {
  // Test stock reservation race condition
  const productId = '68d933e710d26819630a3634'; // Replace with actual product ID
  const size = 'M';
  const quantity = 1;
  
  // Simulate multiple users trying to buy the last item
  const promises = [];
  
  for (let i = 0; i < 10; i++) {
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
  
  // This test will PASS if race condition exists (multiple users can reserve same stock)
  // This test will FAIL if race condition is fixed (only one user can reserve limited stock)
  check(responses[0], {
    'at least one request succeeded': () => successCount > 0,
    'race condition detected (multiple successes)': () => successCount > 1,
  }) || errorRate.add(1);
  
  sleep(1);
}

export function testStockReservationRace() {
  const productId = '68d933e710d26819630a3634';
  const size = 'M';
  const quantity = 1;
  
  // Reset stock to 1 for testing
  const resetPayload = {
    productId: productId,
    size: size,
    stock: 1,
    reserved: 0
  };
  
  // Reset stock (this would need to be implemented in your API)
  const resetResponse = http.post(`${BASE_URL}/api/admin/reset-stock`, JSON.stringify(resetPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (resetResponse.status !== 200) {
    console.log('Failed to reset stock for testing');
    return;
  }
  
  // Now test concurrent reservations
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
  responses.forEach(response => {
    if (response.status === 200) {
      successCount++;
    }
  });
  
  console.log(`Stock race test: ${successCount} out of 5 requests succeeded`);
  console.log(`Expected: 1 success (only 1 unit available)`);
  console.log(`Race condition detected: ${successCount > 1 ? 'YES' : 'NO'}`);
  
  return successCount;
}
