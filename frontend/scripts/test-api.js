// Simple script to test API connectivity
const testApiConnectivity = async () => {
  console.log('Testing API connectivity...');
  
  const apiUrls = [
    'http://localhost:4000',
    'http://localhost:4000/api/products',
    'https://shithaa.in',
    'https://shithaa.in/api/products'
  ];
  
  for (const url of apiUrls) {
    try {
      console.log(`\nTesting: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`Response: ${JSON.stringify(data).substring(0, 200)}...`);
        } else {
          const text = await response.text();
          console.log(`Response: ${text.substring(0, 200)}...`);
        }
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }
};

// Run the test
testApiConnectivity().catch(console.error);
