#!/usr/bin/env node

/**
 * Test script to verify race condition fix in stock reservation
 * This simulates multiple concurrent users trying to reserve the same limited stock
 */

import mongoose from 'mongoose';
import productModel from './backend/models/productModel.js';
import { reserveStock, atomicBatchReservation } from './backend/utils/stock.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

// Test configuration
const TEST_PRODUCT_ID = '6898bfe1e4b0a1234567890a'; // Replace with actual product ID
const TEST_SIZE = 'L';
const TEST_QUANTITY = 1;
const CONCURRENT_USERS = 5; // Simulate 5 users trying to buy the same item
const AVAILABLE_STOCK = 1; // Only 1 item available

async function setupTestProduct() {
    console.log('🔧 Setting up test product...');
    
    // Find or create a test product
    let product = await productModel.findById(TEST_PRODUCT_ID);
    
    if (!product) {
        console.log('❌ Test product not found. Please update TEST_PRODUCT_ID with a valid product ID.');
        process.exit(1);
    }
    
    // Reset stock for clean test
    await productModel.updateOne(
        { _id: TEST_PRODUCT_ID },
        { 
            $set: { 
                'sizes.$[elem].stock': AVAILABLE_STOCK,
                'sizes.$[elem].reserved': 0
            }
        },
        { arrayFilters: [{ 'elem.size': TEST_SIZE }] }
    );
    
    console.log(`✅ Test product setup complete: ${product.name} (${TEST_SIZE}) - Stock: ${AVAILABLE_STOCK}`);
}

async function simulateConcurrentReservations() {
    console.log(`\n🚀 Starting concurrent reservation test with ${CONCURRENT_USERS} users...`);
    
    const promises = [];
    const results = [];
    
    // Create concurrent reservation attempts
    for (let i = 0; i < CONCURRENT_USERS; i++) {
        const userPromise = attemptReservation(i + 1);
        promises.push(userPromise);
    }
    
    // Wait for all attempts to complete
    const allResults = await Promise.allSettled(promises);
    
    // Process results
    allResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            results.push({
                user: index + 1,
                success: true,
                ...result.value
            });
        } else {
            results.push({
                user: index + 1,
                success: false,
                error: result.reason.message
            });
        }
    });
    
    return results;
}

async function attemptReservation(userId) {
    const startTime = Date.now();
    
    try {
        console.log(`👤 User ${userId}: Attempting to reserve ${TEST_QUANTITY} unit(s)...`);
        
        const result = await reserveStock(TEST_PRODUCT_ID, TEST_SIZE, TEST_QUANTITY);
        
        const duration = Date.now() - startTime;
        console.log(`✅ User ${userId}: Reservation successful in ${duration}ms`);
        
        return {
            duration,
            modifiedCount: result.modifiedCount,
            message: 'Reservation successful'
        };
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`❌ User ${userId}: Reservation failed in ${duration}ms - ${error.message}`);
        
        return {
            duration,
            error: error.message,
            message: 'Reservation failed'
        };
    }
}

async function testAtomicBatchReservation() {
    console.log(`\n🔄 Testing atomic batch reservation...`);
    
    const items = [
        { productId: TEST_PRODUCT_ID, size: TEST_SIZE, quantity: 1 },
        { productId: TEST_PRODUCT_ID, size: TEST_SIZE, quantity: 1 } // This should fail
    ];
    
    try {
        const result = await atomicBatchReservation(items);
        console.log('❌ Atomic batch reservation should have failed but succeeded:', result);
    } catch (error) {
        console.log('✅ Atomic batch reservation correctly failed:', error.message);
    }
}

async function checkFinalStockState() {
    console.log(`\n📊 Checking final stock state...`);
    
    const product = await productModel.findById(TEST_PRODUCT_ID);
    const sizeObj = product.sizes.find(s => s.size === TEST_SIZE);
    
    console.log('Final stock state:', {
        productName: product.name,
        size: TEST_SIZE,
        stock: sizeObj.stock,
        reserved: sizeObj.reserved,
        available: sizeObj.stock - sizeObj.reserved
    });
}

async function runTest() {
    try {
        console.log('🧪 Starting Race Condition Fix Test\n');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Setup test product
        await setupTestProduct();
        
        // Test 1: Concurrent individual reservations
        console.log('\n' + '='.repeat(60));
        console.log('TEST 1: Concurrent Individual Reservations');
        console.log('='.repeat(60));
        
        const results = await simulateConcurrentReservations();
        
        // Analyze results
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        console.log('\n📈 Test Results:');
        console.log(`✅ Successful reservations: ${successful.length}`);
        console.log(`❌ Failed reservations: ${failed.length}`);
        
        if (successful.length > AVAILABLE_STOCK) {
            console.log('🚨 RACE CONDITION DETECTED: More reservations succeeded than available stock!');
        } else if (successful.length === AVAILABLE_STOCK) {
            console.log('✅ RACE CONDITION FIXED: Only correct number of reservations succeeded');
        }
        
        // Test 2: Atomic batch reservation
        console.log('\n' + '='.repeat(60));
        console.log('TEST 2: Atomic Batch Reservation');
        console.log('='.repeat(60));
        
        await testAtomicBatchReservation();
        
        // Check final state
        await checkFinalStockState();
        
        console.log('\n🎉 Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the test
runTest();
