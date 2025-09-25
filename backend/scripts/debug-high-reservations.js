#!/usr/bin/env node

/**
 * Debug High Reservations Script
 * Identifies and fixes products with high reservation ratios
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const debugHighReservations = async () => {
  try {
    console.log('🔍 DEBUG: Starting high reservation analysis...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Get products with high reservation ratios (same logic as monitoring)
    const productsWithHighReservation = await productModel.aggregate([
      {
        $match: {
          'sizes.stock': { $gt: 0 },
          'sizes.reserved': { $gt: 0 }
        }
      },
      {
        $addFields: {
          sizes: {
            $map: {
              input: '$sizes',
              as: 'size',
              in: {
                $mergeObjects: [
                  '$$size',
                  {
                    reservationRatio: {
                      $cond: {
                        if: { $gt: ['$$size.stock', 0] },
                        then: { $divide: ['$$size.reserved', '$$size.stock'] },
                        else: 0
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $match: {
          'sizes.reservationRatio': { $gte: 0.8 }
        }
      }
    ]);
    
    console.log(`\n📊 Found ${productsWithHighReservation.length} products with high reservations:`);
    
    for (const product of productsWithHighReservation) {
      console.log(`\n🔍 Product: ${product.name} (${product.customId})`);
      console.log(`   ID: ${product._id}`);
      
      const highReservationSizes = product.sizes.filter(s => s.reservationRatio >= 0.8);
      
      for (const size of highReservationSizes) {
        console.log(`   📏 Size ${size.size}: ${size.reserved}/${size.stock} reserved (${Math.round(size.reservationRatio * 100)}%)`);
        
        // Check actual reservations in database
        const actualReservations = await CheckoutSession.aggregate([
          {
            $match: {
              status: { $in: ['pending', 'awaiting_payment'] },
              stockReserved: true,
              'items.productId': product._id,
              'items.size': size.size
            }
          },
          { $unwind: '$items' },
          {
            $match: {
              'items.productId': product._id,
              'items.size': size.size
            }
          },
          {
            $group: {
              _id: null,
              totalReserved: { $sum: '$items.quantity' }
            }
          }
        ]);
        
        const actualReserved = actualReservations[0]?.totalReserved || 0;
        console.log(`   🔧 Actual reserved in sessions: ${actualReserved}`);
        
        if (size.reserved !== actualReserved) {
          console.log(`   ⚠️  MISMATCH: Product shows ${size.reserved} reserved but sessions show ${actualReserved}`);
          
          // Fix the mismatch
          console.log(`   🔧 Fixing reserved count...`);
          await productModel.updateOne(
            { _id: product._id, 'sizes.size': size.size },
            { $set: { 'sizes.$.reserved': actualReserved } }
          );
          console.log(`   ✅ Fixed: Updated reserved count to ${actualReserved}`);
        } else {
          console.log(`   ✅ Reserved count matches actual reservations`);
        }
      }
    }
    
    // Check for stuck reservations
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const stuckReservations = await Reservation.find({
      status: 'active',
      createdAt: { $lt: fiveMinutesAgo }
    });
    
    console.log(`\n🔍 Found ${stuckReservations.length} stuck reservations:`);
    for (const reservation of stuckReservations) {
      console.log(`   📋 Reservation ${reservation._id}: Created ${reservation.createdAt}, Items: ${reservation.items.length}`);
    }
    
    // Check for stuck checkout sessions
    const stuckSessions = await CheckoutSession.find({
      stockReserved: true,
      status: { $in: ['pending', 'awaiting_payment'] },
      createdAt: { $lt: fiveMinutesAgo }
    });
    
    console.log(`\n🔍 Found ${stuckSessions.length} stuck checkout sessions:`);
    for (const session of stuckSessions) {
      console.log(`   🛒 Session ${session.sessionId}: Created ${session.createdAt}, Items: ${session.items.length}`);
    }
    
    // Force cleanup if needed
    if (stuckReservations.length > 0 || stuckSessions.length > 0) {
      console.log(`\n🧹 Force cleaning stuck reservations and sessions...`);
      
      // Clean up stuck reservations
      for (const reservation of stuckReservations) {
        await Reservation.findByIdAndUpdate(reservation._id, {
          status: 'expired',
          expiredAt: new Date(),
          reason: 'Debug cleanup'
        });
        console.log(`   ✅ Expired reservation: ${reservation._id}`);
      }
      
      // Clean up stuck sessions
      for (const session of stuckSessions) {
        await CheckoutSession.findByIdAndUpdate(session._id, {
          status: 'expired',
          stockReserved: false
        });
        console.log(`   ✅ Expired session: ${session.sessionId}`);
      }
    }
    
    console.log(`\n✅ Debug analysis completed!`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Run the debug
debugHighReservations();
