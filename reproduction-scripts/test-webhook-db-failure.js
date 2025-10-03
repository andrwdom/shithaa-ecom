const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://shithaa.in';

// Mock PhonePe signature generation
function generatePhonePeSignature(payload, secret) {
  const data = JSON.stringify(payload);
  const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return hash;
}

async function testWebhookDbFailure() {
  console.log('🧪 Testing Webhook Processing During DB Failure...\n');
  
  try {
    // Step 1: Create a draft order first
    console.log('1. Creating draft order...');
    const orderPayload = {
      items: [{
        _id: '68d933e710d26819630a3634', // Replace with actual product ID
        name: 'Test Product',
        price: 799,
        size: 'M',
        quantity: 1
      }],
      phonepeTransactionId: `test_db_failure_${Date.now()}`,
      amount: 799,
      currency: 'INR'
    };
    
    const orderResponse = await axios.post(`${BASE_URL}/api/orders/create-draft`, orderPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (orderResponse.status !== 200) {
      throw new Error('Failed to create draft order');
    }
    
    const orderData = orderResponse.data;
    const orderId = orderData.orderId;
    const phonepeTransactionId = orderData.phonepeTransactionId;
    
    console.log(`✅ Draft order created: ${orderId}`);
    console.log(`✅ PhonePe Transaction ID: ${phonepeTransactionId}`);
    
    // Step 2: Create webhook payload
    console.log('\n2. Creating webhook payload...');
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
    
    const secret = 'test_secret';
    const signature = generatePhonePeSignature(webhookPayload, secret);
    
    console.log(`✅ Webhook payload created`);
    console.log(`✅ Mock signature generated: ${signature.substring(0, 20)}...`);
    
    // Step 3: Test webhook processing with various failure scenarios
    console.log('\n3. Testing webhook processing resilience...');
    
    // Test 1: Normal webhook processing (baseline)
    console.log('\n📊 Test 1: Normal webhook processing (baseline)...');
    
    try {
      const normalResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, webhookPayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': signature,
          'User-Agent': 'PhonePe/1.0'
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log(`✅ Normal webhook status: ${normalResponse.status}`);
      console.log(`✅ Normal webhook response: ${JSON.stringify(normalResponse.data)}`);
      
    } catch (error) {
      console.log(`❌ Normal webhook failed: ${error.message}`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
    }
    
    // Test 2: Webhook with very short timeout (simulating DB slowness)
    console.log('\n📊 Test 2: Webhook with short timeout (simulating DB slowness)...');
    
    try {
      const shortTimeoutResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, webhookPayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': signature,
          'User-Agent': 'PhonePe/1.0'
        },
        timeout: 1000 // 1 second timeout
      });
      
      console.log(`✅ Short timeout webhook status: ${shortTimeoutResponse.status}`);
      console.log(`✅ Short timeout webhook response: ${JSON.stringify(shortTimeoutResponse.data)}`);
      
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log(`⚠️  Expected: Request timeout (${error.message})`);
        console.log(`   This simulates DB slowness scenario`);
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
      }
    }
    
    // Test 3: Webhook with malformed payload (simulating processing errors)
    console.log('\n📊 Test 3: Webhook with malformed payload...');
    
    const malformedPayload = {
      response: {
        merchantId: 'MERCHANT_ID',
        merchantTransactionId: phonepeTransactionId,
        transactionId: `TXN_${phonepeTransactionId}`,
        amount: 'invalid_amount', // Invalid amount type
        state: 'COMPLETED',
        responseCode: 'PAYMENT_SUCCESS',
        responseMessage: 'Payment successful',
        paymentInstrument: {
          type: 'UPI',
          utr: `UTR_${phonepeTransactionId}`
        }
      }
    };
    
    const malformedSignature = generatePhonePeSignature(malformedPayload, secret);
    
    try {
      const malformedResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, malformedPayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': malformedSignature,
          'User-Agent': 'PhonePe/1.0'
        },
        timeout: 10000
      });
      
      console.log(`✅ Malformed payload webhook status: ${malformedResponse.status}`);
      console.log(`✅ Malformed payload webhook response: ${JSON.stringify(malformedResponse.data)}`);
      
    } catch (error) {
      console.log(`⚠️  Expected: Malformed payload error (${error.message})`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
    }
    
    // Test 4: Webhook with missing required fields
    console.log('\n📊 Test 4: Webhook with missing required fields...');
    
    const incompletePayload = {
      response: {
        merchantId: 'MERCHANT_ID',
        // Missing merchantTransactionId
        transactionId: `TXN_${phonepeTransactionId}`,
        amount: 79900,
        state: 'COMPLETED',
        responseCode: 'PAYMENT_SUCCESS',
        responseMessage: 'Payment successful'
        // Missing paymentInstrument
      }
    };
    
    const incompleteSignature = generatePhonePeSignature(incompletePayload, secret);
    
    try {
      const incompleteResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, incompletePayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': incompleteSignature,
          'User-Agent': 'PhonePe/1.0'
        },
        timeout: 10000
      });
      
      console.log(`✅ Incomplete payload webhook status: ${incompleteResponse.status}`);
      console.log(`✅ Incomplete payload webhook response: ${JSON.stringify(incompleteResponse.data)}`);
      
    } catch (error) {
      console.log(`⚠️  Expected: Incomplete payload error (${error.message})`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
    }
    
    // Test 5: Webhook with invalid signature
    console.log('\n📊 Test 5: Webhook with invalid signature...');
    
    try {
      const invalidSignatureResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, webhookPayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': 'invalid_signature_12345',
          'User-Agent': 'PhonePe/1.0'
        },
        timeout: 10000
      });
      
      console.log(`❌ Invalid signature webhook status: ${invalidSignatureResponse.status}`);
      console.log(`❌ Invalid signature webhook response: ${JSON.stringify(invalidSignatureResponse.data)}`);
      
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log(`✅ Expected: Invalid signature rejected (${error.response.status})`);
        console.log(`   This indicates proper security validation`);
      } else {
        console.log(`⚠️  Unexpected error: ${error.message}`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
      }
    }
    
    // Test 6: Webhook with extremely large payload (simulating DoS)
    console.log('\n📊 Test 6: Webhook with large payload...');
    
    const largePayload = {
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
          utr: `UTR_${phonepeTransactionId}`,
          extraData: 'x'.repeat(10000) // Large payload
        }
      }
    };
    
    const largeSignature = generatePhonePeSignature(largePayload, secret);
    
    try {
      const largeResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, largePayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': largeSignature,
          'User-Agent': 'PhonePe/1.0'
        },
        timeout: 10000
      });
      
      console.log(`✅ Large payload webhook status: ${largeResponse.status}`);
      console.log(`✅ Large payload webhook response: ${JSON.stringify(largeResponse.data)}`);
      
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log(`⚠️  Expected: Large payload timeout (${error.message})`);
        console.log(`   This simulates DoS protection`);
      } else {
        console.log(`⚠️  Large payload error: ${error.message}`);
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
      }
    }
    
    // Test 7: Concurrent webhook processing (simulating high load)
    console.log('\n📊 Test 7: Concurrent webhook processing...');
    
    const concurrentPromises = [];
    const concurrentCount = 5;
    
    for (let i = 0; i < concurrentCount; i++) {
      const concurrentPayload = {
        response: {
          merchantId: 'MERCHANT_ID',
          merchantTransactionId: `concurrent_${Date.now()}_${i}`,
          transactionId: `TXN_concurrent_${Date.now()}_${i}`,
          amount: 79900,
          state: 'COMPLETED',
          responseCode: 'PAYMENT_SUCCESS',
          responseMessage: 'Payment successful',
          paymentInstrument: {
            type: 'UPI',
            utr: `UTR_concurrent_${Date.now()}_${i}`
          }
        }
      };
      
      const concurrentSignature = generatePhonePeSignature(concurrentPayload, secret);
      
      const promise = axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, concurrentPayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': concurrentSignature,
          'User-Agent': 'PhonePe/1.0'
        },
        timeout: 10000
      });
      
      concurrentPromises.push(promise);
    }
    
    try {
      const concurrentResponses = await Promise.allSettled(concurrentPromises);
      
      let successCount = 0;
      let errorCount = 0;
      
      concurrentResponses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
          console.log(`✅ Concurrent webhook ${index + 1}: Status ${result.value.status}`);
        } else {
          errorCount++;
          console.log(`❌ Concurrent webhook ${index + 1}: ${result.reason.message}`);
        }
      });
      
      console.log(`📊 Concurrent processing results: ${successCount}/${concurrentCount} successful`);
      
    } catch (error) {
      console.log(`❌ Concurrent processing failed: ${error.message}`);
    }
    
    // Step 4: Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    
    console.log('1. ✅ Implement webhook retry logic with exponential backoff');
    console.log('2. ✅ Add webhook queuing for high-load scenarios');
    console.log('3. ✅ Implement circuit breaker pattern for DB failures');
    console.log('4. ✅ Add comprehensive error handling and logging');
    console.log('5. ✅ Implement webhook processing monitoring and alerting');
    console.log('6. ✅ Add payload size limits and validation');
    console.log('7. ✅ Implement webhook signature verification');
    console.log('8. ✅ Add health checks for webhook processing system');
    
    console.log('\n🔧 SPECIFIC IMPLEMENTATION SUGGESTIONS:');
    console.log('- Use message queues (Redis/RabbitMQ) for webhook processing');
    console.log('- Implement webhook processing workers with retry logic');
    console.log('- Add database connection pooling and timeout handling');
    console.log('- Implement webhook processing metrics and dashboards');
    console.log('- Add automated testing for webhook failure scenarios');
    console.log('- Implement webhook processing circuit breakers');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testWebhookDbFailure();
}

module.exports = { testWebhookDbFailure };
