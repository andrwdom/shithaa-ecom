/**
 * Test script for atomic stock operations
 * This script tests the race condition fix by simulating concurrent stock reservations
 */

import mongoose from 'mongoose';
import productModel from './backend/models/productModel.js';
import { reserveSingleStockAtomic } from './backend/utils/batchStockOperations.js';

// Test configuration
const TEST_CONFIG = {
  productId: '507f1f77bcf86cd799439011', // Replace with actual product ID
  size: 'M',
  initialStock: 1,
  concurrentRequests: 10,
  requestQuantity: 1
};

async function setupTestProduct() {
  console.log('🔧 Setting up test product...');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');
    
    // Find or create test product
    let product = await productModel.findById(TEST_CONFIG.productId);
    
    if (!product) {
      console.log('Creating test product...');
      product = new productModel({
        _id: TEST_CONFIG.productId,
        customId: 'TEST-ATOMIC-001',
        name: 'Test Atomic Product',
        price: 100,
        description: 'Test product for atomic operations',
        images: ['test-image.jpg'],
        category: 'test',
        sizes: [{
          size: TEST_CONFIG.size,
          stock: TEST_CONFIG.initialStock,
          reserved: 0
        }]
      });
      await product.save();
    } else {
      // Reset stock for test
      await productModel.updateOne(
        { _id: TEST_CONFIG.productId, 'sizes.size': TEST_CONFIG.size },
        { 
          $set: { 
            'sizes.$.stock': TEST_CONFIG.initialStock,
            'sizes.$.reserved': 0
          } 
        }
      );
    }
    
    console.log(`✅ Test product ready: ${product.name} - Stock: ${TEST_CONFIG.initialStock}`);
    return product;
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

async function testAtomicOperations() {
  console.log('🚀 Starting atomic operations test...');
  
  const session = await mongoose.startSession();
  const results = [];
  
  try {
    await session.startTransaction();
    
    // Simulate concurrent requests
    const promises = [];
    
    for (let i = 0; i < TEST_CONFIG.concurrentRequests; i++) {
      const promise = reserveSingleStockAtomic(
        TEST_CONFIG.productId,
        TEST_CONFIG.size,
        TEST_CONFIG.requestQuantity,
        session
      ).then(result => ({
        requestId: i,
        success: true,
        result
      })).catch(error => ({
        requestId: i,
        success: false,
        error: error.message
      }));
      
      promises.push(promise);
    }
    
    // Wait for all requests to complete
    const results = await Promise.all(promises);
    
    // Count successful reservations
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`\n📊 Test Results:`);
    console.log(`✅ Successful reservations: ${successful.length}`);
    console.log(`❌ Failed reservations: ${failed.length}`);
    console.log(`📈 Success rate: ${(successful.length / results.length * 100).toFixed(1)}%`);
    
    // Check for overselling
    if (successful.length > TEST_CONFIG.initialStock) {
      console.log(`🚨 OVERSELLING DETECTED! ${successful.length} reservations for ${TEST_CONFIG.initialStock} stock`);
    } else {
      console.log(`✅ No overselling detected`);
    }
    
    // Show failed reasons
    if (failed.length > 0) {
      console.log(`\n❌ Failure reasons:`);
      failed.forEach(f => {
        console.log(`  Request ${f.requestId}: ${f.error}`);
      });
    }
    
    await session.commitTransaction();
    
    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      overselling: successful.length > TEST_CONFIG.initialStock
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

async function verifyFinalState() {
  console.log('\n🔍 Verifying final state...');
  
  const product = await productModel.findById(TEST_CONFIG.productId);
  const sizeObj = product.sizes.find(s => s.size === TEST_CONFIG.size);
  
  console.log(`📦 Final stock state:`);
  console.log(`  Stock: ${sizeObj.stock}`);
  console.log(`  Reserved: ${sizeObj.reserved}`);
  console.log(`  Available: ${sizeObj.stock - sizeObj.reserved}`);
  
  if (sizeObj.reserved > sizeObj.stock) {
    console.log(`🚨 INCONSISTENT STATE: Reserved (${sizeObj.reserved}) > Stock (${sizeObj.stock})`);
  } else {
    console.log(`✅ State is consistent`);
  }
}

async function runTest() {
  try {
    console.log('🧪 Atomic Stock Operations Test');
    console.log('================================');
    
    await setupTestProduct();
    const results = await testAtomicOperations();
    await verifyFinalState();
    
    console.log('\n🎯 Test Summary:');
    console.log(`Total requests: ${results.total}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Overselling: ${results.overselling ? 'YES' : 'NO'}`);
    
    if (results.overselling) {
      console.log('\n❌ TEST FAILED: Race condition detected!');
      process.exit(1);
    } else {
      console.log('\n✅ TEST PASSED: No race conditions detected!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the test
runTest();