#!/usr/bin/env node

/**
 * Test Stock Fix Script
 * This script tests the stock system after the fix
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const testStockFix = async () => {
  try {
    console.log('🧪 Testing stock system after fix...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Check current stock state
    console.log('📊 Current stock state:');
    const products = await productModel.find({});
    
    for (const product of products.slice(0, 5)) { // Show first 5 products
      console.log(`  - ${product.name}:`);
      for (const size of product.sizes) {
        if (size.reserved > 0) {
          console.log(`    ${size.size}: ${size.stock} stock, ${size.reserved} reserved (available: ${size.stock - size.reserved})`);
        }
      }
    }
    
    // 2. Test stock availability check
    console.log('🧪 Testing stock availability...');
    const { checkStockAvailability } = await import('../utils/stock.js');
    
    for (const product of products.slice(0, 3)) {
      if (product.sizes.length > 0) {
        const size = product.sizes[0];
        const stockCheck = await checkStockAvailability(product._id, size.size, 1);
        console.log(`  - ${product.name} (${size.size}): Available=${stockCheck.available}, Stock=${stockCheck.availableStock}`);
      }
    }
    
    console.log('🎉 Stock system test completed!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the test
testStockFix();
