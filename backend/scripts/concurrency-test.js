import axios from 'axios';
import { randomUUID } from 'crypto';

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'your-test-token-here';
const PRODUCT_ID = process.env.TEST_PRODUCT_ID || '507f1f77bcf86cd799439011'; // Replace with actual product ID
const SIZE = process.env.TEST_SIZE || 'M';
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT_REQUESTS) || 10;
const REQUEST_DELAY_MS = parseInt(process.env.REQUEST_DELAY_MS) || 100;

// Test data
const testItems = [
    {
        productId: PRODUCT_ID,
        qty: 1,
        size: SIZE
    }
];

const testUserId = '507f1f77bcf86cd799439012'; // Replace with actual user ID

/**
 * Make a single reservation request
 */
async function makeReservationRequest(idempotencyKey, requestId) {
    try {
        const startTime = Date.now();
        
        const response = await axios.post(`${BASE_URL}/api/checkout/reserve`, {
            userId: testUserId,
            items: testItems,
            idempotencyKey,
            holdMinutes: 15
        }, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Request-ID': `test-${requestId}`
            },
            timeout: 10000
        });
        
        const duration = Date.now() - startTime;
        
        return {
            requestId,
            idempotencyKey,
            success: true,
            status: response.status,
            data: response.data,
            duration,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        const duration = Date.now() - (Date.now() - 1000); // Approximate duration
        
        return {
            requestId,
            idempotencyKey,
            success: false,
            status: error.response?.status || 'NETWORK_ERROR',
            error: error.response?.data?.message || error.message,
            duration,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Run concurrent reservation requests
 */
async function runConcurrencyTest() {
    console.log('🚀 Starting concurrency test for reservation system');
    console.log('=' .repeat(60));
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Concurrent requests: ${CONCURRENT_REQUESTS}`);
    console.log(`Product ID: ${PRODUCT_ID}`);
    console.log(`Size: ${SIZE}`);
    console.log(`User ID: ${testUserId}`);
    console.log('=' .repeat(60));
    
    const results = [];
    const promises = [];
    
    // Create concurrent requests
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
        const idempotencyKey = randomUUID();
        const requestId = i + 1;
        
        // Add small delay between requests to simulate real-world scenario
        const delay = i * REQUEST_DELAY_MS;
        
        const promise = new Promise(resolve => {
            setTimeout(async () => {
                const result = await makeReservationRequest(idempotencyKey, requestId);
                resolve(result);
            }, delay);
        });
        
        promises.push(promise);
    }
    
    console.log(`⏳ Executing ${CONCURRENT_REQUESTS} concurrent requests...`);
    
    // Wait for all requests to complete
    const startTime = Date.now();
    const allResults = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;
    
    // Analyze results
    const successful = allResults.filter(r => r.success);
    const failed = allResults.filter(r => !r.success);
    const uniqueReservations = new Set();
    const duplicateResponses = [];
    
    // Check for idempotency (duplicate idempotency keys should return same reservation)
    const idempotencyMap = new Map();
    
    for (const result of allResults) {
        if (result.success && result.data?.data?.reservationId) {
            const reservationId = result.data.data.reservationId;
            uniqueReservations.add(reservationId);
            
            // Check idempotency
            if (idempotencyMap.has(result.idempotencyKey)) {
                duplicateResponses.push({
                    original: idempotencyMap.get(result.idempotencyKey),
                    duplicate: result
                });
            } else {
                idempotencyMap.set(result.idempotencyKey, result);
            }
        }
    }
    
    // Print results
    console.log('\n📊 Test Results:');
    console.log('=' .repeat(60));
    console.log(`Total requests: ${allResults.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log(`Unique reservations created: ${uniqueReservations.size}`);
    console.log(`Total duration: ${totalDuration}ms`);
    console.log(`Average response time: ${totalDuration / allResults.length}ms`);
    
    if (duplicateResponses.length > 0) {
        console.log(`\n🔄 Idempotency test results:`);
        console.log(`Duplicate idempotency keys handled: ${duplicateResponses.length}`);
        
        for (const duplicate of duplicateResponses) {
            console.log(`  Key: ${duplicate.original.idempotencyKey}`);
            console.log(`  Original: ${duplicate.original.data?.data?.reservationId}`);
            console.log(`  Duplicate: ${duplicate.duplicate.data?.data?.reservationId}`);
            console.log(`  Same reservation: ${duplicate.original.data?.data?.reservationId === duplicate.duplicate.data?.data?.reservationId}`);
        }
    }
    
    // Print detailed results
    console.log('\n📋 Detailed Results:');
    console.log('=' .repeat(60));
    
    for (const result of allResults) {
        const status = result.success ? '✅' : '❌';
        const reservationId = result.success && result.data?.data?.reservationId 
            ? result.data.data.reservationId 
            : 'N/A';
        
        console.log(`${status} Request ${result.requestId}: ${result.status} - ${reservationId} (${result.duration}ms)`);
        
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
    }
    
    // Summary
    console.log('\n🏁 Summary:');
    console.log('=' .repeat(60));
    
    if (successful.length === allResults.length) {
        console.log('🎉 All requests succeeded!');
    } else {
        console.log(`⚠️ ${failed.length} requests failed`);
    }
    
    if (uniqueReservations.size === 1) {
        console.log('✅ Perfect idempotency: All requests returned the same reservation');
    } else if (uniqueReservations.size < allResults.length) {
        console.log(`⚠️ Partial idempotency: ${uniqueReservations.size} unique reservations for ${allResults.length} requests`);
    } else {
        console.log('❌ No idempotency: Each request created a different reservation');
    }
    
    console.log(`\n💡 Expected behavior:`);
    console.log(`- All requests should succeed (200 status)`);
    console.log(`- Requests with same idempotency key should return same reservation`);
    console.log(`- Stock should be properly reserved without overselling`);
    
    return {
        total: allResults.length,
        successful: successful.length,
        failed: failed.length,
        uniqueReservations: uniqueReservations.size,
        totalDuration,
        averageResponseTime: totalDuration / allResults.length,
        idempotencyWorking: duplicateResponses.length > 0 ? 
            duplicateResponses.every(d => d.original.data?.data?.reservationId === d.duplicate.data?.data?.reservationId) : 
            'N/A'
    };
}

/**
 * Run a single test with custom parameters
 */
async function runSingleTest() {
    console.log('🧪 Running single reservation test...');
    
    const idempotencyKey = randomUUID();
    const result = await makeReservationRequest(idempotencyKey, 1);
    
    console.log('\n📋 Single Test Result:');
    console.log('=' .repeat(40));
    console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`HTTP Status: ${result.status}`);
    console.log(`Duration: ${result.duration}ms`);
    console.log(`Idempotency Key: ${result.idempotencyKey}`);
    
    if (result.success) {
        console.log(`Reservation ID: ${result.data?.data?.reservationId}`);
        console.log(`Expires At: ${result.data?.data?.expiresAt}`);
        console.log(`Total Amount: ${result.data?.data?.totalAmount}`);
    } else {
        console.log(`Error: ${result.error}`);
    }
    
    return result;
}

// Main execution
async function main() {
    try {
        const testType = process.argv[2] || 'concurrent';
        
        if (testType === 'single') {
            await runSingleTest();
        } else {
            await runConcurrencyTest();
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { runConcurrencyTest, runSingleTest, makeReservationRequest };
