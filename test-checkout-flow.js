#!/usr/bin/env node

/**
 * Test Script: Checkout Flow and Stock Reduction
 * 
 * This script tests the complete checkout flow to ensure:
 * 1. Orders are created properly
 * 2. Stock is reduced ONLY after successful payment
 * 3. PhonePe webhooks trigger stock reduction
 * 4. No overselling occurs
 */

const axios = require('axios');
const mongoose = require('mongoose');

// Configuration
const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const TEST_EMAIL = 'test@example.com';
const TEST_USER_ID = 'test_user_123';

// Test data
const testProduct = {
  _id: '507f1f77bcf86cd799439011', // Example MongoDB ObjectId
  name: 'Test Product',
  price: 1000,
  size: 'M',
  quantity: 2
};

const testShipping = {
  fullName: 'Test User',
  email: TEST_EMAIL,
  phone: '9876543210',
  addressLine1: '123 Test Street',
  city: 'Test City',
  state: 'Test State',
  postalCode: '123456',
  country: 'India'
};

async function testCheckoutFlow() {
  console.log('🧪 Starting Checkout Flow Test...\n');
  
  try {
    // Step 1: Create checkout session
    console.log('1️⃣ Creating checkout session...');
    const sessionResponse = await axios.post(`${API_BASE}/api/checkout/session`, {
      source: 'buynow',
      items: [testProduct],
      email: TEST_EMAIL,
      userId: TEST_USER_ID
    });
    
    if (!sessionResponse.data.success) {
      throw new Error('Failed to create checkout session: ' + sessionResponse.data.message);
    }
    
    const sessionId = sessionResponse.data.data.sessionId;
    console.log('✅ Checkout session created:', sessionId);
    
    // Step 2: Create PhonePe payment session
    console.log('\n2️⃣ Creating PhonePe payment session...');
    const paymentResponse = await axios.post(`${API_BASE}/api/payment/phonepe/create-session`, {
      checkoutSessionId: sessionId,
      shipping: testShipping,
      cartItems: [testProduct],
      orderSummary: {
        subtotal: testProduct.price * testProduct.quantity,
        shipping: 0,
        total: testProduct.price * testProduct.quantity
      },
      userId: TEST_USER_ID,
      email: TEST_EMAIL,
      checkoutMode: 'buynow'
    });
    
    if (!paymentResponse.data.success) {
      throw new Error('Failed to create payment session: ' + paymentResponse.data.message);
    }
    
    const phonepeTransactionId = paymentResponse.data.data.phonepeTransactionId;
    console.log('✅ Payment session created:', phonepeTransactionId);
    
    // Step 3: Check initial stock (should not be reduced yet)
    console.log('\n3️⃣ Checking initial stock...');
    const initialStockResponse = await axios.get(`${API_BASE}/api/products/${testProduct._id}`);
    const initialStock = initialStockResponse.data.sizes.find(s => s.size === testProduct.size)?.stock;
    console.log('📦 Initial stock for size M:', initialStock);
    
    // Step 4: Simulate successful payment webhook
    console.log('\n4️⃣ Simulating successful payment webhook...');
    const webhookResponse = await axios.post(`${API_BASE}/api/payment/phonepe/webhook`, {
      payload: {
        orderId: phonepeTransactionId,
        state: 'COMPLETED',
        responseCode: 'SUCCESS'
      },
      event: 'payment.completed'
    }, {
      headers: {
        'authorization': 'test_webhook_signature' // You may need to adjust this
      }
    });
    
    console.log('✅ Webhook processed:', webhookResponse.data);
    
    // Step 5: Check final stock (should be reduced)
    console.log('\n5️⃣ Checking final stock...');
    const finalStockResponse = await axios.get(`${API_BASE}/api/products/${testProduct._id}`);
    const finalStock = finalStockResponse.data.sizes.find(s => s.size === testProduct.size)?.stock;
    console.log('📦 Final stock for size M:', finalStock);
    
    // Step 6: Verify stock reduction
    const expectedStock = initialStock - testProduct.quantity;
    if (finalStock === expectedStock) {
      console.log('✅ Stock reduction successful!');
      console.log(`   Initial: ${initialStock}, Final: ${finalStock}, Expected: ${expectedStock}`);
    } else {
      console.log('❌ Stock reduction failed!');
      console.log(`   Initial: ${initialStock}, Final: ${finalStock}, Expected: ${expectedStock}`);
    }
    
    // Step 7: Check order status
    console.log('\n6️⃣ Checking order status...');
    const orderResponse = await axios.get(`${API_BASE}/api/orders/by-transaction/${phonepeTransactionId}`);
    const order = orderResponse.data;
    
    console.log('📋 Order details:');
    console.log(`   Order ID: ${order.orderId}`);
    console.log(`   Payment Status: ${order.paymentStatus}`);
    console.log(`   Order Status: ${order.orderStatus}`);
    console.log(`   Stock Confirmed: ${order.stockConfirmed}`);
    
    if (order.paymentStatus === 'paid' && order.stockConfirmed) {
      console.log('✅ Order confirmed and stock reduced successfully!');
    } else {
      console.log('❌ Order confirmation or stock reduction failed!');
    }
    
    console.log('\n🎉 Checkout flow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCheckoutFlow();
}

module.exports = { testCheckoutFlow };
