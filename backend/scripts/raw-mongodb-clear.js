#!/usr/bin/env node

/**
 * Raw MongoDB Clear Script
 * This script uses raw MongoDB commands to force clear reserved stock
 */

import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const rawMongoClear = async () => {
  let client;
  try {
    console.log('💥 RAW MONGODB CLEAR - Starting...');
    
    // Connect directly to MongoDB
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('shithaa-ecom');
    const collection = db.collection('products');
    
    // First, let's see what we're dealing with
    console.log('🔍 Checking current state...');
    const allProducts = await collection.find({}).toArray();
    console.log(`📊 Found ${allProducts.length} products`);
    
    let totalReserved = 0;
    for (const product of allProducts) {
      if (product.sizes && Array.isArray(product.sizes)) {
        for (const size of product.sizes) {
          if (size.reserved && size.reserved > 0) {
            totalReserved += size.reserved;
            console.log(`  - ${product.name} (${size.size}): ${size.stock} stock, ${size.reserved} reserved`);
          }
        }
      }
    }
    
    console.log(`📊 Total reserved units: ${totalReserved}`);
    
    if (totalReserved === 0) {
      console.log('🤔 No reserved stock found, but you\'re still getting errors...');
      console.log('🔍 Let me check the exact product from the error...');
      
      // Check the specific product from the error
      const errorProduct = await collection.findOne({ 
        name: "Pink with flower print non-feeding lounge wear" 
      });
      
      if (errorProduct) {
        console.log(`📦 Found error product: ${errorProduct.name}`);
        console.log(`  ID: ${errorProduct._id}`);
        if (errorProduct.sizes) {
          for (const size of errorProduct.sizes) {
            console.log(`    ${size.size}: stock=${size.stock}, reserved=${size.reserved || 0}`);
          }
        }
      }
    }
    
    // Method 1: Use $unset to remove reserved field entirely
    console.log('\n🔄 Method 1: Removing reserved field entirely...');
    const result1 = await collection.updateMany(
      { 'sizes.reserved': { $exists: true } },
      { $unset: { 'sizes.$[].reserved': 1 } }
    );
    console.log(`✅ Removed reserved field from ${result1.modifiedCount} products`);
    
    // Method 2: Set all reserved to 0
    console.log('🔄 Method 2: Setting all reserved to 0...');
    const result2 = await collection.updateMany(
      {},
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    console.log(`✅ Set reserved to 0 for ${result2.modifiedCount} products`);
    
    // Method 3: Use arrayFilters to target specific elements
    console.log('🔄 Method 3: Using arrayFilters...');
    const result3 = await collection.updateMany(
      { 'sizes.reserved': { $gt: 0 } },
      { $set: { 'sizes.$[elem].reserved': 0 } },
      { arrayFilters: [{ 'elem.reserved': { $gt: 0 } }] }
    );
    console.log(`✅ Updated ${result3.modifiedCount} products with arrayFilters`);
    
    // Method 4: Force update each product individually
    console.log('🔄 Method 4: Force updating each product...');
    let forceUpdated = 0;
    for (const product of allProducts) {
      if (product.sizes && Array.isArray(product.sizes)) {
        let needsUpdate = false;
        const newSizes = product.sizes.map(size => {
          if (size.reserved && size.reserved > 0) {
            needsUpdate = true;
            return { ...size, reserved: 0 };
          }
          return size;
        });
        
        if (needsUpdate) {
          await collection.updateOne(
            { _id: product._id },
            { $set: { sizes: newSizes } }
          );
          forceUpdated++;
        }
      }
    }
    console.log(`✅ Force updated ${forceUpdated} products individually`);
    
    // Method 5: Nuclear option - recreate the sizes array
    console.log('🔄 Method 5: Nuclear option - recreating sizes array...');
    let nuclearUpdated = 0;
    for (const product of allProducts) {
      if (product.sizes && Array.isArray(product.sizes)) {
        const cleanSizes = product.sizes.map(size => ({
          size: size.size,
          stock: size.stock,
          reserved: 0  // Force to 0
        }));
        
        await collection.updateOne(
          { _id: product._id },
          { $set: { sizes: cleanSizes } }
        );
        nuclearUpdated++;
      }
    }
    console.log(`✅ Nuclear updated ${nuclearUpdated} products`);
    
    // Final verification
    console.log('\n🔍 Final verification...');
    const finalProducts = await collection.find({}).toArray();
    let finalReserved = 0;
    for (const product of finalProducts) {
      if (product.sizes && Array.isArray(product.sizes)) {
        for (const size of product.sizes) {
          if (size.reserved && size.reserved > 0) {
            finalReserved += size.reserved;
            console.log(`  - ${product.name} (${size.size}): ${size.reserved} reserved`);
          }
        }
      }
    }
    
    if (finalReserved === 0) {
      console.log('🎉 SUCCESS: All reserved stock has been cleared!');
    } else {
      console.log(`⚠️ WARNING: ${finalReserved} units still reserved`);
    }
    
    console.log('\n🎉 RAW MONGODB CLEAR COMPLETED!');
    
  } catch (error) {
    console.error('❌ Error during raw MongoDB clear:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('👋 Disconnected from MongoDB');
    }
    process.exit(0);
  }
};

// Run the raw MongoDB clear
rawMongoClear();
