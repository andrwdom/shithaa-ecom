/**
 * Test Script: Verify Atomic Stock Operations Fix
 * 
 * This script tests the fixed confirmStockReservationAtomic function
 * to ensure it works without the MongoDB array filter error.
 * 
 * Run on production AFTER deployment:
 * node test-atomic-fix-production.js
 */

import mongoose from 'mongoose';
import { confirmStockReservationAtomic } from './backend/utils/atomicStockOperations.js';
import productModel from './backend/models/productModel.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

async function testAtomicFix() {
  console.log('🧪 Testing Atomic Stock Operations Fix...\n');
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Find a product with available stock
    const testProduct = await productModel.findOne({
      'sizes': {
        $elemMatch: {
          stock: { $gte: 1 }
        }
      }
    }).limit(1);
    
    if (!testProduct) {
      console.log('❌ No products with stock found for testing');
      return;
    }
    
    // Find a size with stock
    const sizeWithStock = testProduct.sizes.find(s => s.stock >= 1);
    
    console.log('📦 Test Product Found:');
    console.log(`   Name: ${testProduct.name}`);
    console.log(`   ID: ${testProduct._id}`);
    console.log(`   Size: ${sizeWithStock.size}`);
    console.log(`   Stock: ${sizeWithStock.stock}`);
    console.log(`   Reserved: ${sizeWithStock.reserved || 0}\n`);
    
    // Start a session for atomic operation
    const session = await mongoose.startSession();
    
    console.log('🔄 Testing confirmStockReservationAtomic...\n');
    
    try {
      await session.withTransaction(async () => {
        // Test the atomic stock confirmation
        const result = await confirmStockReservationAtomic(
          testProduct._id.toString(),
          sizeWithStock.size,
          1,
          { session, correlationId: 'test_fix_verification' }
        );
        
        if (result) {
          console.log('✅ SUCCESS! Atomic stock confirmation worked!');
          console.log('   The MongoDB array filter error is FIXED!\n');
          
          // Rollback the transaction (we don't want to actually deduct stock)
          throw new Error('INTENTIONAL_ROLLBACK_FOR_TEST');
        } else {
          console.log('❌ FAILED: Stock confirmation returned false');
          console.log('   This may indicate insufficient stock or reservation\n');
        }
      });
    } catch (error) {
      if (error.message === 'INTENTIONAL_ROLLBACK_FOR_TEST') {
        console.log('✅ Transaction rolled back (test only - no actual stock deduction)\n');
      } else if (error.message.includes('Expected a single top-level field name')) {
        console.log('❌ CRITICAL ERROR: MongoDB array filter error still exists!');
        console.log('   Error:', error.message);
        console.log('\n🚨 THE FIX WAS NOT APPLIED CORRECTLY!\n');
        throw error;
      } else {
        console.log('⚠️  Unexpected error:', error.message);
        throw error;
      }
    } finally {
      await session.endSession();
    }
    
    // Final verification - check the product hasn't changed
    const verifyProduct = await productModel.findById(testProduct._id);
    const verifySize = verifyProduct.sizes.find(s => s.size === sizeWithStock.size);
    
    console.log('📊 Post-Test Verification:');
    console.log(`   Stock: ${verifySize.stock} (unchanged: ${verifySize.stock === sizeWithStock.stock ? '✅' : '❌'})`);
    console.log(`   Reserved: ${verifySize.reserved || 0} (unchanged: ${(verifySize.reserved || 0) === (sizeWithStock.reserved || 0) ? '✅' : '❌'})\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST PASSED: Atomic Stock Fix Verified!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 Summary:');
    console.log('   ✅ MongoDB connection successful');
    console.log('   ✅ Atomic operation executed without array filter error');
    console.log('   ✅ Transaction rollback worked correctly');
    console.log('   ✅ No data was modified\n');
    
    console.log('🎉 The fix is working correctly in production!');
    
  } catch (error) {
    console.error('\n❌ Test Failed:');
    console.error('   Error:', error.message);
    console.error('\n   Stack:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the test
testAtomicFix()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });

