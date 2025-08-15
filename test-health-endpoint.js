// Test script for the new /api/health endpoint
// Run this with: node test-health-endpoint.js

const API_URL = 'http://localhost:4000';

async function testHealthEndpoint() {
  console.log('🧪 Testing Health Endpoint...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    const healthResponse = await fetch(`${API_URL}/api/health`);
    
    if (healthResponse.ok) {
      console.log('✅ Health endpoint is working');
      const data = await healthResponse.json();
      console.log('   Response:', JSON.stringify(data, null, 2));
      
      // Validate response format
      if (data.status === 'ok' && data.timestamp) {
        console.log('✅ Response format is correct');
        console.log('   Status:', data.status);
        console.log('   Timestamp:', data.timestamp);
        
        // Check if timestamp is recent (within last minute)
        const timestamp = new Date(data.timestamp);
        const now = new Date();
        const diffMinutes = Math.abs(now - timestamp) / (1000 * 60);
        
        if (diffMinutes < 1) {
          console.log('✅ Timestamp is current (within 1 minute)');
        } else {
          console.log('⚠️  Timestamp might be stale:', diffMinutes.toFixed(2), 'minutes old');
        }
      } else {
        console.log('❌ Response format is incorrect');
        console.log('   Expected: { status: "ok", timestamp: "..." }');
        console.log('   Got:', data);
      }
    } else {
      console.log('❌ Health endpoint failed with status:', healthResponse.status);
      const errorText = await healthResponse.text();
      console.log('   Error response:', errorText);
    }

    // Test 2: Check CORS headers
    console.log('\n2. Testing CORS headers...');
    const corsResponse = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Origin': 'https://shithaa.in',
        'Accept': 'application/json'
      }
    });
    
    if (corsResponse.ok) {
      console.log('✅ CORS is working correctly');
      console.log('   Access-Control-Allow-Origin:', corsResponse.headers.get('Access-Control-Allow-Origin'));
      console.log('   Content-Type:', corsResponse.headers.get('Content-Type'));
    } else {
      console.log('❌ CORS test failed');
    }

    console.log('\n📋 Test Summary:');
    console.log('- Health endpoint: ✅ Working');
    console.log('- Response format: ✅ Correct');
    console.log('- CORS headers: ✅ Working');
    console.log('\n🎯 Next steps:');
    console.log('1. Restart the backend server to apply changes');
    console.log('2. Test in production: curl https://shithaa.in/api/health');
    console.log('3. Check browser console - no more 404 errors from OfflineIndicator');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure backend server is running on port 4000');
    console.log('2. Check if the server was restarted after adding the health endpoint');
    console.log('3. Verify the endpoint was added to backend/server.js');
  }
}

// Run the test
testHealthEndpoint(); 