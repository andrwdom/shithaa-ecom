// Test script to check product sizes API response
const axios = require('axios');

async function testProductSizes() {
    try {
        console.log('Testing product sizes API...\n');
        
        // Test the API endpoint
        const response = await axios.get('https://shithaa.in/api/products/test4');
        const product = response.data.product;
        
        console.log('Product data:');
        console.log('- Name:', product.name);
        console.log('- Sizes:', JSON.stringify(product.sizes, null, 2));
        console.log('- AvailableSizes:', product.availableSizes);
        
        // Check if sizes are properly formatted
        if (product.sizes && Array.isArray(product.sizes)) {
            console.log('\nSize analysis:');
            product.sizes.forEach((sizeObj, index) => {
                console.log(`- Size ${index + 1}:`, {
                    size: sizeObj.size,
                    stock: sizeObj.stock,
                    availableStock: sizeObj.availableStock,
                    reserved: sizeObj.reserved
                });
            });
            
            // Test frontend logic
            const sizeOptions = Array.isArray(product.availableSizes) && product.availableSizes.length > 0
                ? product.availableSizes
                : Array.isArray(product.sizes) && product.sizes.length > 0
                    ? product.sizes.map(s => s.size)
                    : [];
            
            console.log('\nFrontend size options:', sizeOptions);
        } else {
            console.log('❌ No sizes found or invalid format');
        }
        
    } catch (error) {
        console.error('Error testing product sizes:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testProductSizes();
