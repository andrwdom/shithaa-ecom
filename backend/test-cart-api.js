import fetch from 'node-fetch';

const API_BASE = 'https://shithaa.in/api';
const TEST_TOKEN = 'your-test-token-here'; // Replace with actual test token

async function testCartAPI() {
    console.log('🧪 Testing Cart API Endpoints...\n');

    try {
        // Test 1: Get user cart
        console.log('1️⃣ Testing GET /api/cart/get...');
        const getCartResponse = await fetch(`${API_BASE}/cart/get`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': TEST_TOKEN
            },
            body: JSON.stringify({})
        });
        
        console.log(`   Status: ${getCartResponse.status}`);
        if (getCartResponse.ok) {
            const data = await getCartResponse.json();
            console.log(`   ✅ Success: ${data.message}`);
        } else {
            const error = await getCartResponse.json();
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Test 2: Get bulk stock
        console.log('\n2️⃣ Testing POST /api/cart/get-stock...');
        const getStockResponse = await fetch(`${API_BASE}/cart/get-stock`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': TEST_TOKEN
            },
            body: JSON.stringify({
                productIds: ['test-product-id']
            })
        });
        
        console.log(`   Status: ${getStockResponse.status}`);
        if (getStockResponse.ok) {
            const data = await getStockResponse.json();
            console.log(`   ✅ Success: ${data.message}`);
        } else {
            const error = await getStockResponse.json();
            console.log(`   ❌ Error: ${error.message}`);
        }

        // Test 3: Calculate cart total (no auth required)
        console.log('\n3️⃣ Testing POST /api/cart/calculate-total...');
        const calculateTotalResponse = await fetch(`${API_BASE}/cart/calculate-total`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: [{
                    _id: 'test-product-id',
                    name: 'Test Product',
                    price: 499,
                    quantity: 1,
                    size: 'M'
                }]
            })
        });
        
        console.log(`   Status: ${calculateTotalResponse.status}`);
        if (calculateTotalResponse.ok) {
            const data = await calculateTotalResponse.json();
            console.log(`   ✅ Success: ${data.message || 'Total calculated'}`);
        } else {
            const error = await calculateTotalResponse.json();
            console.log(`   ❌ Error: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testCartAPI();
}

export default testCartAPI; 