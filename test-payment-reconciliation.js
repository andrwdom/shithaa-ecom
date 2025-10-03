#!/usr/bin/env node

/**
 * Payment Reconciliation Test
 * 
 * This script tests the payment reconciliation system by simulating
 * various scenarios where payments might be lost or orphaned.
 * 
 * Usage:
 *   node test-payment-reconciliation.js
 */

const mongoose = require('mongoose');
const fetch = require('node-fetch');

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db',
  BACKEND_URL: 'https://your-backend.example',
  TEST_ORDER_ID: 'test-order-' + Date.now(),
  TEST_TRANSACTION_ID: 'test-txn-' + Date.now(),
  TEST_AMOUNT: 10000 // 100.00 INR in paise
};

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(CONFIG.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Import your models
async function getModels() {
  try {
    const orderModel = (await import('./backend/models/orderModel.js')).default;
    const paymentSessionModel = (await import('./backend/models/paymentSessionModel.js')).default;
    const rawWebhookModel = (await import('./backend/models/RawWebhook.js')).default;
    const webhookEventModel = (await import('./backend/models/WebhookEvent.js')).default;
    
    return {
      orderModel,
      paymentSessionModel,
      rawWebhookModel,
      webhookEventModel
    };
  } catch (error) {
    console.error('❌ Failed to import models:', error.message);
    process.exit(1);
  }
}

/**
 * Test scenario 1: Webhook arrives before order creation
 */
async function testWebhookBeforeOrder(models) {
  console.log('\n🔄 Testing: Webhook arrives before order creation...');
  
  const { orderModel, rawWebhookModel, webhookEventModel } = models;
  
  try {
    // Step 1: Send webhook for non-existent order
    const webhookPayload = {
      event: 'PAYMENT_SUCCESS',
      payload: {
        orderId: CONFIG.TEST_ORDER_ID + '-before-order',
        transactionId: CONFIG.TEST_TRANSACTION_ID + '-before-order',
        merchantTransactionId: CONFIG.TEST_TRANSACTION_ID + '-before-order',
        state: 'COMPLETED',
        amount: CONFIG.TEST_AMOUNT,
        responseCode: 'PAYMENT_SUCCESS',
        responseMessage: 'Payment successful'
      }
    };
    
    // Simulate webhook processing
    const webhookResult = await processWebhook(webhookPayload);
    console.log(`  📤 Webhook processed: ${webhookResult.success ? 'Success' : 'Failed'}`);
    
    // Step 2: Check if order was created
    const order = await orderModel.findOne({ 
      phonepeTransactionId: CONFIG.TEST_TRANSACTION_ID + '-before-order' 
    });
    
    if (order) {
      console.log(`  ✅ Order created: ${order._id}`);
      console.log(`  📊 Order status: ${order.orderStatus}`);
      console.log(`  💰 Payment status: ${order.paymentStatus}`);
    } else {
      console.log(`  ❌ No order found for transaction: ${CONFIG.TEST_TRANSACTION_ID + '-before-order'}`);
    }
    
    // Step 3: Check raw webhook storage
    const rawWebhook = await rawWebhookModel.findOne({
      'raw.orderId': CONFIG.TEST_ORDER_ID + '-before-order'
    });
    
    if (rawWebhook) {
      console.log(`  ✅ Raw webhook stored: ${rawWebhook._id}`);
    } else {
      console.log(`  ❌ Raw webhook not found`);
    }
    
    return {
      webhookProcessed: webhookResult.success,
      orderCreated: !!order,
      rawWebhookStored: !!rawWebhook,
      orderId: order?._id,
      orderStatus: order?.orderStatus,
      paymentStatus: order?.paymentStatus
    };
    
  } catch (error) {
    console.error('  ❌ Error in webhook before order test:', error.message);
    return { error: error.message };
  }
}

/**
 * Test scenario 2: Order created but webhook lost
 */
async function testOrderWithoutWebhook(models) {
  console.log('\n🔄 Testing: Order created but webhook lost...');
  
  const { orderModel, paymentSessionModel } = models;
  
  try {
    // Step 1: Create a draft order without webhook
    const draftOrder = new orderModel({
      orderId: CONFIG.TEST_ORDER_ID + '-no-webhook',
      phonepeTransactionId: CONFIG.TEST_TRANSACTION_ID + '-no-webhook',
      userInfo: { email: 'test@example.com' },
      cartItems: [{
        productId: 'SCFL00186',
        name: 'Test Product',
        quantity: 1,
        price: 499,
        size: 'XL'
      }],
      subtotal: 499,
      total: 499,
      paymentStatus: 'PENDING',
      orderStatus: 'DRAFT',
      status: 'DRAFT',
      placedAt: new Date()
    });
    
    await draftOrder.save();
    console.log(`  ✅ Draft order created: ${draftOrder._id}`);
    
    // Step 2: Create payment session
    const paymentSession = new paymentSessionModel({
      sessionId: 'test-session-' + Date.now(),
      phonepeTransactionId: CONFIG.TEST_TRANSACTION_ID + '-no-webhook',
      userEmail: 'test@example.com',
      orderData: {
        amount: CONFIG.TEST_AMOUNT,
        shipping: {
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          addressLine1: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
          country: 'India'
        },
        cartItems: [{
          _id: 'SCFL00186',
          name: 'Test Product',
          quantity: 1,
          price: 499,
          size: 'XL'
        }]
      },
      status: 'pending'
    });
    
    await paymentSession.save();
    console.log(`  ✅ Payment session created: ${paymentSession._id}`);
    
    // Step 3: Simulate webhook arrival after delay
    setTimeout(async () => {
      const webhookPayload = {
        event: 'PAYMENT_SUCCESS',
        payload: {
          orderId: CONFIG.TEST_ORDER_ID + '-no-webhook',
          transactionId: CONFIG.TEST_TRANSACTION_ID + '-no-webhook',
          merchantTransactionId: CONFIG.TEST_TRANSACTION_ID + '-no-webhook',
          state: 'COMPLETED',
          amount: CONFIG.TEST_AMOUNT,
          responseCode: 'PAYMENT_SUCCESS',
          responseMessage: 'Payment successful'
        }
      };
      
      const webhookResult = await processWebhook(webhookPayload);
      console.log(`  📤 Delayed webhook processed: ${webhookResult.success ? 'Success' : 'Failed'}`);
      
      // Check if order was updated
      const updatedOrder = await orderModel.findById(draftOrder._id);
      if (updatedOrder) {
        console.log(`  📊 Updated order status: ${updatedOrder.orderStatus}`);
        console.log(`  💰 Updated payment status: ${updatedOrder.paymentStatus}`);
      }
    }, 2000);
    
    return {
      draftOrderCreated: true,
      paymentSessionCreated: true,
      orderId: draftOrder._id,
      paymentSessionId: paymentSession._id
    };
    
  } catch (error) {
    console.error('  ❌ Error in order without webhook test:', error.message);
    return { error: error.message };
  }
}

/**
 * Test scenario 3: Duplicate webhook processing
 */
async function testDuplicateWebhookProcessing(models) {
  console.log('\n🔄 Testing: Duplicate webhook processing...');
  
  const { orderModel, webhookEventModel } = models;
  
  try {
    const orderId = CONFIG.TEST_ORDER_ID + '-duplicate';
    const transactionId = CONFIG.TEST_TRANSACTION_ID + '-duplicate';
    
    // Step 1: Create initial order
    const order = new orderModel({
      orderId: orderId,
      phonepeTransactionId: transactionId,
      userInfo: { email: 'test@example.com' },
      cartItems: [{
        productId: 'SCFL00186',
        name: 'Test Product',
        quantity: 1,
        price: 499,
        size: 'XL'
      }],
      subtotal: 499,
      total: 499,
      paymentStatus: 'PENDING',
      orderStatus: 'DRAFT',
      status: 'DRAFT',
      placedAt: new Date()
    });
    
    await order.save();
    console.log(`  ✅ Initial order created: ${order._id}`);
    
    // Step 2: Send webhook multiple times
    const webhookPayload = {
      event: 'PAYMENT_SUCCESS',
      payload: {
        orderId: orderId,
        transactionId: transactionId,
        merchantTransactionId: transactionId,
        state: 'COMPLETED',
        amount: CONFIG.TEST_AMOUNT,
        responseCode: 'PAYMENT_SUCCESS',
        responseMessage: 'Payment successful'
      }
    };
    
    const webhookResults = [];
    for (let i = 0; i < 3; i++) {
      const result = await processWebhook(webhookPayload);
      webhookResults.push(result);
      console.log(`  📤 Webhook ${i + 1}: ${result.success ? 'Success' : 'Failed'}`);
      
      // Small delay between webhooks
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 3: Check for duplicate processing
    const webhookEvents = await webhookEventModel.find({
      'payload.orderId': orderId
    });
    
    console.log(`  📊 Webhook events stored: ${webhookEvents.length}`);
    
    // Step 4: Check final order state
    const finalOrder = await orderModel.findById(order._id);
    console.log(`  📊 Final order status: ${finalOrder.orderStatus}`);
    console.log(`  💰 Final payment status: ${finalOrder.paymentStatus}`);
    
    return {
      initialOrderCreated: true,
      webhookResults: webhookResults,
      webhookEventsStored: webhookEvents.length,
      finalOrderStatus: finalOrder.orderStatus,
      finalPaymentStatus: finalOrder.paymentStatus
    };
    
  } catch (error) {
    console.error('  ❌ Error in duplicate webhook test:', error.message);
    return { error: error.message };
  }
}

/**
 * Test scenario 4: Payment reconciliation
 */
async function testPaymentReconciliation(models) {
  console.log('\n🔄 Testing: Payment reconciliation...');
  
  const { orderModel, rawWebhookModel } = models;
  
  try {
    // Step 1: Create orphaned payment (webhook exists but no order)
    const orphanedWebhook = new rawWebhookModel({
      provider: 'phonepe',
      headers: { 'content-type': 'application/json' },
      raw: JSON.stringify({
        event: 'PAYMENT_SUCCESS',
        payload: {
          orderId: CONFIG.TEST_ORDER_ID + '-orphaned',
          transactionId: CONFIG.TEST_TRANSACTION_ID + '-orphaned',
          merchantTransactionId: CONFIG.TEST_TRANSACTION_ID + '-orphaned',
          state: 'COMPLETED',
          amount: CONFIG.TEST_AMOUNT,
          responseCode: 'PAYMENT_SUCCESS',
          responseMessage: 'Payment successful'
        }
      }),
      receivedAt: new Date()
    });
    
    await orphanedWebhook.save();
    console.log(`  ✅ Orphaned webhook created: ${orphanedWebhook._id}`);
    
    // Step 2: Run reconciliation
    const reconciliationResult = await runReconciliation();
    console.log(`  📊 Reconciliation result: ${JSON.stringify(reconciliationResult, null, 2)}`);
    
    // Step 3: Check if order was created
    const reconciledOrder = await orderModel.findOne({
      phonepeTransactionId: CONFIG.TEST_TRANSACTION_ID + '-orphaned'
    });
    
    if (reconciledOrder) {
      console.log(`  ✅ Order reconciled: ${reconciledOrder._id}`);
      console.log(`  📊 Order status: ${reconciledOrder.orderStatus}`);
    } else {
      console.log(`  ❌ No order found after reconciliation`);
    }
    
    return {
      orphanedWebhookCreated: true,
      reconciliationResult: reconciliationResult,
      orderReconciled: !!reconciledOrder,
      reconciledOrderId: reconciledOrder?._id
    };
    
  } catch (error) {
    console.error('  ❌ Error in payment reconciliation test:', error.message);
    return { error: error.message };
  }
}

/**
 * Process webhook (simulate your webhook processing logic)
 */
async function processWebhook(webhookPayload) {
  try {
    // This simulates your webhook processing endpoint
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/payment/phonepe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'test_signature', // This will fail signature validation
        'X-Request-ID': `reconciliation_test_${Date.now()}`
      },
      body: JSON.stringify(webhookPayload)
    });
    
    return {
      success: response.ok,
      status: response.status,
      body: await response.text()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Run payment reconciliation
 */
async function runReconciliation() {
  try {
    // This simulates your reconciliation endpoint
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/monitoring/missing-orders`, {
      method: 'GET',
      headers: {
        'X-Request-ID': `reconciliation_test_${Date.now()}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      return { error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Payment Reconciliation Tests...');
  console.log(`📍 MongoDB URI: ${CONFIG.MONGODB_URI}`);
  console.log(`🌐 Backend URL: ${CONFIG.BACKEND_URL}`);
  
  try {
    await connectToDatabase();
    const models = await getModels();
    
    // Test 1: Webhook before order
    const test1 = await testWebhookBeforeOrder(models);
    
    // Test 2: Order without webhook
    const test2 = await testOrderWithoutWebhook(models);
    
    // Test 3: Duplicate webhook processing
    const test3 = await testDuplicateWebhookProcessing(models);
    
    // Test 4: Payment reconciliation
    const test4 = await testPaymentReconciliation(models);
    
    console.log('\n✅ All payment reconciliation tests completed!');
    
    // Generate summary
    console.log('\n📊 Test Summary:');
    console.log(`  🔄 Webhook before order: ${test1.error ? 'Failed' : 'Completed'}`);
    console.log(`  📝 Order without webhook: ${test2.error ? 'Failed' : 'Completed'}`);
    console.log(`  🔁 Duplicate webhook processing: ${test3.error ? 'Failed' : 'Completed'}`);
    console.log(`  🔍 Payment reconciliation: ${test4.error ? 'Failed' : 'Completed'}`);
    
    console.log('\n📋 Key Points to Verify:');
    console.log('  🔍 Check your logs for webhook processing errors');
    console.log('  📊 Verify order creation and status updates');
    console.log('  🔄 Confirm idempotency in webhook processing');
    console.log('  📈 Monitor reconciliation system performance');
    console.log('  🚫 Ensure no duplicate orders are created');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testWebhookBeforeOrder,
  testOrderWithoutWebhook,
  testDuplicateWebhookProcessing,
  testPaymentReconciliation
};
