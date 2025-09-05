#!/usr/bin/env node

/**
 * Cleanup Reserved Stock Script
 * This script resets all reserved stock to 0 to fix the current issue
 * where all stock is reserved but not being released properly
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const cleanupReservedStock = async () => {
  try {
    console.log('🧹 Starting reserved stock cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Reset all reserved fields to 0
    console.log('🔄 Resetting all reserved stock to 0...');
    const resetResult = await productModel.updateMany(
      {},
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    console.log(`✅ Reset reserved stock for ${resetResult.modifiedCount} products`);
    
    // 2. Mark all active reservations as expired
    console.log('🔄 Marking all active reservations as expired...');
    const reservationResult = await Reservation.updateMany(
      { status: 'active' },
      { 
        $set: { 
          status: 'expired',
          expiredAt: new Date()
        } 
      }
    );
    console.log(`✅ Marked ${reservationResult.modifiedCount} reservations as expired`);
    
    // 3. Mark all active checkout sessions as expired
    console.log('🔄 Marking all active checkout sessions as expired...');
    const sessionResult = await CheckoutSession.updateMany(
      { status: { $in: ['pending', 'awaiting_payment'] } },
      { 
        $set: { 
          status: 'expired',
          expiredAt: new Date()
        } 
      }
    );
    console.log(`✅ Marked ${sessionResult.modifiedCount} checkout sessions as expired`);
    
    // 4. Verify the cleanup
    console.log('🔍 Verifying cleanup...');
    const productsWithReserved = await productModel.find({
      'sizes.reserved': { $gt: 0 }
    });
    
    if (productsWithReserved.length === 0) {
      console.log('✅ All reserved stock has been cleared!');
    } else {
      console.log(`⚠️ ${productsWithReserved.length} products still have reserved stock`);
      productsWithReserved.forEach(product => {
        console.log(`  - ${product.name}: ${product.sizes.map(s => `${s.size}:${s.reserved}`).join(', ')}`);
      });
    }
    
    console.log('🎉 Reserved stock cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the cleanup
cleanupReservedStock();
