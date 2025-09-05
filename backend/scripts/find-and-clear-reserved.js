#!/usr/bin/env node

/**
 * Find and Clear Reserved Stock Script
 * This script finds ALL products with reserved stock and clears them
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const findAndClearReserved = async () => {
  try {
    console.log('🔍 FINDING AND CLEARING ALL RESERVED STOCK...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Find ALL products with reserved stock
    console.log('🔍 Finding products with reserved stock...');
    const productsWithReserved = await productModel.find({
      'sizes.reserved': { $gt: 0 }
    });
    
    console.log(`📊 Found ${productsWithReserved.length} products with reserved stock:`);
    
    if (productsWithReserved.length === 0) {
      console.log('🎉 No products with reserved stock found!');
      return;
    }
    
    // Show current state
    for (const product of productsWithReserved) {
      console.log(`\n📦 Product: ${product.name} (${product._id})`);
      for (const size of product.sizes) {
        if (size.reserved > 0) {
          console.log(`  - ${size.size}: ${size.stock} stock, ${size.reserved} reserved (available: ${size.stock - size.reserved})`);
        }
      }
    }
    
    // Clear reserved stock for all products
    console.log('\n🔄 Clearing reserved stock...');
    let totalCleared = 0;
    
    for (const product of productsWithReserved) {
      let productCleared = 0;
      for (const size of product.sizes) {
        if (size.reserved > 0) {
          console.log(`  - Clearing ${size.reserved} reserved units for ${product.name} (${size.size})`);
          productCleared += size.reserved;
          size.reserved = 0;
        }
      }
      
      if (productCleared > 0) {
        await product.save();
        totalCleared += productCleared;
        console.log(`  ✅ Cleared ${productCleared} units for ${product.name}`);
      }
    }
    
    console.log(`\n🎉 CLEARED ${totalCleared} total reserved units across ${productsWithReserved.length} products!`);
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingReserved = await productModel.find({
      'sizes.reserved': { $gt: 0 }
    });
    
    if (remainingReserved.length === 0) {
      console.log('✅ SUCCESS: All reserved stock has been cleared!');
    } else {
      console.log(`⚠️ WARNING: ${remainingReserved.length} products still have reserved stock:`);
      for (const product of remainingReserved) {
        console.log(`  - ${product.name}:`);
        for (const size of product.sizes) {
          if (size.reserved > 0) {
            console.log(`    ${size.size}: ${size.reserved} reserved`);
          }
        }
      }
    }
    
    // Test stock availability for a few products
    console.log('\n🧪 Testing stock availability...');
    const { checkStockAvailability } = await import('../utils/stock.js');
    
    const testProducts = await productModel.find({}).limit(3);
    for (const product of testProducts) {
      if (product.sizes.length > 0) {
        const size = product.sizes[0];
        const stockCheck = await checkStockAvailability(product._id, size.size, 1);
        console.log(`  - ${product.name} (${size.size}): Available=${stockCheck.available}, Stock=${stockCheck.availableStock}`);
      }
    }
    
    console.log('\n🎉 FIND AND CLEAR COMPLETED!');
    
  } catch (error) {
    console.error('❌ Error during find and clear:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the find and clear
findAndClearReserved();
