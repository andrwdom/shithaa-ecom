#!/usr/bin/env node

/**
 * Debug Stock Cleanup Script
 * This script will debug and fix the reserved stock issue
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const debugStockCleanup = async () => {
  try {
    console.log('🔍 Starting stock debug and cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Find the test11 product
    console.log('🔍 Finding test11 product...');
    const product = await productModel.findOne({ name: 'test11' });
    
    if (!product) {
      console.log('❌ test11 product not found');
      return;
    }
    
    console.log('📦 Found product:', {
      name: product.name,
      _id: product._id,
      sizes: product.sizes.map(s => ({
        size: s.size,
        stock: s.stock,
        reserved: s.reserved
      }))
    });
    
    // 2. Reset reserved stock for this specific product
    console.log('🔄 Resetting reserved stock for test11...');
    const updateResult = await productModel.updateOne(
      { _id: product._id },
      { 
        $set: { 
          'sizes.$[elem].reserved': 0 
        } 
      },
      { 
        arrayFilters: [{ 'elem.size': 'S' }] 
      }
    );
    
    console.log('✅ Update result:', updateResult);
    
    // 3. Verify the update
    console.log('🔍 Verifying update...');
    const updatedProduct = await productModel.findById(product._id);
    console.log('📦 Updated product:', {
      name: updatedProduct.name,
      sizes: updatedProduct.sizes.map(s => ({
        size: s.size,
        stock: s.stock,
        reserved: s.reserved
      }))
    });
    
    // 4. Test stock availability
    console.log('🧪 Testing stock availability...');
    const { checkStockAvailability } = await import('../utils/stock.js');
    const stockCheck = await checkStockAvailability(product._id, 'S', 1);
    console.log('📊 Stock check result:', stockCheck);
    
    console.log('🎉 Debug and cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the debug
debugStockCleanup();
