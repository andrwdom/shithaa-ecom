#!/usr/bin/env node

/**
 * Emergency Stock Cleanup Script
 * This script resets all reserved stock to 0 to fix the current issue
 * where all stock is reserved but not being released properly
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const emergencyStockCleanup = async () => {
  try {
    console.log('🚨 Starting emergency stock cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Reset all reserved fields to 0
    console.log('🧹 Resetting all reserved stock to 0...');
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
        status: 'expired',
        updatedAt: new Date()
      }
    );
    console.log(`✅ Marked ${reservationResult.modifiedCount} reservations as expired`);
    
    // 3. Clean up expired checkout sessions
    console.log('🗑️ Cleaning up expired checkout sessions...');
    const sessionResult = await CheckoutSession.deleteMany({
      $or: [
        { status: 'expired' },
        { expiresAt: { $lt: new Date() } }
      ]
    });
    console.log(`✅ Deleted ${sessionResult.deletedCount} expired checkout sessions`);
    
    // 4. Show current stock status
    console.log('\n📊 Current stock status:');
    const products = await productModel.find({}, 'name sizes.stock sizes.reserved sizes.size').limit(10);
    
    products.forEach(product => {
      console.log(`\n${product.name}:`);
      product.sizes.forEach(size => {
        const available = size.stock - (size.reserved || 0);
        console.log(`  ${size.size}: Stock=${size.stock}, Reserved=${size.reserved || 0}, Available=${available}`);
      });
    });
    
    console.log('\n🎉 Emergency stock cleanup completed successfully!');
    console.log('✅ All reserved stock has been reset to 0');
    console.log('✅ All active reservations have been marked as expired');
    console.log('✅ Expired checkout sessions have been cleaned up');
    
  } catch (error) {
    console.error('❌ Emergency stock cleanup failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the cleanup
emergencyStockCleanup()
  .then(() => {
    console.log('\n🎉 Emergency cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Emergency cleanup failed:', error);
    process.exit(1);
  });
