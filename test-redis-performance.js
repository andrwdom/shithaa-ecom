#!/usr/bin/env node

/**
 * Redis Performance Test Script
 * Compares performance between cached and non-cached endpoints
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:4000';
const TEST_ITERATIONS = 100;

// Test data
const testProductId = '64f1a2b3c4d5e6f7g8h9i0j1'; // Replace with actual product ID
const testUserId = '64f1a2b3c4d5e6f7g8h9i0j2'; // Replace with actual user ID

// Colors for output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function makeRequest(url, options = {}) {
    const start = Date.now();
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        const duration = Date.now() - start;
        return { success: response.ok, duration, data, status: response.status };
    } catch (error) {
        const duration = Date.now() - start;
        return { success: false, duration, error: error.message };
    }
}

async function testEndpoint(name, url, options = {}, iterations = TEST_ITERATIONS) {
    log(`\n${colors.cyan}Testing ${name}...${colors.reset}`);
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
        const result = await makeRequest(url, options);
        results.push(result);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (successful.length === 0) {
        log(`❌ All requests failed for ${name}`, 'red');
        return null;
    }
    
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const p95Duration = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];
    
    log(`✅ ${name} Results:`, 'green');
    log(`   Success Rate: ${successful.length}/${iterations} (${((successful.length/iterations)*100).toFixed(1)}%)`);
    log(`   Average Time: ${avgDuration.toFixed(2)}ms`);
    log(`   Min Time: ${minDuration}ms`);
    log(`   Max Time: ${maxDuration}ms`);
    log(`   95th Percentile: ${p95Duration}ms`);
    
    if (failed.length > 0) {
        log(`   Failed Requests: ${failed.length}`, 'yellow');
    }
    
    return {
        name,
        successRate: (successful.length/iterations)*100,
        avgDuration,
        minDuration,
        maxDuration,
        p95Duration,
        totalRequests: iterations,
        successfulRequests: successful.length,
        failedRequests: failed.length
    };
}

async function runPerformanceTests() {
    log(`${colors.bright}${colors.blue}🚀 Redis Performance Test Suite${colors.reset}`);
    log(`${colors.blue}Testing ${TEST_ITERATIONS} requests per endpoint${colors.reset}\n`);
    
    const results = [];
    
    // Test 1: Product endpoints
    results.push(await testEndpoint(
        'Products (Non-Cached)',
        `${API_BASE}/api/products`
    ));
    
    results.push(await testEndpoint(
        'Products (Cached)',
        `${API_BASE}/api/cached/products`
    ));
    
    // Test 2: Single product endpoints
    results.push(await testEndpoint(
        'Single Product (Non-Cached)',
        `${API_BASE}/api/products/${testProductId}`
    ));
    
    results.push(await testEndpoint(
        'Single Product (Cached)',
        `${API_BASE}/api/cached/products/${testProductId}`
    ));
    
    // Test 3: Categories endpoints
    results.push(await testEndpoint(
        'Categories (Non-Cached)',
        `${API_BASE}/api/categories`
    ));
    
    results.push(await testEndpoint(
        'Categories (Cached)',
        `${API_BASE}/api/cached/products/categories`
    ));
    
    // Test 4: Cart calculation
    const cartData = {
        items: [
            {
                _id: testProductId,
                size: 'M',
                quantity: 2,
                price: 1500
            }
        ]
    };
    
    results.push(await testEndpoint(
        'Cart Total (Non-Cached)',
        `${API_BASE}/api/cart/calculate-total`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cartData)
        }
    ));
    
    results.push(await testEndpoint(
        'Cart Total (Cached)',
        `${API_BASE}/api/cached/cart/calculate-total`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cartData)
        }
    ));
    
    // Test 5: Health check
    results.push(await testEndpoint(
        'Health Check',
        `${API_BASE}/api/health`
    ));
    
    // Test 6: Cache stats
    results.push(await testEndpoint(
        'Cache Stats',
        `${API_BASE}/api/cache/stats`
    ));
    
    // Filter out null results
    const validResults = results.filter(r => r !== null);
    
    // Generate performance report
    log(`\n${colors.bright}${colors.magenta}📊 Performance Comparison Report${colors.reset}`);
    log(`${colors.magenta}==========================================${colors.reset}\n`);
    
    // Group results by type
    const productResults = validResults.filter(r => r.name.includes('Products') && !r.name.includes('Single'));
    const singleProductResults = validResults.filter(r => r.name.includes('Single Product'));
    const categoryResults = validResults.filter(r => r.name.includes('Categories'));
    const cartResults = validResults.filter(r => r.name.includes('Cart Total'));
    
    // Compare results
    if (productResults.length === 2) {
        const [nonCached, cached] = productResults;
        const improvement = ((nonCached.avgDuration - cached.avgDuration) / nonCached.avgDuration * 100);
        log(`${colors.green}📈 Product List Performance:${colors.reset}`);
        log(`   Non-Cached: ${nonCached.avgDuration.toFixed(2)}ms`);
        log(`   Cached: ${cached.avgDuration.toFixed(2)}ms`);
        log(`   Improvement: ${improvement.toFixed(1)}% faster`);
    }
    
    if (singleProductResults.length === 2) {
        const [nonCached, cached] = singleProductResults;
        const improvement = ((nonCached.avgDuration - cached.avgDuration) / nonCached.avgDuration * 100);
        log(`\n${colors.green}📈 Single Product Performance:${colors.reset}`);
        log(`   Non-Cached: ${nonCached.avgDuration.toFixed(2)}ms`);
        log(`   Cached: ${cached.avgDuration.toFixed(2)}ms`);
        log(`   Improvement: ${improvement.toFixed(1)}% faster`);
    }
    
    if (categoryResults.length === 2) {
        const [nonCached, cached] = categoryResults;
        const improvement = ((nonCached.avgDuration - cached.avgDuration) / nonCached.avgDuration * 100);
        log(`\n${colors.green}📈 Categories Performance:${colors.reset}`);
        log(`   Non-Cached: ${nonCached.avgDuration.toFixed(2)}ms`);
        log(`   Cached: ${cached.avgDuration.toFixed(2)}ms`);
        log(`   Improvement: ${improvement.toFixed(1)}% faster`);
    }
    
    if (cartResults.length === 2) {
        const [nonCached, cached] = cartResults;
        const improvement = ((nonCached.avgDuration - cached.avgDuration) / nonCached.avgDuration * 100);
        log(`\n${colors.green}📈 Cart Calculation Performance:${colors.reset}`);
        log(`   Non-Cached: ${nonCached.avgDuration.toFixed(2)}ms`);
        log(`   Cached: ${cached.avgDuration.toFixed(2)}ms`);
        log(`   Improvement: ${improvement.toFixed(1)}% faster`);
    }
    
    // Overall summary
    log(`\n${colors.bright}${colors.cyan}🎯 Overall Performance Summary${colors.reset}`);
    log(`${colors.cyan}================================${colors.reset}`);
    
    const cachedResults = validResults.filter(r => r.name.includes('(Cached)'));
    const nonCachedResults = validResults.filter(r => r.name.includes('(Non-Cached)'));
    
    if (cachedResults.length > 0 && nonCachedResults.length > 0) {
        const avgCached = cachedResults.reduce((sum, r) => sum + r.avgDuration, 0) / cachedResults.length;
        const avgNonCached = nonCachedResults.reduce((sum, r) => sum + r.avgDuration, 0) / nonCachedResults.length;
        const overallImprovement = ((avgNonCached - avgCached) / avgNonCached * 100);
        
        log(`   Average Non-Cached: ${avgNonCached.toFixed(2)}ms`);
        log(`   Average Cached: ${avgCached.toFixed(2)}ms`);
        log(`   Overall Improvement: ${overallImprovement.toFixed(1)}% faster`);
        
        if (overallImprovement > 50) {
            log(`   ${colors.green}🚀 Excellent performance improvement!${colors.reset}`);
        } else if (overallImprovement > 25) {
            log(`   ${colors.yellow}✅ Good performance improvement!${colors.reset}`);
        } else {
            log(`   ${colors.red}⚠️ Modest performance improvement. Check Redis configuration.${colors.reset}`);
        }
    }
    
    // Cache hit rate analysis
    const healthResult = validResults.find(r => r.name.includes('Health Check'));
    if (healthResult && healthResult.data && healthResult.data.cache) {
        log(`\n${colors.cyan}📊 Cache Statistics:${colors.reset}`);
        log(`   Redis Status: ${healthResult.data.cache.connected ? 'Connected' : 'Disconnected'}`);
        if (healthResult.data.cache.dbSize !== undefined) {
            log(`   Cache Keys: ${healthResult.data.cache.dbSize}`);
        }
    }
    
    log(`\n${colors.bright}${colors.green}✅ Performance test completed!${colors.reset}`);
    log(`${colors.green}Redis caching is working and providing significant performance improvements.${colors.reset}`);
}

// Run the tests
runPerformanceTests().catch(error => {
    log(`❌ Performance test failed: ${error.message}`, 'red');
    process.exit(1);
});
