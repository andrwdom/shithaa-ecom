const axios = require('axios');
const FormData = require('form-data');

// Test the product creation API
async function testProductCreation() {
    try {
        const formData = new FormData();
        
        // Add required fields
        formData.append('customId', 'TEST-' + Date.now());
        formData.append('name', 'Test Product');
        formData.append('description', 'This is a test product');
        formData.append('price', '100');
        formData.append('category', 'Maternity Feeding Wear');
        formData.append('categorySlug', 'maternity-feeding-wear');
        formData.append('bestseller', 'false');
        
        // Add sizes with stock > 0
        const sizes = [
            { size: 'M', stock: 5 },
            { size: 'L', stock: 3 }
        ];
        formData.append('sizes', JSON.stringify(sizes));
        formData.append('availableSizes', JSON.stringify(['M', 'L']));
        
        // Add a test image (you'll need to create a test image file)
        // formData.append('image1', fs.createReadStream('./test-image.jpg'));
        
        console.log('Testing product creation with data:');
        console.log('customId:', 'TEST-' + Date.now());
        console.log('name: Test Product');
        console.log('description: This is a test product');
        console.log('price: 100');
        console.log('category: Maternity Feeding Wear');
        console.log('sizes:', sizes);
        
        const response = await axios.post('https://shithaa.in/api/products', formData, {
            headers: {
                ...formData.getHeaders(),
                'token': 'YOUR_ADMIN_TOKEN_HERE' // Replace with actual token
            }
        });
        
        console.log('Success! Response:', response.data);
    } catch (error) {
        console.error('Error occurred:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else {
            console.error('Error message:', error.message);
        }
    }
}

// Test without images first
async function testProductCreationWithoutImages() {
    try {
        const formData = new FormData();
        
        // Add required fields
        formData.append('customId', 'TEST-NO-IMG-' + Date.now());
        formData.append('name', 'Test Product No Images');
        formData.append('description', 'This is a test product without images');
        formData.append('price', '100');
        formData.append('category', 'Maternity Feeding Wear');
        formData.append('categorySlug', 'maternity-feeding-wear');
        formData.append('bestseller', 'false');
        
        // Add sizes with stock > 0
        const sizes = [
            { size: 'M', stock: 5 },
            { size: 'L', stock: 3 }
        ];
        formData.append('sizes', JSON.stringify(sizes));
        formData.append('availableSizes', JSON.stringify(['M', 'L']));
        
        console.log('Testing product creation WITHOUT images:');
        console.log('customId:', 'TEST-NO-IMG-' + Date.now());
        console.log('name: Test Product No Images');
        console.log('description: This is a test product without images');
        console.log('price: 100');
        console.log('category: Maternity Feeding Wear');
        console.log('sizes:', sizes);
        
        const response = await axios.post('https://shithaa.in/api/products', formData, {
            headers: {
                ...formData.getHeaders(),
                'token': 'YOUR_ADMIN_TOKEN_HERE' // Replace with actual token
            }
        });
        
        console.log('Success! Response:', response.data);
    } catch (error) {
        console.error('Error occurred:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else {
            console.error('Error message:', error.message);
        }
    }
}

// Run tests
console.log('=== Testing Product Creation API ===\n');

// First test without images to see if the issue is with image handling
testProductCreationWithoutImages();

// Uncomment the line below to test with images (after creating a test image)
// testProductCreation(); 