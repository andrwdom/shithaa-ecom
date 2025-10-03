/**
 * K6 LOAD TESTING SCRIPT FOR WEBHOOK PROCESSING
 * 
 * Simulates high-volume webhook traffic to test:
 * - System performance under load
 * - Race condition handling
 * - Memory usage and resource consumption
 * - Response time consistency
 * 
 * Usage: k6 run webhookLoadTest.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import crypto from 'k6/crypto';

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Normal load
    normal_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { test_type: 'normal' },
    },
    
    // Scenario 2: High load
    high_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
      startTime: '2m',
      tags: { test_type: 'high' },
    },
    
    // Scenario 3: Burst load
    burst_load: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      startTime: '3m30s',
      tags: { test_type: 'burst' },
    },
    
    // Scenario 4: Race condition test
    race_condition: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
      startTime: '4m',
      tags: { test_type: 'race' },
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.01'],    // Less than 1% failures
    http_reqs: ['rate>50'],            // More than 50 requests per second
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const PHONEPE_SALT_KEY = __ENV.PHONEPE_SALT_KEY || 'test_salt_key_12345';
const PHONEPE_SALT_INDEX = __ENV.PHONEPE_SALT_INDEX || '1';

// Test order data
const TEST_ORDERS = [
  {
    orderId: 'LOAD_TEST_ORDER_001',
    transactionId: 'LOAD_TEST_TXN_001',
    amount: 50000, // 500 rupees
  },
  {
    orderId: 'LOAD_TEST_ORDER_002',
    transactionId: 'LOAD_TEST_TXN_002',
    amount: 75000, // 750 rupees
  },
  {
    orderId: 'LOAD_TEST_ORDER_003',
    transactionId: 'LOAD_TEST_TXN_003',
    amount: 100000, // 1000 rupees
  },
];

/**
 * Generate PhonePe signature
 */
function generatePhonePeSignature(payload) {
  const payloadString = JSON.stringify(payload);
  const dataToSign = payloadString + PHONEPE_SALT_KEY + PHONEPE_SALT_INDEX;
  return crypto.sha256(dataToSign, 'hex');
}

/**
 * Create webhook payload
 */
function createWebhookPayload(orderId, transactionId, amount, state = 'COMPLETED') {
  return {
    event: 'payment.success',
    payload: {
      orderId,
      merchantTransactionId: transactionId,
      transactionId,
      state,
      amount,
      currency: 'INR',
      timestamp: Date.now(),
    },
  };
}

/**
 * Send webhook request
 */
function sendWebhook(orderId, transactionId, amount, state = 'COMPLETED') {
  const payload = createWebhookPayload(orderId, transactionId, amount, state);
  const signature = generatePhonePeSignature(payload);
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-verify': signature,
      'User-Agent': 'K6-LoadTest/1.0',
    },
  };
  
  const response = http.post(`${BASE_URL}/api/payment/phonepe/webhook`, JSON.stringify(payload), params);
  
  return {
    response,
    payload,
    signature,
    orderId,
    transactionId,
  };
}

export default function () {
  // Select random test order
  const testOrder = TEST_ORDERS[Math.floor(Math.random() * TEST_ORDERS.length)];
  
  // Add some variation to transaction IDs to avoid exact duplicates
  const uniqueTransactionId = `${testOrder.transactionId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  // Send webhook
  const result = sendWebhook(testOrder.orderId, uniqueTransactionId, testOrder.amount);
  
  // Basic response validation
  const success = check(result.response, {
    'webhook status is 200': (r) => r.status === 200,
    'webhook response has success field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    'webhook response time is acceptable': (r) => r.timings.duration < 2000,
  });
  
  // Log failures
  if (!success) {
    console.error(`Webhook failed for ${result.orderId}: ${result.response.status} - ${result.response.body}`);
  }
  
  // Small delay between requests
  sleep(0.1);
}

export function handleSummary(data) {
  return {
    'webhook-load-test-results.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total_requests: data.metrics.http_reqs.values.count,
        total_duration: data.metrics.http_req_duration.values.count,
        average_response_time: data.metrics.http_req_duration.values.avg,
        p95_response_time: data.metrics.http_req_duration.values['p(95)'],
        p99_response_time: data.metrics.http_req_duration.values['p(99)'],
        failure_rate: data.metrics.http_req_failed.values.rate,
        requests_per_second: data.metrics.http_reqs.values.rate,
      },
      scenarios: {
        normal_load: {
          vus: 10,
          duration: '2m',
          requests: data.metrics.http_reqs.values.count,
        },
        high_load: {
          vus: 50,
          duration: '1m',
          requests: data.metrics.http_reqs.values.count,
        },
        burst_load: {
          rate: 100,
          duration: '30s',
          requests: data.metrics.http_reqs.values.count,
        },
        race_condition: {
          vus: 100,
          duration: '30s',
          requests: data.metrics.http_reqs.values.count,
        },
      },
      thresholds: {
        response_time_p95: {
          threshold: 1000,
          actual: data.metrics.http_req_duration.values['p(95)'],
          passed: data.metrics.http_req_duration.values['p(95)'] < 1000,
        },
        failure_rate: {
          threshold: 0.01,
          actual: data.metrics.http_req_failed.values.rate,
          passed: data.metrics.http_req_failed.values.rate < 0.01,
        },
        requests_per_second: {
          threshold: 50,
          actual: data.metrics.http_reqs.values.rate,
          passed: data.metrics.http_reqs.values.rate > 50,
        },
      },
    }, null, 2),
  };
}
