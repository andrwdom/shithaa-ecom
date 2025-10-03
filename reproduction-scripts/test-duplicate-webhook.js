const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://shithaa.in';

// Mock PhonePe signature generation (in real scenario, this would be done by PhonePe)
function generatePhonePeSignature(payload, secret) {
  const data = JSON.stringify(payload);
  const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return hash;
}

async function testDuplicateWebhook() {
  console.log('🧪 Testing Duplicate Webhook Delivery...\n');
  
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
      phonepeTransactionId: `test_webhook_${Date.now()}`,
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
    
    // Generate mock signature
    const secret = 'test_secret'; // In production, this would be the actual PhonePe secret
    const signature = generatePhonePeSignature(webhookPayload, secret);
    
    console.log(`✅ Webhook payload created`);
    console.log(`✅ Mock signature generated: ${signature.substring(0, 20)}...`);
    
    // Step 3: Send webhook multiple times (simulating PhonePe retries)
    console.log('\n3. Sending webhook multiple times (simulating retries)...');
    
    const webhookPromises = [];
    const retryDelays = [0, 100, 500, 1000, 2000]; // Different retry intervals
    
    for (let i = 0; i < 5; i++) {
      const delay = retryDelays[i];
      
      const webhookPromise = new Promise(async (resolve) => {
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        try {
          const response = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, webhookPayload, {
            headers: { 
              'Content-Type': 'application/json',
              'X-PhonePe-Signature': signature,
              'User-Agent': 'PhonePe/1.0'
            },
          });
          
          resolve({
            attempt: i + 1,
            delay: delay,
            status: response.status,
            data: response.data,
            success: true
          });
        } catch (error) {
          resolve({
            attempt: i + 1,
            delay: delay,
            status: error.response?.status || 0,
            error: error.message,
            success: false
          });
        }
      });
      
      webhookPromises.push(webhookPromise);
    }
    
    const webhookResults = await Promise.all(webhookPromises);
    
    // Step 4: Analyze results
    console.log('\n📊 WEBHOOK DELIVERY RESULTS:');
    let successCount = 0;
    let errorCount = 0;
    const orderIds = new Set();
    const responses = [];
    
    webhookResults.forEach((result, index) => {
      console.log(`Attempt ${result.attempt} (${result.delay}ms delay):`);
      
      if (result.success) {
        successCount++;
        console.log(`  ✅ Status: ${result.status}`);
        console.log(`  📝 Response: ${JSON.stringify(result.data).substring(0, 100)}...`);
        
        if (result.data && result.data.orderId) {
          orderIds.add(result.data.orderId);
        }
        
        responses.push(result.data);
      } else {
        errorCount++;
        console.log(`  ❌ Status: ${result.status}`);
        console.log(`  ❌ Error: ${result.error}`);
      }
    });
    
    // Step 5: Check for duplicate order creation
    console.log('\n🔍 DUPLICATE ORDER ANALYSIS:');
    console.log(`Total webhook attempts: 5`);
    console.log(`Successful webhook deliveries: ${successCount}`);
    console.log(`Failed webhook deliveries: ${errorCount}`);
    console.log(`Unique order IDs in responses: ${orderIds.size}`);
    
    if (orderIds.size === 0) {
      console.log('⚠️  No order IDs found in webhook responses');
      console.log('   This could indicate webhook processing issues');
    } else if (orderIds.size === 1) {
      console.log('✅ GOOD: Only one order ID found (idempotent processing)');
      console.log('✅ System properly handles duplicate webhook deliveries');
    } else {
      console.log('❌ BAD: Multiple order IDs found (duplicate order creation)');
      console.log('❌ System does not handle duplicate webhooks properly');
      console.log('❌ This will cause customer billing issues');
    }
    
    // Step 6: Test webhook signature verification
    console.log('\n🔐 TESTING WEBHOOK SIGNATURE VERIFICATION:');
    
    const invalidSignaturePayload = {
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
    
    const invalidSignature = 'invalid_signature_12345';
    
    try {
      const invalidResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, invalidSignaturePayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': invalidSignature,
          'User-Agent': 'PhonePe/1.0'
        },
      });
      
      if (invalidResponse.status === 200) {
        console.log('❌ BAD: Invalid signature accepted (security vulnerability)');
      } else {
        console.log('✅ GOOD: Invalid signature rejected (security working)');
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('✅ GOOD: Invalid signature rejected (security working)');
      } else {
        console.log('⚠️  UNCLEAR: Unexpected error with invalid signature');
        console.log(`   Status: ${error.response?.status}, Error: ${error.message}`);
      }
    }
    
    // Step 7: Test webhook with missing signature
    console.log('\n🔐 TESTING WEBHOOK WITH MISSING SIGNATURE:');
    
    try {
      const noSignatureResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, webhookPayload, {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'PhonePe/1.0'
        },
      });
      
      if (noSignatureResponse.status === 200) {
        console.log('❌ BAD: Missing signature accepted (security vulnerability)');
      } else {
        console.log('✅ GOOD: Missing signature rejected (security working)');
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('✅ GOOD: Missing signature rejected (security working)');
      } else {
        console.log('⚠️  UNCLEAR: Unexpected error with missing signature');
        console.log(`   Status: ${error.response?.status}, Error: ${error.message}`);
      }
    }
    
    // Step 8: Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (orderIds.size > 1) {
      console.log('1. ❌ CRITICAL: Implement webhook idempotency using phonepeTransactionId');
      console.log('2. ❌ CRITICAL: Add database constraints to prevent duplicate orders');
      console.log('3. ❌ CRITICAL: Implement webhook deduplication logic');
      console.log('4. Add webhook processing logs for debugging');
    } else if (orderIds.size === 1) {
      console.log('1. ✅ System appears to handle duplicate webhooks correctly');
      console.log('2. Continue monitoring webhook processing');
      console.log('3. Add comprehensive webhook logging');
    } else {
      console.log('1. ⚠️  Investigate webhook processing issues');
      console.log('2. Check webhook endpoint configuration');
      console.log('3. Verify webhook signature verification');
    }
    
    console.log('\n4. Implement webhook retry logic with exponential backoff');
    console.log('5. Add webhook processing metrics and monitoring');
    console.log('6. Test webhook processing under load');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testDuplicateWebhook();
}

module.exports = { testDuplicateWebhook };
