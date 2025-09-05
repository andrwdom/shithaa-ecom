#!/usr/bin/env node

/**
 * Brute Force Clear Script
 * This script directly queries MongoDB and clears ALL reserved stock using multiple methods
 */

import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const bruteForceClear = async () => {
  try {
    console.log('💥 BRUTE FORCE CLEARING ALL RESERVED STOCK...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Method 1: Direct MongoDB collection query
    console.log('🔍 Method 1: Direct MongoDB query...');
    const products = await db.collection('products').find({}).toArray();
    console.log(`📊 Found ${products.length} total products`);
    
    let reservedFound = 0;
    for (const product of products) {
      if (product.sizes && Array.isArray(product.sizes)) {
        for (const size of product.sizes) {
          if (size.reserved && size.reserved > 0) {
            reservedFound++;
            console.log(`  - ${product.name} (${size.size}): ${size.stock} stock, ${size.reserved} reserved`);
          }
        }
      }
    }
    
    console.log(`📊 Found ${reservedFound} size combinations with reserved stock`);
    
    if (reservedFound === 0) {
      console.log('🤔 No reserved stock found in direct query either...');
      
      // Let's check what the actual data looks like
      console.log('🔍 Checking first few products for structure...');
      for (let i = 0; i < Math.min(3, products.length); i++) {
        const product = products[i];
        console.log(`\n📦 Product ${i + 1}: ${product.name}`);
        console.log(`  ID: ${product._id}`);
        if (product.sizes && Array.isArray(product.sizes)) {
          console.log(`  Sizes: ${product.sizes.length}`);
          for (const size of product.sizes) {
            console.log(`    - ${size.size}: stock=${size.stock}, reserved=${size.reserved || 0}`);
          }
        } else {
          console.log(`  No sizes array found`);
        }
      }
    } else {
      // Clear the reserved stock
      console.log('🔄 Clearing reserved stock...');
      
      // Method 1: Update all products to set reserved to 0
      const result1 = await db.collection('products').updateMany(
        { 'sizes.reserved': { $gt: 0 } },
        { $set: { 'sizes.$[].reserved': 0 } }
      );
      console.log(`✅ Method 1: Updated ${result1.modifiedCount} products`);
      
      // Method 2: Update each product individually
      let updatedCount = 0;
      for (const product of products) {
        if (product.sizes && Array.isArray(product.sizes)) {
          let needsUpdate = false;
          for (const size of product.sizes) {
            if (size.reserved && size.reserved > 0) {
              size.reserved = 0;
              needsUpdate = true;
            }
          }
          
          if (needsUpdate) {
            await db.collection('products').updateOne(
              { _id: product._id },
              { $set: { sizes: product.sizes } }
            );
            updatedCount++;
          }
        }
      }
      console.log(`✅ Method 2: Updated ${updatedCount} products individually`);
      
      // Method 3: Use $unset to remove reserved field entirely
      const result3 = await db.collection('products').updateMany(
        { 'sizes.reserved': { $exists: true } },
        { $unset: { 'sizes.$[].reserved': 1 } }
      );
      console.log(`✅ Method 3: Removed reserved field from ${result3.modifiedCount} products`);
      
      // Method 4: Set all reserved to 0 using $set
      const result4 = await db.collection('products').updateMany(
        {},
        { $set: { 'sizes.$[].reserved': 0 } }
      );
      console.log(`✅ Method 4: Set reserved to 0 for all sizes in ${result4.modifiedCount} products`);
    }
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    const finalProducts = await db.collection('products').find({}).toArray();
    let finalReserved = 0;
    for (const product of finalProducts) {
      if (product.sizes && Array.isArray(product.sizes)) {
        for (const size of product.sizes) {
          if (size.reserved && size.reserved > 0) {
            finalReserved++;
            console.log(`  - ${product.name} (${size.size}): ${size.reserved} reserved`);
          }
        }
      }
    }
    
    if (finalReserved === 0) {
      console.log('🎉 SUCCESS: All reserved stock has been cleared!');
    } else {
      console.log(`⚠️ WARNING: ${finalReserved} size combinations still have reserved stock`);
    }
    
    console.log('\n🎉 BRUTE FORCE CLEAR COMPLETED!');
    
  } catch (error) {
    console.error('❌ Error during brute force clear:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the brute force clear
bruteForceClear();
