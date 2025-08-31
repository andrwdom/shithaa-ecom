// 🧪 Test Backend Health Fixes
// This script tests all the critical endpoints to ensure they're working correctly

const API_BASE = 'http://localhost:4000';

// Test helper function
async function testEndpoint(name, url, method = 'GET', body = null) {
    try {
        const start = Date.now();
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const duration = Date.now() - start;
        
        if (response.ok || response.status === 401) { // 401 is expected for unauthenticated requests
            console.log(`✅ ${name}: ${response.status} (${duration}ms)`);
            return { success: true, status: response.status, duration };
        } else {
            console.log(`❌ ${name}: ${response.status} (${duration}ms)`);
            return { success: false, status: response.status, duration };
        }
    } catch (error) {
        console.log(`❌ ${name}: Error - ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Main test function
async function runTests() {
    console.log('🏥 Testing Backend Health Fixes...\n');
    
    const results = [];
    
    // Test 1: Health endpoint
    console.log('1️⃣ Testing Health Endpoint');
    results.push(await testEndpoint('Health Check', `${API_BASE}/api/health`));
    
    // Test 2: Cart health endpoint
    console.log('\n2️⃣ Testing Cart Health Endpoint');
    results.push(await testEndpoint('Cart Health', `${API_BASE}/api/cart/health`));
    
    // Test 3: User profile route (should not return 502)
    console.log('\n3️⃣ Testing User Profile Route');
    results.push(await testEndpoint('User Profile', `${API_BASE}/api/user/auth/profile`));
    
    // Test 4: Categories endpoint (should be fast now)
    console.log('\n4️⃣ Testing Categories Endpoint Performance');
    results.push(await testEndpoint('Categories', `${API_BASE}/api/categories`));
    
    // Test 5: Cart calculate total (no auth required)
    console.log('\n5️⃣ Testing Cart Calculate Total');
    results.push(await testEndpoint('Cart Calculate Total', `${API_BASE}/api/cart/calculate-total`, 'POST', { items: [] }));
    
    // Test 6: Cart get items (no auth required)
    console.log('\n6️⃣ Testing Cart Get Items');
    results.push(await testEndpoint('Cart Get Items', `${API_BASE}/api/cart/get-items`, 'POST', { userId: 'test' }));
    
    // Test 7: Products endpoint
    console.log('\n7️⃣ Testing Products Endpoint');
    results.push(await testEndpoint('Products', `${API_BASE}/api/products?limit=1`));
    
    // Test 8: Wishlist endpoint (should return 401 for unauthenticated)
    console.log('\n8️⃣ Testing Wishlist Endpoint');
    results.push(await testEndpoint('Wishlist', `${API_BASE}/api/wishlist`));
    
    // Test 9: Checkout session endpoint (should return 401 for unauthenticated)
    console.log('\n9️⃣ Testing Checkout Session Endpoint');
    results.push(await testEndpoint('Checkout Session', `${API_BASE}/api/checkout/session`, 'POST', { items: [] }));
    
    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${total - successful}`);
    
    // Performance analysis
    const performanceTests = results.filter(r => r.duration && r.success);
    if (performanceTests.length > 0) {
        const avgDuration = performanceTests.reduce((sum, r) => sum + r.duration, 0) / performanceTests.length;
        console.log(`\n📈 Performance Analysis:`);
        console.log(`Average Response Time: ${avgDuration.toFixed(0)}ms`);
        
        const slowTests = performanceTests.filter(r => r.duration > 1000);
        if (slowTests.length > 0) {
            console.log(`⚠️  Slow Tests (>1s):`);
            slowTests.forEach(test => {
                console.log(`   - ${test.name}: ${test.duration}ms`);
            });
        } else {
            console.log(`✅ All tests are fast (<1s)`);
        }
    }
    
    // Specific endpoint analysis
    console.log(`\n🔍 Endpoint Analysis:`);
    results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        const name = [
            'Health Check',
            'Cart Health', 
            'User Profile',
            'Categories',
            'Cart Calculate Total',
            'Cart Get Items',
            'Products',
            'Wishlist',
            'Checkout Session'
        ][index];
        
        if (result.status === 401) {
            console.log(`${status} ${name}: 401 (Unauthorized - Expected for unauthenticated requests)`);
        } else if (result.success) {
            console.log(`${status} ${name}: ${result.status} (${result.duration}ms)`);
        } else {
            console.log(`${status} ${name}: ${result.status || 'Error'}`);
        }
    });
    
    console.log('\n🎯 Expected Results:');
    console.log('✅ Health endpoints should return 200 OK');
    console.log('✅ Public endpoints should return 200 OK');
    console.log('✅ Protected endpoints should return 401 (Unauthorized) - NOT 502');
    console.log('✅ Categories endpoint should be fast (<1s)');
    console.log('✅ No 502 Bad Gateway errors');
    
    if (successful === total) {
        console.log('\n🎉 All tests passed! Your backend is healthy and optimized!');
    } else {
        console.log('\n⚠️  Some tests failed. Check the backend logs for issues.');
    }
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    const fetch = require('node-fetch');
    runTests().catch(console.error);
} else {
    // Browser environment
    runTests().catch(console.error);
}
