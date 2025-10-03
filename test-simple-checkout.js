#!/usr/bin/env node

/**
 * SIMPLE CHECKOUT TEST
 * 
 * This script tests the checkout flow with a real product
 * to verify atomic operations are working.
 */

const http = require('http');

// Use a real product ID from your database
const TEST_PRODUCT_ID = '6894d5c86880f7730aa3d9ff'; // Cotton Feeding Maxi
const TEST_SIZE = 'M';
const TEST_QUANTITY = 1;

function makeCheckoutRequest(requestId) {
  return new Promise((resolve) => {
    const correlationId = `test_${requestId}_${Date.now()}`;
    
    const checkoutPayload = {
      source: 'buynow',
      items: [{
        _id: TEST_PRODUCT_ID,
        productId: TEST_PRODUCT_ID,
        name: 'Cotton Feeding Maxi',
        price: 100,
        size: TEST_SIZE,
        quantity: TEST_QUANTITY,
        image: '',
        category: 'test'
      }],
      orderSummary: {
        subtotal: 100,
        total: 100,
        shipping: 0
      },
      email: `test_${requestId}@example.com`
    };

    const postData = JSON.stringify(checkoutPayload);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/checkout/session',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-request-id': correlationId
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === 200;
        const responseData = success ? JSON.parse(data) : null;
        
        console.log(`Request ${requestId}: HTTP ${res.statusCode} - ${success ? 'SUCCESS' : 'FAILED'}`);
        if (success && responseData && responseData.data) {
          console.log(`  Session ID: ${responseData.data.sessionId}`);
          console.log(`  Stock Reserved: ${responseData.data.stockReserved}`);
        }
        
        resolve({ success, correlationId, statusCode: res.statusCode, responseData });
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Request error: ${correlationId} - ${err.message}`);
      resolve({ success: false, correlationId, error: err.message });
    });

    req.setTimeout(10000, () => {
      console.log(`❌ Request timeout: ${correlationId}`);
      req.destroy();
      resolve({ success: false, correlationId, error: 'timeout' });
    });

    req.write(postData);
    req.end();
  });
}

async function testCheckoutFlow() {
  console.log('🧪 Testing Simple Checkout Flow');
  console.log('===============================');
  console.log(`Product ID: ${TEST_PRODUCT_ID}`);
  console.log(`Size: ${TEST_SIZE}`);
  console.log('');

  // Test single request first
  console.log('1. Testing single checkout request...');
  const result1 = await makeCheckoutRequest(1);
  
  if (result1.success) {
    console.log('✅ Single checkout successful');
    
    // Test concurrent requests
    console.log('\n2. Testing concurrent checkout requests...');
    const promises = [];
    for (let i = 2; i <= 5; i++) {
      promises.push(makeCheckoutRequest(i));
    }
    
    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`\n📊 CONCURRENT TEST RESULTS:`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    
    if (successful > 1) {
      console.log('\n🚨 RACE CONDITION DETECTED!');
      console.log('   Multiple successful reservations for the same SKU');
      console.log('   This indicates check-then-write race conditions');
    } else {
      console.log('\n✅ NO RACE CONDITIONS DETECTED');
      console.log('   Only one successful reservation per SKU');
      console.log('   Stock operations appear to be atomic');
    }
  } else {
    console.log('❌ Single checkout failed - cannot test race conditions');
    console.log(`   Error: ${result1.error || 'Unknown error'}`);
  }
}

// Run the test
testCheckoutFlow().catch(console.error);
