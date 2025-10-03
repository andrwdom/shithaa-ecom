#!/usr/bin/env node

/**
 * Infrastructure Failure Simulation Tests
 * 
 * This script simulates various infrastructure failures to test
 * system resilience and fallback mechanisms.
 * 
 * Usage:
 *   node test-infrastructure-failures.js
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Configuration
const CONFIG = {
  BACKEND_URL: 'https://your-backend.example',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db',
  TEST_DURATION: 30000, // 30 seconds
  CHECKOUT_ENDPOINT: '/api/checkout/session',
  WEBHOOK_ENDPOINT: '/api/payment/phonepe/webhook'
};

// Test payloads
const CHECKOUT_PAYLOAD = JSON.stringify({
  source: 'buynow',
  items: [{
    productId: 'SCFL00186',
    size: 'XL',
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

const WEBHOOK_PAYLOAD = JSON.stringify({
  event: 'PAYMENT_SUCCESS',
  payload: {
    orderId: 'test-order-' + Date.now(),
    transactionId: 'test-txn-' + Date.now(),
    merchantTransactionId: 'test-merchant-txn-' + Date.now(),
    state: 'COMPLETED',
    amount: 10000,
    responseCode: 'PAYMENT_SUCCESS',
    responseMessage: 'Payment successful'
  }
});

/**
 * Test Redis failure simulation
 */
async function testRedisFailure() {
  console.log('\n🔄 Testing Redis Failure Simulation...');
  
  try {
    // Check if Redis is running
    console.log('  📊 Checking Redis status...');
    const { stdout: redisStatus } = await execAsync('redis-cli ping');
    console.log(`  📊 Redis status: ${redisStatus.trim()}`);
    
    // Stop Redis
    console.log('  🛑 Stopping Redis...');
    await execAsync('sudo systemctl stop redis.service');
    console.log('  ✅ Redis stopped');
    
    // Run checkout tests while Redis is down
    console.log('  🚀 Running checkout tests with Redis down...');
    const results = await runCheckoutTests('redis_down');
    
    // Restart Redis
    console.log('  🔄 Restarting Redis...');
    await execAsync('sudo systemctl start redis.service');
    console.log('  ✅ Redis restarted');
    
    // Wait for Redis to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify Redis is back up
    const { stdout: redisStatusAfter } = await execAsync('redis-cli ping');
    console.log(`  📊 Redis status after restart: ${redisStatusAfter.trim()}`);
    
    return results;
    
  } catch (error) {
    console.error('  ❌ Redis failure test error:', error.message);
    return { error: error.message };
  }
}

/**
 * Test MongoDB slowdown simulation
 */
async function testMongoDBSlowdown() {
  console.log('\n🔄 Testing MongoDB Slowdown Simulation...');
  
  try {
    // Add network delay to MongoDB
    console.log('  🐌 Adding network delay to MongoDB...');
    await execAsync('sudo tc qdisc add dev eth0 root netem delay 300ms');
    console.log('  ✅ Network delay added (300ms)');
    
    // Run tests with slow MongoDB
    console.log('  🚀 Running tests with slow MongoDB...');
    const results = await runCheckoutTests('mongodb_slow');
    
    // Remove network delay
    console.log('  🔄 Removing network delay...');
    await execAsync('sudo tc qdisc del dev eth0 root');
    console.log('  ✅ Network delay removed');
    
    return results;
    
  } catch (error) {
    console.error('  ❌ MongoDB slowdown test error:', error.message);
    // Try to remove delay even if test failed
    try {
      await execAsync('sudo tc qdisc del dev eth0 root');
    } catch (e) {
      // Ignore cleanup errors
    }
    return { error: error.message };
  }
}

/**
 * Test PM2 worker restart simulation
 */
async function testPM2WorkerRestart() {
  console.log('\n🔄 Testing PM2 Worker Restart Simulation...');
  
  try {
    // Check PM2 status
    console.log('  📊 Checking PM2 status...');
    const { stdout: pm2Status } = await execAsync('pm2 status');
    console.log('  📊 PM2 processes:');
    console.log(pm2Status);
    
    // Restart specific worker (adjust name as needed)
    const workerName = 'shithaa-reservation-expiry-worker';
    console.log(`  🔄 Restarting PM2 worker: ${workerName}...`);
    await execAsync(`pm2 restart ${workerName}`);
    console.log(`  ✅ Worker ${workerName} restarted`);
    
    // Run tests after restart
    console.log('  🚀 Running tests after worker restart...');
    const results = await runCheckoutTests('worker_restart');
    
    return results;
    
  } catch (error) {
    console.error('  ❌ PM2 worker restart test error:', error.message);
    return { error: error.message };
  }
}

/**
 * Test webhook processing during failures
 */
async function testWebhookProcessingDuringFailures() {
  console.log('\n🔄 Testing Webhook Processing During Failures...');
  
  const results = [];
  
  try {
    // Test 1: Send webhook before order creation
    console.log('  📤 Sending webhook before order creation...');
    const webhookResult1 = await sendWebhook('before_order_creation');
    results.push(webhookResult1);
    
    // Test 2: Send webhook during Redis failure
    console.log('  📤 Sending webhook during Redis failure...');
    await execAsync('sudo systemctl stop redis.service');
    const webhookResult2 = await sendWebhook('redis_down');
    results.push(webhookResult2);
    await execAsync('sudo systemctl start redis.service');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Send webhook during MongoDB slowdown
    console.log('  📤 Sending webhook during MongoDB slowdown...');
    await execAsync('sudo tc qdisc add dev eth0 root netem delay 300ms');
    const webhookResult3 = await sendWebhook('mongodb_slow');
    results.push(webhookResult3);
    await execAsync('sudo tc qdisc del dev eth0 root');
    
    return results;
    
  } catch (error) {
    console.error('  ❌ Webhook failure test error:', error.message);
    return { error: error.message };
  }
}

