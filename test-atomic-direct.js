#!/usr/bin/env node

/**
 * DIRECT ATOMIC STOCK TEST
 * 
 * This script tests the atomic stock operations directly
 * without going through the full checkout flow.
 */

const mongoose = require('mongoose');

// Simple test to verify atomic operations are working
async function testAtomicOperations() {
  console.log('🧪 Testing Atomic Stock Operations Directly');
  console.log('==========================================');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa');
    console.log('✅ Connected to MongoDB');

    // Import the atomic operations
    const { 
      reserveStockAtomic, 
      confirmStockReservationAtomic, 
      releaseStockReservationAtomic 
    } = await import('./backend/utils/atomicStockOperations.js');

    // Test with a real product ID (you'll need to update this)
    const TEST_PRODUCT_ID = '507f1f77bcf86cd799439011';
    const TEST_SIZE = 'M';
    const TEST_QUANTITY = 1;

    console.log(`Testing with Product ID: ${TEST_PRODUCT_ID}`);
    console.log(`Size: ${TEST_SIZE}, Quantity: ${TEST_QUANTITY}`);

    // Test 1: Try to reserve stock
    console.log('\n1. Testing atomic stock reservation...');
    try {
      const result = await reserveStockAtomic(TEST_PRODUCT_ID, TEST_SIZE, TEST_QUANTITY, {
        correlationId: 'test_direct_1'
      });
      console.log('✅ Atomic reservation successful:', result);
    } catch (error) {
      console.log('❌ Atomic reservation failed:', error.message);
    }

    // Test 2: Try to reserve the same stock again (should fail)
    console.log('\n2. Testing duplicate reservation (should fail)...');
    try {
      const result2 = await reserveStockAtomic(TEST_PRODUCT_ID, TEST_SIZE, TEST_QUANTITY, {
        correlationId: 'test_direct_2'
      });
      console.log('❌ Should have failed but succeeded:', result2);
    } catch (error) {
      console.log('✅ Correctly failed for duplicate reservation:', error.message);
    }

    // Test 3: Confirm the reservation
    console.log('\n3. Testing atomic stock confirmation...');
    try {
      const result3 = await confirmStockReservationAtomic(TEST_PRODUCT_ID, TEST_SIZE, TEST_QUANTITY, {
        correlationId: 'test_direct_3'
      });
      console.log('✅ Atomic confirmation successful:', result3);
    } catch (error) {
      console.log('❌ Atomic confirmation failed:', error.message);
    }

    console.log('\n✅ Atomic operations test completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testAtomicOperations().catch(console.error);
