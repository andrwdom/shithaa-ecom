// Test authentication status
const API_URL = 'https://shithaa.in';

async function testAuthStatus() {
  console.log('🔍 Testing authentication status...');
  
  try {
    // Test wishlist endpoint
    console.log('📋 Testing wishlist endpoint...');
    const wishlistResponse = await fetch(`${API_URL}/api/wishlist`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Wishlist response status:', wishlistResponse.status);
    const wishlistData = await wishlistResponse.text();
    console.log('Wishlist response:', wishlistData);
    
    // Test refresh token endpoint
    console.log('🔄 Testing refresh token endpoint...');
    const refreshResponse = await fetch(`${API_URL}/api/user/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Refresh token response status:', refreshResponse.status);
    const refreshData = await refreshResponse.text();
    console.log('Refresh token response:', refreshData);
    
    // Test health endpoint
    console.log('🏥 Testing health endpoint...');
    const healthResponse = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      credentials: 'include',
    });
    
    console.log('Health response status:', healthResponse.status);
    const healthData = await healthResponse.json();
    console.log('Health response:', healthData);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthStatus();
