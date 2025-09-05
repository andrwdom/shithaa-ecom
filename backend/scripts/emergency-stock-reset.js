#!/usr/bin/env node

/**
 * EMERGENCY STOCK RESET
 * This script will completely reset ALL reserved stock to 0
 * This is needed because the entire inventory is locked up
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const emergencyStockReset = async () => {
  try {
    console.log('🚨 EMERGENCY STOCK RESET - Starting...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Show current state
    console.log('📊 Current stock state:');
    const products = await productModel.find({});
    let totalReserved = 0;
    let productsWithReserved = 0;
    
    for (const product of products) {
      for (const size of product.sizes) {
        if (size.reserved > 0) {
          totalReserved += size.reserved;
          productsWithReserved++;
          console.log(`  - ${product.name} (${size.size}): ${size.stock} stock, ${size.reserved} reserved`);
        }
      }
    }
    
    console.log(`📈 Total reserved stock: ${totalReserved} units across ${productsWithReserved} size combinations`);
    
    // 2. EMERGENCY RESET - Set ALL reserved to 0
    console.log('🔄 EMERGENCY RESET: Setting ALL reserved stock to 0...');
    
    // Method 1: Update all products
    const updateResult1 = await productModel.updateMany(
      {},
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    console.log(`✅ Method 1: Updated ${updateResult1.modifiedCount} products`);
    
    // Method 2: Direct MongoDB update (more aggressive)
    const db = mongoose.connection.db;
    const updateResult2 = await db.collection('products').updateMany(
      {},
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    console.log(`✅ Method 2: Updated ${updateResult2.modifiedCount} products`);
    
    // 3. Clear all reservations
    console.log('🗑️ Clearing all reservations...');
    const reservationResult = await Reservation.deleteMany({});
    console.log(`✅ Deleted ${reservationResult.deletedCount} reservations`);
    
    // 4. Clear all checkout sessions
    console.log('🗑️ Clearing all checkout sessions...');
    const sessionResult = await CheckoutSession.deleteMany({});
    console.log(`✅ Deleted ${sessionResult.deletedCount} checkout sessions`);
    
    // 5. Verify the reset
    console.log('🔍 Verifying reset...');
    const updatedProducts = await productModel.find({});
    let remainingReserved = 0;
    let productsStillReserved = 0;
    
    for (const product of updatedProducts) {
      for (const size of product.sizes) {
        if (size.reserved > 0) {
          remainingReserved += size.reserved;
          productsStillReserved++;
          console.log(`  ⚠️ ${product.name} (${size.size}): ${size.stock} stock, ${size.reserved} reserved`);
        }
      }
    }
    
    if (remainingReserved === 0) {
      console.log('🎉 SUCCESS: All reserved stock has been cleared!');
    } else {
      console.log(`⚠️ WARNING: ${remainingReserved} units still reserved across ${productsStillReserved} size combinations`);
    }
    
    // 6. Test a few products
    console.log('🧪 Testing stock availability...');
    const { checkStockAvailability } = await import('../utils/stock.js');
    
    for (const product of updatedProducts.slice(0, 3)) {
      if (product.sizes.length > 0) {
        const size = product.sizes[0];
        const stockCheck = await checkStockAvailability(product._id, size.size, 1);
        console.log(`  - ${product.name} (${size.size}): Available=${stockCheck.available}, Stock=${stockCheck.availableStock}`);
      }
    }
    
    console.log('🎉 EMERGENCY STOCK RESET COMPLETED!');
    console.log('💡 All products should now be available for purchase');
    
  } catch (error) {
    console.error('❌ Error during emergency reset:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the emergency reset
emergencyStockReset();
