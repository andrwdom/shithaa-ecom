const axios = require('axios');

const BASE_URL = 'https://shithaa.in';

async function testDoubleClickConfirm() {
  console.log('🧪 Testing Double-Click Confirm on Mobile...\n');
  
  try {
    // Step 1: Create checkout session
    console.log('1. Creating checkout session...');
    const sessionPayload = {
      items: [{
        _id: '68d933e710d26819630a3634', // Replace with actual product ID
        name: 'Test Product',
        price: 799,
        size: 'M',
        quantity: 1
      }]
    };
    
    const sessionResponse = await axios.post(`${BASE_URL}/api/checkout/create-session`, sessionPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (sessionResponse.status !== 200) {
      throw new Error('Failed to create checkout session');
    }
    
    const sessionData = sessionResponse.data;
    const sessionId = sessionData.sessionId;
    console.log(`✅ Checkout session created: ${sessionId}`);
    
    // Step 2: Simulate double-click on confirm button (rapid consecutive requests)
    console.log('\n2. Simulating double-click confirm (2 rapid requests)...');
    
    const paymentPayload = {
      sessionId: sessionId,
      amount: 799,
      currency: 'INR',
      merchantTransactionId: `test_double_click_${Date.now()}`,
      redirectUrl: 'https://shithaa.in/payment/success',
      callbackUrl: 'https://shithaa.in/api/payment/phonepe/callback'
    };
    
    // Send two requests almost simultaneously (simulating double-click)
    const promises = [
      axios.post(`${BASE_URL}/api/payment/phonepe/create-session`, paymentPayload, {
        headers: { 'Content-Type': 'application/json' },
      }),
      axios.post(`${BASE_URL}/api/payment/phonepe/create-session`, paymentPayload, {
        headers: { 'Content-Type': 'application/json' },
      })
    ];
    
    const responses = await Promise.allSettled(promises);
    
    // Analyze results
    let successCount = 0;
    let orderIds = new Set();
    let errors = [];
    
    responses.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.status === 200) {
        successCount++;
        const data = result.value.data;
        if (data.orderId) {
          orderIds.add(data.orderId);
        }
        console.log(`✅ Request ${index + 1}: Success - Order ID: ${data.orderId || 'N/A'}`);
      } else {
        const error = result.status === 'rejected' ? result.reason : result.value;
        errors.push(error.message || error.statusText);
        console.log(`❌ Request ${index + 1}: Failed - ${error.message || error.statusText}`);
      }
    });
    
    // Step 3: Analyze results
    console.log('\n📊 RESULTS:');
    console.log(`Total requests: 2`);
    console.log(`Successful requests: ${successCount}`);
    console.log(`Unique order IDs: ${orderIds.size}`);
    console.log(`Errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nError details:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // Step 4: Determine if race condition exists
    console.log('\n🔍 ANALYSIS:');
    if (orderIds.size === 1) {
      console.log('✅ GOOD: Only one order created (race condition handled)');
      console.log('✅ System properly prevents duplicate orders from double-click');
    } else if (orderIds.size > 1) {
      console.log('❌ BAD: Multiple orders created (race condition exists)');
      console.log('❌ System allows duplicate orders from double-click');
      console.log('❌ This will cause customer billing issues');
    } else {
      console.log('⚠️  UNCLEAR: No orders created (check error messages)');
    }
    
    // Step 5: Test with different timing intervals
    console.log('\n🔄 Testing with different timing intervals...');
    
    const timingTests = [
      { name: 'Immediate (0ms)', delay: 0 },
      { name: 'Fast (50ms)', delay: 50 },
      { name: 'Medium (100ms)', delay: 100 },
      { name: 'Slow (500ms)', delay: 500 }
    ];
    
    for (const test of timingTests) {
      console.log(`\nTesting ${test.name} delay...`);
      
      const testSessionPayload = {
        items: [{
          _id: '68d933e710d26819630a3634',
          name: 'Test Product',
          price: 799,
          size: 'M',
          quantity: 1
        }]
      };
      
      const testSessionResponse = await axios.post(`${BASE_URL}/api/checkout/create-session`, testSessionPayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (testSessionResponse.status !== 200) {
        console.log(`❌ Failed to create test session for ${test.name}`);
        continue;
      }
      
      const testSessionId = testSessionResponse.data.sessionId;
      const testPaymentPayload = {
        sessionId: testSessionId,
        amount: 799,
        currency: 'INR',
        merchantTransactionId: `test_timing_${test.name}_${Date.now()}`,
        redirectUrl: 'https://shithaa.in/payment/success',
        callbackUrl: 'https://shithaa.in/api/payment/phonepe/callback'
      };
      
      // First request
      const firstRequest = axios.post(`${BASE_URL}/api/payment/phonepe/create-session`, testPaymentPayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      // Wait for specified delay
      await new Promise(resolve => setTimeout(resolve, test.delay));
      
      // Second request
      const secondRequest = axios.post(`${BASE_URL}/api/payment/phonepe/create-session`, testPaymentPayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      const testResponses = await Promise.allSettled([firstRequest, secondRequest]);
      
      let testSuccessCount = 0;
      let testOrderIds = new Set();
      
      testResponses.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.status === 200) {
          testSuccessCount++;
          const data = result.value.data;
          if (data.orderId) {
            testOrderIds.add(data.orderId);
          }
        }
      });
      
      console.log(`  Results: ${testSuccessCount}/2 successful, ${testOrderIds.size} unique orders`);
      
      if (testOrderIds.size > 1) {
        console.log(`  ❌ Race condition detected with ${test.name} delay`);
      } else {
        console.log(`  ✅ No race condition with ${test.name} delay`);
      }
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (orderIds.size > 1) {
      console.log('1. Implement idempotency keys for payment session creation');
      console.log('2. Add database constraints to prevent duplicate orders');
      console.log('3. Implement client-side double-click prevention');
      console.log('4. Add server-side rate limiting for payment endpoints');
    } else {
      console.log('1. System appears to handle double-click correctly');
      console.log('2. Continue monitoring for edge cases');
      console.log('3. Consider adding client-side double-click prevention for better UX');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testDoubleClickConfirm();
}

module.exports = { testDoubleClickConfirm };
