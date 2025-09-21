#!/usr/bin/env node

/**
 * Force Cleanup Script - IMMEDIATE FIX
 * This script immediately releases ALL reserved stock
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const forceCleanup = async () => {
  try {
    console.log('🚨 FORCE CLEANUP: Starting immediate stock release...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Get current reserved stock count
    const beforeStats = await productModel.aggregate([
      { $unwind: '$sizes' },
      { $group: { _id: null, totalReserved: { $sum: '$sizes.reserved' } } }
    ]);
    const beforeReserved = beforeStats[0]?.totalReserved || 0;
    console.log(`📊 Before: ${beforeReserved} units reserved`);
    
    // 2. FORCE RESET ALL RESERVED STOCK TO 0
    console.log('🔄 FORCE RESET: Setting all reserved stock to 0...');
    const resetResult = await productModel.updateMany(
      {},
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    console.log(`✅ Reset ${resetResult.modifiedCount} products`);
    
    // 3. Mark all active reservations as expired
    console.log('🔄 Marking all reservations as expired...');
    const reservationResult = await Reservation.updateMany(
      { status: 'active' },
      { 
        $set: { 
          status: 'expired',
          expiredAt: new Date(),
          reason: 'Force cleanup'
        } 
      }
    );
    console.log(`✅ Expired ${reservationResult.modifiedCount} reservations`);
    
    // 4. Mark all checkout sessions as expired
    console.log('🔄 Marking all checkout sessions as expired...');
    const sessionResult = await CheckoutSession.updateMany(
      { 
        status: { $in: ['pending', 'awaiting_payment'] },
        stockReserved: true
      },
      { 
        $set: { 
          status: 'expired',
          stockReserved: false,
          expiredAt: new Date()
        } 
      }
    );
    console.log(`✅ Expired ${sessionResult.modifiedCount} checkout sessions`);
    
    // 5. Verify cleanup
    const afterStats = await productModel.aggregate([
      { $unwind: '$sizes' },
      { $group: { _id: null, totalReserved: { $sum: '$sizes.reserved' } } }
    ]);
    const afterReserved = afterStats[0]?.totalReserved || 0;
    console.log(`📊 After: ${afterReserved} units reserved`);
    
    console.log('🎉 FORCE CLEANUP COMPLETED!');
    console.log(`📈 Released ${beforeReserved - afterReserved} units of stock`);
    console.log('✅ All abandoned orders have been cleaned up');
    
  } catch (error) {
    console.error('❌ Force cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run immediately
forceCleanup();
