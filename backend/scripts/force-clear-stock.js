#!/usr/bin/env node

/**
 * Force Clear Stock Script
 * This script forcefully clears all reserved stock using direct MongoDB operations
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const forceClearStock = async () => {
  try {
    console.log('🚨 FORCE CLEARING ALL RESERVED STOCK...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Method 1: Direct MongoDB update using updateMany
    console.log('🔄 Method 1: Using updateMany to clear all reserved stock...');
    const result1 = await productModel.updateMany(
      { 'sizes.reserved': { $gt: 0 } },
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    console.log(`✅ Method 1: Updated ${result1.modifiedCount} products`);
    
    // Method 2: Find and update each product individually
    console.log('🔄 Method 2: Finding products with reserved stock...');
    const productsWithReserved = await productModel.find({
      'sizes.reserved': { $gt: 0 }
    });
    
    console.log(`📊 Found ${productsWithReserved.length} products with reserved stock`);
    
    let updatedCount = 0;
    for (const product of productsWithReserved) {
      let needsUpdate = false;
      for (const size of product.sizes) {
        if (size.reserved > 0) {
          console.log(`  - ${product.name} (${size.size}): ${size.stock} stock, ${size.reserved} reserved`);
          size.reserved = 0;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await product.save();
        updatedCount++;
        console.log(`  ✅ Cleared reserved stock for ${product.name}`);
      }
    }
    
    console.log(`✅ Method 2: Updated ${updatedCount} products`);
    
    // Method 3: Direct MongoDB collection update
    console.log('🔄 Method 3: Direct MongoDB collection update...');
    const db = mongoose.connection.db;
    const result3 = await db.collection('products').updateMany(
      { 'sizes.reserved': { $gt: 0 } },
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    console.log(`✅ Method 3: Updated ${result3.modifiedCount} products`);
    
    // Verify the cleanup
    console.log('🔍 Verifying cleanup...');
    const remainingReserved = await productModel.find({
      'sizes.reserved': { $gt: 0 }
    });
    
    if (remainingReserved.length === 0) {
      console.log('🎉 SUCCESS: All reserved stock has been cleared!');
    } else {
      console.log(`⚠️ WARNING: ${remainingReserved.length} products still have reserved stock:`);
      for (const product of remainingReserved) {
        for (const size of product.sizes) {
          if (size.reserved > 0) {
            console.log(`  - ${product.name} (${size.size}): ${size.reserved} reserved`);
          }
        }
      }
    }
    
    // Test stock availability
    console.log('🧪 Testing stock availability...');
    const { checkStockAvailability } = await import('../utils/stock.js');
    
    const testProducts = await productModel.find({}).limit(3);
    for (const product of testProducts) {
      if (product.sizes.length > 0) {
        const size = product.sizes[0];
        const stockCheck = await checkStockAvailability(product._id, size.size, 1);
        console.log(`  - ${product.name} (${size.size}): Available=${stockCheck.available}, Stock=${stockCheck.availableStock}`);
      }
    }
    
    console.log('🎉 FORCE CLEAR COMPLETED!');
    
  } catch (error) {
    console.error('❌ Error during force clear:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the force clear
forceClearStock();
