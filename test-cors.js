const axios = require('axios');

async function testCORS() {
  console.log('Testing CORS configuration...\n');
  
  const testUrls = [
    'https://shithaa.in/api/cors-test',
    'https://shithaa.in/api/health',
    'https://shithaa.in/api/user/admin'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      console.log('Origin: https://admin.shithaa.in');
      
      const response = await axios.get(url, {
        headers: {
          'Origin': 'https://admin.shithaa.in',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      
      console.log('✅ Success:', response.status);
      console.log('CORS Headers:', {
        'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
        'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials'],
        'Access-Control-Allow-Methods': response.headers['access-control-allow-methods']
      });
      
    } catch (error) {
      console.log('❌ Error:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Headers:', error.response.headers);
      }
    }
    console.log('---\n');
  }
}

testCORS().catch(console.error);
