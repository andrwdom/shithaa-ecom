#!/usr/bin/env node

/**
 * Fix Stock Corruption Script
 * Fixes products where reserved > stock (impossible state)
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

async function fixStockCorruption() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find products with corrupted stock (reserved > stock)
    const corruptedProducts = await productModel.find({
      'sizes.reserved': { $gt: 0 },
      $expr: {
        $gt: ['$sizes.reserved', '$sizes.stock']
      }
    });

    console.log(`🔍 Found ${corruptedProducts.length} products with corrupted stock`);

    if (corruptedProducts.length === 0) {
      console.log('✅ No corrupted products found');
      return;
    }

    // Fix each corrupted product
    for (const product of corruptedProducts) {
      console.log(`\n🔧 Fixing product: ${product.name} (${product._id})`);
      
      let fixed = false;
      for (const sizeObj of product.sizes) {
        if (sizeObj.reserved > sizeObj.stock) {
          console.log(`   Size ${sizeObj.size}: reserved=${sizeObj.reserved}, stock=${sizeObj.stock}`);
          console.log(`   → Setting reserved to 0 (stock will be restored)`);
          
          // Reset reserved to 0
          await productModel.updateOne(
            { 
              _id: product._id,
              'sizes.size': sizeObj.size
            },
            { 
              $set: { 'sizes.$.reserved': 0 }
            }
          );
          
          fixed = true;
        }
      }
      
      if (fixed) {
        console.log(`   ✅ Fixed product: ${product.name}`);
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const remainingCorrupted = await productModel.find({
      'sizes.reserved': { $gt: 0 },
      $expr: {
        $gt: ['$sizes.reserved', '$sizes.stock']
      }
    });

    if (remainingCorrupted.length === 0) {
      console.log('✅ All stock corruption fixed!');
    } else {
      console.log(`❌ Still ${remainingCorrupted.length} corrupted products remaining`);
    }

    // Show current stock state for the problematic product
    const testProduct = await productModel.findById('68a14baea30c0f061c265156');
    if (testProduct) {
      console.log('\n📊 Current state of test11:');
      testProduct.sizes.forEach(size => {
        console.log(`   Size ${size.size}: stock=${size.stock}, reserved=${size.reserved}, available=${size.stock - size.reserved}`);
      });
    }

  } catch (error) {
    console.error('❌ Error fixing stock corruption:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
fixStockCorruption();
