#!/usr/bin/env node

/**
 * ATOMIC STOCK OPERATIONS TEST
 * 
 * This script tests the atomic stock operations to ensure they prevent race conditions
 */

import mongoose from 'mongoose';
import { 
  reserveStockAtomic, 
  confirmStockReservationAtomic, 
  releaseStockReservationAtomic,
  deductStockAtomic 
} from './backend/utils/atomicStockOperations.js';
import productModel from './backend/models/productModel.js';

// Test configuration
const TEST_PRODUCT_ID = '507f1f77bcf86cd799439011'; // Replace with actual product ID
const TEST_SIZE = 'M';
const TEST_QUANTITY = 1;

async function testAtomicOperations() {
  console.log('🧪 Testing Atomic Stock Operations');
  console.log('==================================\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa');
    console.log('✅ Connected to MongoDB');

    // Get initial stock
    const product = await productModel.findById(TEST_PRODUCT_ID);
    if (!product) {
      console.log('❌ Test product not found. Please update TEST_PRODUCT_ID');
      return;
    }

    const sizeObj = product.sizes.find(s => s.size === TEST_SIZE);
    if (!sizeObj) {
      console.log('❌ Test size not found. Please update TEST_SIZE');
      return;
    }

    console.log(`📊 Initial stock: ${sizeObj.stock}, reserved: ${sizeObj.reserved || 0}`);

    // Test 1: Atomic stock reservation
    console.log('\n1. Testing atomic stock reservation...');
    try {
      const reserveResult = await reserveStockAtomic(TEST_PRODUCT_ID, TEST_SIZE, TEST_QUANTITY, {
        correlationId: 'test_reserve_1'
      });
      console.log('✅ Atomic reservation successful:', reserveResult);
    } catch (error) {
      console.log('❌ Atomic reservation failed:', error.message);
    }

    // Test 2: Try to reserve more than available (should fail)
    console.log('\n2. Testing insufficient stock scenario...');
    try {
      const reserveResult2 = await reserveStockAtomic(TEST_PRODUCT_ID, TEST_SIZE, 999, {
        correlationId: 'test_reserve_2'
      });
      console.log('❌ Should have failed but succeeded:', reserveResult2);
    } catch (error) {
      console.log('✅ Correctly failed for insufficient stock:', error.message);
    }

    // Test 3: Atomic stock confirmation
    console.log('\n3. Testing atomic stock confirmation...');
    try {
      const confirmResult = await confirmStockReservationAtomic(TEST_PRODUCT_ID, TEST_SIZE, TEST_QUANTITY, {
        correlationId: 'test_confirm_1'
      });
      console.log('✅ Atomic confirmation successful:', confirmResult);
    } catch (error) {
      console.log('❌ Atomic confirmation failed:', error.message);
    }

    // Test 4: Try to confirm again (should fail - no more reserved stock)
    console.log('\n4. Testing double confirmation (should fail)...');
    try {
      const confirmResult2 = await confirmStockReservationAtomic(TEST_PRODUCT_ID, TEST_SIZE, TEST_QUANTITY, {
        correlationId: 'test_confirm_2'
      });
      console.log('❌ Should have failed but succeeded:', confirmResult2);
    } catch (error) {
      console.log('✅ Correctly failed for double confirmation:', error.message);
    }

    // Test 5: Direct stock deduction
    console.log('\n5. Testing direct stock deduction...');
    try {
      const deductResult = await deductStockAtomic(TEST_PRODUCT_ID, TEST_SIZE, TEST_QUANTITY, {
        correlationId: 'test_deduct_1'
      });
      console.log('✅ Atomic deduction successful:', deductResult);
    } catch (error) {
      console.log('❌ Atomic deduction failed:', error.message);
    }

    // Test 6: Try to deduct more than available (should fail)
    console.log('\n6. Testing insufficient stock for deduction...');
    try {
      const deductResult2 = await deductStockAtomic(TEST_PRODUCT_ID, TEST_SIZE, 999, {
        correlationId: 'test_deduct_2'
      });
      console.log('❌ Should have failed but succeeded:', deductResult2);
    } catch (error) {
      console.log('✅ Correctly failed for insufficient stock:', error.message);
    }

    // Get final stock
    const finalProduct = await productModel.findById(TEST_PRODUCT_ID);
    const finalSizeObj = finalProduct.sizes.find(s => s.size === TEST_SIZE);
    console.log(`\n📊 Final stock: ${finalSizeObj.stock}, reserved: ${finalSizeObj.reserved || 0}`);

    console.log('\n✅ All atomic operations tests completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testAtomicOperations().catch(console.error);
