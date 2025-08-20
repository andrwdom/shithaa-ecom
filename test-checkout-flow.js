// Test script to verify checkout flow
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function testCheckoutFlow() {
  console.log('🧪 Testing Checkout Flow...\n');
  
  try {
    // 1. Test backend health
    console.log('1️⃣ Testing backend health...');
    const healthRes = await fetch(`${API_BASE}/api/health`);
    if (healthRes.ok) {
      console.log('✅ Backend is healthy');
    } else {
      console.log('❌ Backend health check failed');
      return;
    }
    
    // 2. Test checkout session endpoint
    console.log('\n2️⃣ Testing checkout session endpoint...');
    const checkoutTestRes = await fetch(`${API_BASE}/api/checkout/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'cart',
        items: [],
        email: 'test@test.com'
      })
    });
    
    if (checkoutTestRes.ok) {
      console.log('✅ Checkout session endpoint is accessible');
    } else {
      console.log('❌ Checkout session endpoint failed:', checkoutTestRes.status);
    }
    
    // 3. Test PhonePe payment endpoint
    console.log('\n3️⃣ Testing PhonePe payment endpoint...');
    const paymentTestRes = await fetch(`${API_BASE}/api/payment/phonepe/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test-session',
        shipping: {
          fullName: 'Test User',
          email: 'test@test.com',
          phone: '1234567890',
          addressLine1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          postalCode: '123456',
          country: 'India'
        }
      })
    });
    
    if (paymentTestRes.status === 400) {
      console.log('✅ PhonePe endpoint is accessible (expected validation error for test data)');
    } else if (paymentTestRes.ok) {
      console.log('✅ PhonePe endpoint is accessible');
    } else {
      console.log('❌ PhonePe endpoint failed:', paymentTestRes.status);
    }
    
    // 4. Test order endpoints
    console.log('\n4️⃣ Testing order endpoints...');
    const orderRes = await fetch(`${API_BASE}/api/orders`);
    if (orderRes.status === 401) {
      console.log('✅ Order endpoint is accessible (requires auth as expected)');
    } else if (orderRes.ok) {
      console.log('✅ Order endpoint is accessible');
    } else {
      console.log('❌ Order endpoint failed:', orderRes.status);
    }
    
    console.log('\n🎉 Checkout flow test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the backend server: cd backend && npm start');
    console.log('2. Start the frontend: cd frontend && npm run dev');
    console.log('3. Test the complete checkout flow with a real order');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCheckoutFlow();