/**
 * Run checkout tests during failure scenarios
 */
async function runCheckoutTests(scenario) {
  const results = [];
  const startTime = Date.now();
  
  console.log(`  🚀 Running checkout tests for scenario: ${scenario}`);
  
  // Simulate multiple checkout attempts
  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.CHECKOUT_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': `failure_test_${scenario}_${i}_${Date.now()}`
        },
        body: CHECKOUT_PAYLOAD
      });
      
      const result = {
        scenario,
        attempt: i,
        status: response.status,
        success: response.ok,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
      
      results.push(result);
      
      if (response.ok) {
        console.log(`    ✅ Checkout ${i + 1}: Success (${response.status})`);
      } else {
        console.log(`    ❌ Checkout ${i + 1}: Failed (${response.status})`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      const result = {
        scenario,
        attempt: i,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
      
      results.push(result);
      console.log(`    ❌ Checkout ${i + 1}: Error - ${error.message}`);
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  const successfulRequests = results.filter(r => r.success);
  const failedRequests = results.filter(r => !r.success);
  
  console.log(`  📊 Results for ${scenario}:`);
  console.log(`    ⏱️  Total time: ${totalTime}ms`);
  console.log(`    ✅ Successful: ${successfulRequests.length}/10`);
  console.log(`    ❌ Failed: ${failedRequests.length}/10`);
  console.log(`    📈 Success rate: ${(successfulRequests.length / 10 * 100).toFixed(1)}%`);
  
  return results;
}

/**
 * Send webhook during failure scenarios
 */
async function sendWebhook(scenario) {
  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.WEBHOOK_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'test_signature', // This will fail signature validation
        'X-Request-ID': `webhook_failure_test_${scenario}_${Date.now()}`
      },
      body: WEBHOOK_PAYLOAD
    });
    
    return {
      scenario,
      status: response.status,
      success: response.ok,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      scenario,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test system recovery after failures
 */
async function testSystemRecovery() {
  console.log('\n🔄 Testing System Recovery After Failures...');
  
  try {
    // Test 1: Check system health
    console.log('  📊 Checking system health...');
    const healthResponse = await fetch(`${CONFIG.BACKEND_URL}/api/monitoring/health`);
    const healthData = await healthResponse.json();
    console.log(`  📊 System health: ${healthResponse.status} - ${JSON.stringify(healthData, null, 2)}`);
    
    // Test 2: Check payment flow status
    console.log('  📊 Checking payment flow status...');
    const flowResponse = await fetch(`${CONFIG.BACKEND_URL}/api/monitoring/payment-flow`);
    const flowData = await flowResponse.json();
    console.log(`  📊 Payment flow: ${flowResponse.status} - ${JSON.stringify(flowData, null, 2)}`);
    
    // Test 3: Check for missing orders
    console.log('  📊 Checking for missing orders...');
    const missingResponse = await fetch(`${CONFIG.BACKEND_URL}/api/monitoring/missing-orders`);
    const missingData = await missingResponse.json();
    console.log(`  📊 Missing orders: ${missingResponse.status} - ${JSON.stringify(missingData, null, 2)}`);
    
    return {
      health: healthData,
      paymentFlow: flowData,
      missingOrders: missingData
    };
    
  } catch (error) {
    console.error('  ❌ System recovery test error:', error.message);
    return { error: error.message };
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Infrastructure Failure Tests...');
  console.log(`📍 Backend URL: ${CONFIG.BACKEND_URL}`);
  console.log(`⏱️  Test duration: ${CONFIG.TEST_DURATION}ms`);
  
  const allResults = {};
  
  try {
    // Test 1: Redis failure
    allResults.redisFailure = await testRedisFailure();
    
    // Test 2: MongoDB slowdown
    allResults.mongoDBSlowdown = await testMongoDBSlowdown();
    
    // Test 3: PM2 worker restart
    allResults.pm2WorkerRestart = await testPM2WorkerRestart();
    
    // Test 4: Webhook processing during failures
    allResults.webhookFailures = await testWebhookProcessingDuringFailures();
    
    // Test 5: System recovery
    allResults.systemRecovery = await testSystemRecovery();
    
    console.log('\n✅ All infrastructure failure tests completed!');
    
    // Generate summary
    console.log('\n📊 Test Summary:');
    Object.entries(allResults).forEach(([testName, results]) => {
      if (results.error) {
        console.log(`  ❌ ${testName}: Failed - ${results.error}`);
      } else if (Array.isArray(results)) {
        const successful = results.filter(r => r.success).length;
        const total = results.length;
        console.log(`  📊 ${testName}: ${successful}/${total} successful`);
      } else {
        console.log(`  ✅ ${testName}: Completed`);
      }
    });
    
    console.log('\n📋 Key Points to Verify:');
    console.log('  🔍 Check your logs for error handling during failures');
    console.log('  📊 Verify webhook queueing during Redis failures');
    console.log('  🔄 Confirm system recovery after failures');
    console.log('  📈 Monitor performance during MongoDB slowdowns');
    console.log('  🚫 Ensure no data loss during worker restarts');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testRedisFailure,
  testMongoDBSlowdown,
  testPM2WorkerRestart,
  testWebhookProcessingDuringFailures,
  testSystemRecovery
};
