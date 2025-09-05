#!/usr/bin/env node

/**
 * Fix Specific Product Stock Script
 * Directly fixes the test11 product that has corrupted stock data
 */

import mongoose from 'mongoose';
import productModel from './backend/models/productModel.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables manually
try {
  const envPath = join(process.cwd(), 'backend', '.env');
  const envFile = readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  console.log('⚠️  Could not load .env file, using system environment variables');
}

async function fixSpecificProduct() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000, // 45 second timeout
    });
    console.log('✅ Connected to MongoDB');

    // Target the specific problematic product
    const productId = '68a14baea30c0f061c265156';
    console.log(`🔍 Checking product: ${productId}`);

    // Get the product
    const product = await productModel.findById(productId);
    if (!product) {
      console.log('❌ Product not found');
      return;
    }

    console.log(`📊 Current state of ${product.name}:`);
    product.sizes.forEach(size => {
      console.log(`   Size ${size.size}: stock=${size.stock}, reserved=${size.reserved}, available=${size.stock - size.reserved}`);
    });

    // Find sizes with reserved > stock
    const corruptedSizes = product.sizes.filter(size => size.reserved > size.stock);
    
    if (corruptedSizes.length === 0) {
      console.log('✅ No corruption found in this product');
      return;
    }

    console.log(`🔧 Found ${corruptedSizes.length} corrupted sizes`);

    // Fix each corrupted size
    for (const size of corruptedSizes) {
      console.log(`   Fixing size ${size.size}: reserved=${size.reserved} > stock=${size.stock}`);
      
      // Reset reserved to 0
      const result = await productModel.updateOne(
        { 
          _id: productId,
          'sizes.size': size.size
        },
        { 
          $set: { 'sizes.$.reserved': 0 }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`   ✅ Fixed size ${size.size}`);
      } else {
        console.log(`   ❌ Failed to fix size ${size.size}`);
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const updatedProduct = await productModel.findById(productId);
    console.log(`📊 Updated state of ${updatedProduct.name}:`);
    updatedProduct.sizes.forEach(size => {
      console.log(`   Size ${size.size}: stock=${size.stock}, reserved=${size.reserved}, available=${size.stock - size.reserved}`);
    });

    console.log('✅ Stock corruption fix completed!');

  } catch (error) {
    console.error('❌ Error fixing stock corruption:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
fixSpecificProduct();
