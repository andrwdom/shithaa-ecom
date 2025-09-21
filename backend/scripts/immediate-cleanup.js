#!/usr/bin/env node

/**
 * Immediate Stock Cleanup Script
 * This script immediately releases all reserved stock
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const immediateCleanup = async () => {
  try {
    console.log('🚨 Starting immediate stock cleanup...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Get current stock statistics before cleanup
    const beforeStats = await productModel.aggregate([
      {
        $unwind: '$sizes'
      },
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$sizes.stock' },
          totalReserved: { $sum: { $ifNull: ['$sizes.reserved', 0] } },
          totalAvailable: { 
            $sum: { 
              $subtract: [
                '$sizes.stock', 
                { $ifNull: ['$sizes.reserved', 0] }
              ]
            }
          }
        }
      }
    ]);
    
    const before = beforeStats[0] || { totalStock: 0, totalReserved: 0, totalAvailable: 0 };
    console.log('📊 Before cleanup:', before);
    
    // 2. Reset all reserved fields to 0
    console.log('🔄 Resetting all reserved stock to 0...');
    const resetResult = await productModel.updateMany(
      {},
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    console.log(`✅ Reset reserved stock for ${resetResult.modifiedCount} products`);
    
    // 3. Mark all active reservations as expired
    console.log('🔄 Marking all active reservations as expired...');
    const reservationResult = await Reservation.updateMany(
      { status: 'active' },
      { 
        $set: { 
          status: 'expired',
          expiredAt: new Date(),
          reason: 'Immediate cleanup'
        } 
      }
    );
    console.log(`✅ Marked ${reservationResult.modifiedCount} reservations as expired`);
    
    // 4. Mark all active checkout sessions as expired
    console.log('🔄 Marking all active checkout sessions as expired...');
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
    console.log(`✅ Marked ${sessionResult.modifiedCount} checkout sessions as expired`);
    
    // 5. Get updated stock statistics
    const afterStats = await productModel.aggregate([
      {
        $unwind: '$sizes'
      },
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$sizes.stock' },
          totalReserved: { $sum: { $ifNull: ['$sizes.reserved', 0] } },
          totalAvailable: { 
            $sum: { 
              $subtract: [
                '$sizes.stock', 
                { $ifNull: ['$sizes.reserved', 0] }
              ]
            }
          }
        }
      }
    ]);
    
    const after = afterStats[0] || { totalStock: 0, totalReserved: 0, totalAvailable: 0 };
    console.log('📊 After cleanup:', after);
    
    console.log('🎉 Immediate cleanup completed successfully!');
    console.log(`📈 Stock restored: ${before.totalReserved - after.totalReserved} units`);
    console.log(`📈 Available stock increased: ${after.totalAvailable - before.totalAvailable} units`);
    
  } catch (error) {
    console.error('❌ Immediate cleanup failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the cleanup
immediateCleanup();
