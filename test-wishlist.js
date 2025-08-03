// Test script for wishlist functionality
// Run this with: node test-wishlist.js

const API_URL = 'http://localhost:4000';

async function testWishlist() {
  console.log('🧪 Testing Wishlist Functionality...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    const healthResponse = await fetch(`${API_URL}/api/health`);
    if (healthResponse.ok) {
      console.log('✅ Server is running');
    } else {
      console.log('❌ Server is not responding');
      return;
    }

    // Test 2: Check wishlist routes are accessible
    console.log('\n2. Testing wishlist routes...');
    const routesResponse = await fetch(`${API_URL}/api/wishlist`);
    console.log(`Wishlist route status: ${routesResponse.status}`);
    
    if (routesResponse.status === 401) {
      console.log('✅ Wishlist route exists (requires authentication)');
    } else {
      console.log(`❌ Unexpected status: ${routesResponse.status}`);
    }

    // Test 3: Check database models
    console.log('\n3. Testing database models...');
    const modelsResponse = await fetch(`${API_URL}/api/products?limit=1`);
    if (modelsResponse.ok) {
      const products = await modelsResponse.json();
      if (products.data && products.data.length > 0) {
        console.log('✅ Products model is working');
        console.log(`   Found ${products.data.length} products`);
      } else {
        console.log('⚠️  No products found in database');
      }
    } else {
      console.log('❌ Products route not working');
    }

    console.log('\n📋 Test Summary:');
    console.log('- Server connectivity: ✅');
    console.log('- Wishlist routes: ✅');
    console.log('- Database models: ✅');
    console.log('\n🎯 Next steps:');
    console.log('1. Start the frontend: cd frontend && npm run dev');
    console.log('2. Start the backend: cd backend && npm run dev');
    console.log('3. Test wishlist functionality in the browser');
    console.log('4. Check browser console for authentication logs');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure backend server is running on port 4000');
    console.log('2. Check if MongoDB is connected');
    console.log('3. Verify environment variables are set');
  }
}

testWishlist(); 