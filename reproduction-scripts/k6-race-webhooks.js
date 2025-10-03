import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://shithaa.in';

export let options = {
  stages: [
    { duration: '30s', target: 5 },  // Ramp up
    { duration: '1m', target: 10 },  // Stay at 10 users
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function() {
  // Test webhook processing race condition
  const phonepeTransactionId = `test_webhook_${Date.now()}_${Math.random()}`;
  
  // Simulate PhonePe webhook payload
  const webhookPayload = {
    response: {
      merchantId: 'MERCHANT_ID',
      merchantTransactionId: phonepeTransactionId,
      transactionId: `TXN_${phonepeTransactionId}`,
      amount: 79900, // Amount in paise
      state: 'COMPLETED',
      responseCode: 'PAYMENT_SUCCESS',
      responseMessage: 'Payment successful',
      paymentInstrument: {
        type: 'UPI',
        utr: `UTR_${phonepeTransactionId}`
      }
    }
  };
  
  // Simulate multiple webhook deliveries (PhonePe retry scenario)
  const promises = [];
  
  for (let i = 0; i < 3; i++) {
    // Add small delay to simulate retry timing
    sleep(i * 0.1);
    
    promises.push(
      http.post(`${BASE_URL}/api/payment/phonepe/webhook`, JSON.stringify(webhookPayload), {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': 'test_signature', // Would be real signature in production
        },
      })
    );
  }
  
  const responses = http.batch(promises);
  
  let successCount = 0;
  let duplicateOrderCount = 0;
  const orderIds = new Set();
  
  responses.forEach(response => {
    if (response.status === 200) {
      successCount++;
      // Check if response indicates order creation
      const data = JSON.parse(response.body);
      if (data.orderId) {
        orderIds.add(data.orderId);
        duplicateOrderCount++;
      }
    }
  });
  
  // This test will PASS if idempotency is missing (multiple orders created)
  // This test will FAIL if idempotency is working (only one order created)
  check(responses[0], {
    'webhook processing succeeded': () => successCount > 0,
    'idempotency missing (multiple orders)': () => orderIds.size > 1,
  }) || errorRate.add(1);
  
  sleep(1);
}

export function testWebhookIdempotency() {
  const phonepeTransactionId = `test_idempotency_${Date.now()}`;
  
  const webhookPayload = {
    response: {
      merchantId: 'MERCHANT_ID',
      merchantTransactionId: phonepeTransactionId,
      transactionId: `TXN_${phonepeTransactionId}`,
      amount: 79900,
      state: 'COMPLETED',
      responseCode: 'PAYMENT_SUCCESS',
      responseMessage: 'Payment successful',
      paymentInstrument: {
        type: 'UPI',
        utr: `UTR_${phonepeTransactionId}`
      }
    }
  };
  
  // Send webhook multiple times
  const promises = [];
  const orderIds = new Set();
  
  for (let i = 0; i < 5; i++) {
    promises.push(
      http.post(`${BASE_URL}/api/payment/phonepe/webhook`, JSON.stringify(webhookPayload), {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': 'test_signature',
        },
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
  
  console.log(`Webhook idempotency test: ${successCount} out of 5 webhooks processed`);
  console.log(`Unique order IDs created: ${orderIds.size}`);
  console.log(`Expected: 1 unique order ID (idempotent processing)`);
  console.log(`Idempotency working: ${orderIds.size === 1 ? 'YES' : 'NO'}`);
  
  return orderIds.size;
}

export function testWebhookAfterOrderDeletion() {
  const phonepeTransactionId = `test_deletion_${Date.now()}`;
  
  // First, create a draft order
  const createOrderPayload = {
    items: [{
      _id: '68d933e710d26819630a3634',
      name: 'Test Product',
      price: 799,
      size: 'M',
      quantity: 1
    }],
    phonepeTransactionId: phonepeTransactionId
  };
  
  const createResponse = http.post(`${BASE_URL}/api/orders/create-draft`, JSON.stringify(createOrderPayload), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (createResponse.status !== 200) {
    console.log('Failed to create draft order');
    return;
  }
  
  const orderData = JSON.parse(createResponse.body);
  const orderId = orderData.orderId;
  
  // Delete the order
  const deleteResponse = http.delete(`${BASE_URL}/api/orders/${orderId}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (deleteResponse.status !== 200) {
    console.log('Failed to delete order');
    return;
  }
  
  // Now send webhook for deleted order
  const webhookPayload = {
    response: {
      merchantId: 'MERCHANT_ID',
      merchantTransactionId: phonepeTransactionId,
      transactionId: `TXN_${phonepeTransactionId}`,
      amount: 79900,
      state: 'COMPLETED',
      responseCode: 'PAYMENT_SUCCESS',
      responseMessage: 'Payment successful',
      paymentInstrument: {
        type: 'UPI',
        utr: `UTR_${phonepeTransactionId}`
      }
    }
  };
  
  const webhookResponse = http.post(`${BASE_URL}/api/payment/phonepe/webhook`, JSON.stringify(webhookPayload), {
    headers: { 
      'Content-Type': 'application/json',
      'X-PhonePe-Signature': 'test_signature',
    },
  });
  
  console.log(`Webhook after deletion test: Status ${webhookResponse.status}`);
  console.log(`Expected: 200 (graceful handling)`);
  console.log(`Graceful handling: ${webhookResponse.status === 200 ? 'YES' : 'NO'}`);
  
  return webhookResponse.status;
}
