#!/usr/bin/env node

/**
 * Direct Stock Clear Script
 * This script directly clears reserved stock for specific products
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const directStockClear = async () => {
  try {
    console.log('🚨 DIRECT STOCK CLEAR - Starting...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Find the specific product that's causing issues
    const productId = '68a14baea30c0f061c265156';
    const product = await productModel.findById(productId);
    
    if (!product) {
      console.log('❌ Product not found');
      return;
    }
    
    console.log(`📊 Product found: ${product.name}`);
    console.log('📊 Current stock state:');
    for (const size of product.sizes) {
      console.log(`  - ${size.size}: ${size.stock} stock, ${size.reserved} reserved (available: ${size.stock - size.reserved})`);
    }
    
    // Clear reserved stock for all sizes
    console.log('🔄 Clearing reserved stock...');
    for (const size of product.sizes) {
      if (size.reserved > 0) {
        console.log(`  - Clearing ${size.reserved} reserved units for size ${size.size}`);
        size.reserved = 0;
      }
    }
    
    // Save the product
    await product.save();
    console.log('✅ Product updated successfully');
    
    // Verify the update
    const updatedProduct = await productModel.findById(productId);
    console.log('📊 Updated stock state:');
    for (const size of updatedProduct.sizes) {
      console.log(`  - ${size.size}: ${size.stock} stock, ${size.reserved} reserved (available: ${size.stock - size.reserved})`);
    }
    
    // Test stock availability
    console.log('🧪 Testing stock availability...');
    const { checkStockAvailability } = await import('../utils/stock.js');
    
    for (const size of updatedProduct.sizes) {
      const stockCheck = await checkStockAvailability(productId, size.size, 1);
      console.log(`  - ${size.size}: Available=${stockCheck.available}, Stock=${stockCheck.availableStock}`);
    }
    
    console.log('🎉 DIRECT STOCK CLEAR COMPLETED!');
    
  } catch (error) {
    console.error('❌ Error during direct clear:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the direct clear
directStockClear();
