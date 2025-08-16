const axios = require('axios');

async function testCORSFinal() {
  console.log('🧪 Final CORS Test - Checking for Duplicate Headers...\n');
  
  try {
    console.log('Testing admin login endpoint...');
    console.log('Origin: https://admin.shithaa.in');
    
    const response = await axios.post('https://shithaa.in/api/user/admin', {
      email: 'info.shithaa@gmail.com',
      password: 'shithaaweb@14525!'
    }, {
      headers: {
        'Origin': 'https://admin.shithaa.in',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success:', response.status);
    console.log('Response:', response.data);
    
    // Check for duplicate CORS headers
    const corsOrigin = response.headers['access-control-allow-origin'];
    const corsMethods = response.headers['access-control-allow-methods'];
    const corsCredentials = response.headers['access-control-allow-credentials'];
    
    console.log('\n🔍 CORS Headers Check:');
    console.log('Access-Control-Allow-Origin:', corsOrigin);
    console.log('Access-Control-Allow-Methods:', corsMethods);
    console.log('Access-Control-Allow-Credentials:', corsCredentials);
    
    // Check for duplicate values
    if (corsOrigin && corsOrigin.includes(',')) {
      console.log('❌ DUPLICATE CORS HEADERS DETECTED!');
      console.log('Multiple values found:', corsOrigin);
    } else {
      console.log('✅ No duplicate CORS headers detected');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
      console.log('Data:', error.response.data);
    }
  }
}

testCORSFinal().catch(console.error);
