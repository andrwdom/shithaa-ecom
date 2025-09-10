// Debug script to check what's happening with product sizes
const https = require('https');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function debugProductSizes() {
  try {
    console.log('🔍 Debugging product sizes for test11...\n');
    
    // Test the API endpoint
    const response = await makeRequest('https://shithaa.in/api/products/test11');
    
    if (response.product) {
      const product = response.product;
      console.log('📦 Product Data:');
      console.log('- Name:', product.name);
      console.log('- ID:', product._id);
      console.log('- Custom ID:', product.customId);
      
      console.log('\n📏 Sizes Analysis:');
      console.log('- availableSizes:', product.availableSizes);
      console.log('- sizes array:', JSON.stringify(product.sizes, null, 2));
      
      // Simulate the frontend logic
      const sizeOptions = Array.isArray(product?.availableSizes) && product.availableSizes.length > 0
        ? product.availableSizes
        : Array.isArray(product?.sizes) && product.sizes.length > 0
          ? product.sizes.map(s => s.size)
          : [];
      
      console.log('\n🎯 Frontend Size Options:');
      console.log('- Calculated sizeOptions:', sizeOptions);
      console.log('- Length:', sizeOptions.length);
      
      if (sizeOptions.length === 0) {
        console.log('❌ No size options found!');
        console.log('- availableSizes is array?', Array.isArray(product?.availableSizes));
        console.log('- availableSizes length:', product?.availableSizes?.length);
        console.log('- sizes is array?', Array.isArray(product?.sizes));
        console.log('- sizes length:', product?.sizes?.length);
      } else {
        console.log('✅ Size options found:', sizeOptions);
      }
      
    } else {
      console.log('❌ No product found in response');
      console.log('Response:', JSON.stringify(response, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugProductSizes();
