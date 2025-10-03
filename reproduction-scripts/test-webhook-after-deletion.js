const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'https://shithaa.in';

// Mock PhonePe signature generation
function generatePhonePeSignature(payload, secret) {
  const data = JSON.stringify(payload);
  const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return hash;
}

async function testWebhookAfterOrderDeletion() {
  console.log('🧪 Testing Webhook After Order Deletion...\n');
  
  try {
    // Step 1: Create a draft order
    console.log('1. Creating draft order...');
    const orderPayload = {
      items: [{
        _id: '68d933e710d26819630a3634', // Replace with actual product ID
        name: 'Test Product',
        price: 799,
        size: 'M',
        quantity: 1
      }],
      phonepeTransactionId: `test_deletion_${Date.now()}`,
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
    
    // Step 2: Wait a moment, then delete the order
    console.log('\n2. Waiting 2 seconds, then deleting order...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const deleteResponse = await axios.delete(`${BASE_URL}/api/orders/${orderId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (deleteResponse.status !== 200) {
      console.log(`⚠️  Order deletion returned status: ${deleteResponse.status}`);
      console.log(`   Response: ${JSON.stringify(deleteResponse.data)}`);
    } else {
      console.log(`✅ Order deleted successfully`);
    }
    
    // Step 3: Wait a moment, then send webhook for deleted order
    console.log('\n3. Waiting 1 second, then sending webhook for deleted order...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
    
    console.log(`✅ Webhook payload created for deleted order`);
    console.log(`✅ Mock signature generated: ${signature.substring(0, 20)}...`);
    
    // Step 4: Send webhook for deleted order
    console.log('\n4. Sending webhook for deleted order...');
    
    try {
      const webhookResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, webhookPayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': signature,
          'User-Agent': 'PhonePe/1.0'
        },
      });
      
      console.log(`📊 Webhook Response Status: ${webhookResponse.status}`);
      console.log(`📊 Webhook Response Data: ${JSON.stringify(webhookResponse.data)}`);
      
      // Step 5: Analyze response
      console.log('\n🔍 RESPONSE ANALYSIS:');
      
      if (webhookResponse.status === 200) {
        console.log('✅ GOOD: Webhook processed successfully (200 status)');
        
        if (webhookResponse.data && webhookResponse.data.error) {
          console.log('⚠️  WARNING: Response contains error message');
          console.log(`   Error: ${webhookResponse.data.error}`);
        } else if (webhookResponse.data && webhookResponse.data.message) {
          console.log('ℹ️  INFO: Response contains message');
          console.log(`   Message: ${webhookResponse.data.message}`);
        } else {
          console.log('✅ GOOD: Clean response without errors');
        }
      } else {
        console.log(`❌ BAD: Webhook returned non-200 status: ${webhookResponse.status}`);
        console.log(`   This indicates webhook processing failed`);
      }
      
    } catch (error) {
      console.log(`❌ Webhook request failed: ${error.message}`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
      
      // Analyze error response
      if (error.response?.status === 404) {
        console.log('ℹ️  INFO: 404 status suggests order not found (expected for deleted order)');
      } else if (error.response?.status === 400) {
        console.log('ℹ️  INFO: 400 status suggests bad request (order state issue)');
      } else if (error.response?.status === 500) {
        console.log('❌ BAD: 500 status suggests server error (unexpected)');
      } else {
        console.log('⚠️  UNCLEAR: Unexpected error status');
      }
    }
    
    // Step 6: Test webhook with non-existent order
    console.log('\n5. Testing webhook with completely non-existent order...');
    
    const nonExistentPayload = {
      response: {
        merchantId: 'MERCHANT_ID',
        merchantTransactionId: `non_existent_${Date.now()}`,
        transactionId: `TXN_non_existent_${Date.now()}`,
        amount: 79900,
        state: 'COMPLETED',
        responseCode: 'PAYMENT_SUCCESS',
        responseMessage: 'Payment successful',
        paymentInstrument: {
          type: 'UPI',
          utr: `UTR_non_existent_${Date.now()}`
        }
      }
    };
    
    const nonExistentSignature = generatePhonePeSignature(nonExistentPayload, secret);
    
    try {
      const nonExistentResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, nonExistentPayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': nonExistentSignature,
          'User-Agent': 'PhonePe/1.0'
        },
      });
      
      console.log(`📊 Non-existent Order Webhook Status: ${nonExistentResponse.status}`);
      console.log(`📊 Non-existent Order Response: ${JSON.stringify(nonExistentResponse.data)}`);
      
      if (nonExistentResponse.status === 200) {
        console.log('✅ GOOD: Webhook handled gracefully for non-existent order');
      } else {
        console.log(`⚠️  INFO: Non-existent order webhook returned status: ${nonExistentResponse.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Non-existent order webhook failed: ${error.message}`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
    }
    
    // Step 7: Test webhook after database restart scenario
    console.log('\n6. Testing webhook processing resilience...');
    
    // Simulate webhook arriving after a delay (like after DB restart)
    const delayedPayload = {
      response: {
        merchantId: 'MERCHANT_ID',
        merchantTransactionId: `delayed_${Date.now()}`,
        transactionId: `TXN_delayed_${Date.now()}`,
        amount: 79900,
        state: 'COMPLETED',
        responseCode: 'PAYMENT_SUCCESS',
        responseMessage: 'Payment successful',
        paymentInstrument: {
          type: 'UPI',
          utr: `UTR_delayed_${Date.now()}`
        }
      }
    };
    
    const delayedSignature = generatePhonePeSignature(delayedPayload, secret);
    
    try {
      const delayedResponse = await axios.post(`${BASE_URL}/api/payment/phonepe/webhook`, delayedPayload, {
        headers: { 
          'Content-Type': 'application/json',
          'X-PhonePe-Signature': delayedSignature,
          'User-Agent': 'PhonePe/1.0'
        },
      });
      
      console.log(`📊 Delayed Webhook Status: ${delayedResponse.status}`);
      console.log(`📊 Delayed Webhook Response: ${JSON.stringify(delayedResponse.data)}`);
      
      if (delayedResponse.status === 200) {
        console.log('✅ GOOD: Delayed webhook processed successfully');
      } else {
        console.log(`⚠️  INFO: Delayed webhook returned status: ${delayedResponse.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Delayed webhook failed: ${error.message}`);
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Response: ${JSON.stringify(error.response?.data)}`);
    }
    
    // Step 8: Recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    
    console.log('1. ✅ Ensure webhook processing is resilient to missing orders');
    console.log('2. ✅ Implement graceful error handling for deleted orders');
    console.log('3. ✅ Add comprehensive logging for webhook processing');
    console.log('4. ✅ Test webhook processing under various failure scenarios');
    console.log('5. ✅ Implement webhook retry logic with exponential backoff');
    console.log('6. ✅ Add monitoring and alerting for webhook processing failures');
    
    console.log('\n🔧 SPECIFIC IMPLEMENTATION SUGGESTIONS:');
    console.log('- Check if order exists before processing webhook');
    console.log('- Log webhook processing attempts with correlation IDs');
    console.log('- Implement webhook queuing for retry scenarios');
    console.log('- Add health checks for webhook processing system');
    console.log('- Monitor webhook processing success/failure rates');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testWebhookAfterOrderDeletion();
}

module.exports = { testWebhookAfterOrderDeletion };
