#!/usr/bin/env node

/**
 * Direct MongoDB Command to Fix Stock
 * Uses direct MongoDB operations to fix the corrupted stock
 */

import mongoose from 'mongoose';
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

async function fixStockDirect() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('products');

    // Target the specific product
    const productId = new mongoose.Types.ObjectId('68a14baea30c0f061c265156');
    
    console.log('🔍 Checking product before fix...');
    const product = await collection.findOne({ _id: productId });
    if (product) {
      console.log(`📊 Product: ${product.name}`);
      product.sizes.forEach(size => {
        console.log(`   Size ${size.size}: stock=${size.stock}, reserved=${size.reserved}`);
      });
    }

    // Fix: Reset all reserved values to 0 for this product
    console.log('🔧 Resetting all reserved values to 0...');
    const result = await collection.updateOne(
      { _id: productId },
      { 
        $set: { 
          'sizes.$[].reserved': 0 
        }
      }
    );

    console.log(`✅ Update result: ${result.modifiedCount} documents modified`);

    // Verify the fix
    console.log('🔍 Verifying fix...');
    const updatedProduct = await collection.findOne({ _id: productId });
    if (updatedProduct) {
      console.log(`📊 Updated product: ${updatedProduct.name}`);
      updatedProduct.sizes.forEach(size => {
        console.log(`   Size ${size.size}: stock=${size.stock}, reserved=${size.reserved}, available=${size.stock - size.reserved}`);
      });
    }

    console.log('✅ Stock fix completed!');

  } catch (error) {
    console.error('❌ Error fixing stock:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
fixStockDirect();
