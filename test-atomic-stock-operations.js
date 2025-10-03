#!/usr/bin/env node

/**
 * Atomic Stock Operations Test
 * 
 * This script tests the atomicity of stock operations by simulating
 * concurrent stock reservations and confirmations.
 * 
 * Usage:
 *   node test-atomic-stock-operations.js
 */

const mongoose = require('mongoose');

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db',
  TEST_PRODUCT_ID: 'SCFL00186', // Replace with a real product ID
  TEST_SIZE: 'XL', // Replace with a real size
  CONCURRENT_OPERATIONS: 50,
  TEST_QUANTITY: 1
};

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(CONFIG.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Import your models (adjust paths as needed)
async function getModels() {
  try {
    // Import your product model
    const productModel = (await import('./backend/models/productModel.js')).default;
    return { productModel };
  } catch (error) {
    console.error('❌ Failed to import models:', error.message);
    console.error('   Make sure you\'re running this from the project root directory');
    process.exit(1);
  }
}

// Test atomic stock reservation
async function testAtomicStockReservation(productModel) {
  console.log('\n🔄 Testing Atomic Stock Reservation...');
  
  // First, ensure we have a product with stock = 1
  const product = await productModel.findById(CONFIG.TEST_PRODUCT_ID);
  if (!product) {
    console.error(`❌ Product ${CONFIG.TEST_PRODUCT_ID} not found`);
    return;
  }
  
  const sizeObj = product.sizes.find(s => s.size === CONFIG.TEST_SIZE);
  if (!sizeObj) {
    console.error(`❌ Size ${CONFIG.TEST_SIZE} not found for product ${CONFIG.TEST_PRODUCT_ID}`);
    return;
  }
  
  console.log(`📦 Product: ${product.name}`);
  console.log(`📏 Size: ${CONFIG.TEST_SIZE}`);
  console.log(`📊 Initial Stock: ${sizeObj.stock}`);
  console.log(`🔒 Initial Reserved: ${sizeObj.reserved || 0}`);
  console.log(`✅ Available: ${sizeObj.stock - (sizeObj.reserved || 0)}`);
  
  // Set stock to 1 for testing
  await productModel.updateOne(
    { _id: CONFIG.TEST_PRODUCT_ID, 'sizes.size': CONFIG.TEST_SIZE },
    { $set: { 'sizes.$.stock': 1, 'sizes.$.reserved': 0 } }
  );
  
  console.log(`\n🎯 Set stock to 1 for testing`);
  
  // Simulate concurrent stock reservations
  const promises = [];
  const results = [];
  
  for (let i = 0; i < CONFIG.CONCURRENT_OPERATIONS; i++) {
    const promise = simulateStockReservation(productModel, i)
      .then(result => {
        results.push(result);
        return result;
      })
      .catch(error => {
        results.push({ success: false, error: error.message, operationId: i });
        return { success: false, error: error.message, operationId: i };
      });
    
    promises.push(promise);
  }
  
  console.log(`\n🚀 Starting ${CONFIG.CONCURRENT_OPERATIONS} concurrent stock reservations...`);
  
  const startTime = Date.now();
  await Promise.all(promises);
  const endTime = Date.now();
  
  // Analyze results
  const successfulReservations = results.filter(r => r.success);
  const failedReservations = results.filter(r => !r.success);
  
  console.log(`\n📊 Atomic Stock Reservation Results:`);
  console.log(`  ⏱️  Total time: ${endTime - startTime}ms`);
  console.log(`  ✅ Successful reservations: ${successfulReservations.length}`);
  console.log(`  ❌ Failed reservations: ${failedReservations.length}`);
  console.log(`  🎯 Expected: Only 1 successful reservation (stock = 1)`);
  
  if (successfulReservations.length === 1) {
    console.log(`  🎉 SUCCESS: Atomic operation working correctly!`);
  } else if (successfulReservations.length > 1) {
    console.log(`  ❌ CRITICAL FAILURE: Multiple successful reservations detected!`);
    console.log(`  🔍 This indicates a race condition in stock reservation`);
  } else {
    console.log(`  ⚠️  WARNING: No successful reservations - check if stock is available`);
  }
  
  // Check final stock state
  const finalProduct = await productModel.findById(CONFIG.TEST_PRODUCT_ID);
  const finalSizeObj = finalProduct.sizes.find(s => s.size === CONFIG.TEST_SIZE);
  
  console.log(`\n📦 Final Stock State:`);
  console.log(`  📊 Stock: ${finalSizeObj.stock}`);
  console.log(`  🔒 Reserved: ${finalSizeObj.reserved || 0}`);
  console.log(`  ✅ Available: ${finalSizeObj.stock - (finalSizeObj.reserved || 0)}`);
  
  return results;
}

// Simulate a single stock reservation
async function simulateStockReservation(productModel, operationId) {
  const correlationId = `op_${operationId}_${Date.now()}`;
  
  try {
    // This simulates the atomic reservation logic from your codebase
    const result = await productModel.updateOne(
      {
        _id: CONFIG.TEST_PRODUCT_ID,
        'sizes.size': CONFIG.TEST_SIZE,
        $expr: {
          $gte: [
            {
              $let: {
                vars: {
                  sizeObj: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$sizes',
                          cond: { $eq: ['$$this.size', CONFIG.TEST_SIZE] }
                        }
                      },
                      0
                    ]
                  }
                },
                in: {
                  $subtract: [
                    '$$sizeObj.stock',
                    { $ifNull: ['$$sizeObj.reserved', 0] }
                  ]
                }
              }
            },
            CONFIG.TEST_QUANTITY
          ]
        }
      },
      {
        $inc: { 'sizes.$[elem].reserved': CONFIG.TEST_QUANTITY }
      },
      {
        arrayFilters: [
          { 'elem.size': CONFIG.TEST_SIZE }
        ]
      }
    );
    
    if (result.modifiedCount > 0) {
      return {
        success: true,
        operationId,
        correlationId,
        modifiedCount: result.modifiedCount,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        operationId,
        correlationId,
        reason: 'Insufficient stock',
        timestamp: new Date().toISOString()
      };
    }
    
  } catch (error) {
    return {
      success: false,
      operationId,
      correlationId,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Test stock confirmation atomicity
async function testAtomicStockConfirmation(productModel) {
  console.log('\n🔄 Testing Atomic Stock Confirmation...');
  
  // First, set up a product with reserved stock
  await productModel.updateOne(
    { _id: CONFIG.TEST_PRODUCT_ID, 'sizes.size': CONFIG.TEST_SIZE },
    { 
      $set: { 
        'sizes.$.stock': 10,
        'sizes.$.reserved': 5
      } 
    }
  );
  
  console.log(`📦 Set up product with stock: 10, reserved: 5`);
  
  // Simulate concurrent stock confirmations
  const promises = [];
  const results = [];
  
  for (let i = 0; i < 10; i++) {
    const promise = simulateStockConfirmation(productModel, i)
      .then(result => {
        results.push(result);
        return result;
      })
      .catch(error => {
        results.push({ success: false, error: error.message, operationId: i });
        return { success: false, error: error.message, operationId: i };
      });
    
    promises.push(promise);
  }
  
  console.log(`\n🚀 Starting 10 concurrent stock confirmations...`);
  
  const startTime = Date.now();
  await Promise.all(promises);
  const endTime = Date.now();
  
  // Analyze results
  const successfulConfirmations = results.filter(r => r.success);
  const failedConfirmations = results.filter(r => !r.success);
  
  console.log(`\n📊 Atomic Stock Confirmation Results:`);
  console.log(`  ⏱️  Total time: ${endTime - startTime}ms`);
  console.log(`  ✅ Successful confirmations: ${successfulConfirmations.length}`);
  console.log(`  ❌ Failed confirmations: ${failedConfirmations.length}`);
  console.log(`  🎯 Expected: Only 5 successful confirmations (reserved = 5)`);
  
  // Check final stock state
  const finalProduct = await productModel.findById(CONFIG.TEST_PRODUCT_ID);
  const finalSizeObj = finalProduct.sizes.find(s => s.size === CONFIG.TEST_SIZE);
  
  console.log(`\n📦 Final Stock State:`);
  console.log(`  📊 Stock: ${finalSizeObj.stock}`);
  console.log(`  🔒 Reserved: ${finalSizeObj.reserved || 0}`);
  console.log(`  ✅ Available: ${finalSizeObj.stock - (finalSizeObj.reserved || 0)}`);
  
  return results;
}

// Simulate a single stock confirmation
async function simulateStockConfirmation(productModel, operationId) {
  const correlationId = `confirm_${operationId}_${Date.now()}`;
  
  try {
    // This simulates the atomic confirmation logic from your codebase
    const result = await productModel.updateOne(
      {
        _id: CONFIG.TEST_PRODUCT_ID,
        'sizes.size': CONFIG.TEST_SIZE,
        'sizes.stock': { $gte: CONFIG.TEST_QUANTITY },
        'sizes.reserved': { $gte: CONFIG.TEST_QUANTITY }
      },
      {
        $inc: { 
          'sizes.$[elem].stock': -CONFIG.TEST_QUANTITY,
          'sizes.$[elem].reserved': -CONFIG.TEST_QUANTITY
        }
      },
      {
        arrayFilters: [
          { 
            'elem.size': CONFIG.TEST_SIZE, 
            'elem.stock': { $gte: CONFIG.TEST_QUANTITY }, 
            'elem.reserved': { $gte: CONFIG.TEST_QUANTITY } 
          }
        ]
      }
    );
    
    if (result.modifiedCount > 0) {
      return {
        success: true,
        operationId,
        correlationId,
        modifiedCount: result.modifiedCount,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        operationId,
        correlationId,
        reason: 'Insufficient stock or reserved quantity',
        timestamp: new Date().toISOString()
      };
    }
    
  } catch (error) {
    return {
      success: false,
      operationId,
      correlationId,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Atomic Stock Operations Tests...');
  console.log(`📍 MongoDB URI: ${CONFIG.MONGODB_URI}`);
  console.log(`📦 Product ID: ${CONFIG.TEST_PRODUCT_ID}`);
  console.log(`📏 Size: ${CONFIG.TEST_SIZE}`);
  
  try {
    await connectToDatabase();
    const { productModel } = await getModels();
    
    // Test 1: Atomic stock reservation
    await testAtomicStockReservation(productModel);
    
    // Test 2: Atomic stock confirmation
    await testAtomicStockConfirmation(productModel);
    
    console.log('\n✅ All atomic stock tests completed!');
    console.log('\n📋 Summary:');
    console.log('  🔒 Stock reservations should be atomic (only 1 success for stock=1)');
    console.log('  ✅ Stock confirmations should respect reserved quantities');
    console.log('  🚫 No race conditions should allow overselling');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testAtomicStockReservation,
  testAtomicStockConfirmation,
  simulateStockReservation,
  simulateStockConfirmation
};
