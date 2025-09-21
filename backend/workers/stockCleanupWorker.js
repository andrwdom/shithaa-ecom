#!/usr/bin/env node

/**
 * Stock Cleanup Worker - FIXED VERSION
 * This worker runs every 5 minutes and cleans up abandoned orders
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';
import { releaseStockReservation } from '../utils/stock.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const cleanupAbandonedOrders = async () => {
  const correlationId = `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🚨 [${correlationId}] Starting abandoned order cleanup...`);
    
    // 1. Clean up reservations older than 5 minutes
    const oldReservations = await Reservation.find({
      status: 'active',
      createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
    });
    
    console.log(`[${correlationId}] Found ${oldReservations.length} old reservations to clean`);
    
    let reservationsCleaned = 0;
    for (const reservation of oldReservations) {
      try {
        // Release stock for each item
        for (const item of reservation.items) {
          await releaseStockReservation(item.productId, item.size, item.quantity);
        }
        
        // Mark as expired
        await Reservation.findByIdAndUpdate(reservation._id, {
          status: 'expired',
          expiredAt: new Date(),
          reason: 'Timeout cleanup'
        });
        
        reservationsCleaned++;
        console.log(`[${correlationId}] Cleaned reservation: ${reservation._id}`);
      } catch (error) {
        console.error(`[${correlationId}] Error cleaning reservation ${reservation._id}:`, error);
      }
    }
    
      // 2. Clean up checkout sessions that are either:
      // - Past their timeout (15 minutes)
      // - Past their expiry (10 minutes)
      // - Failed payments (immediately)
      // - Older than 5 minutes and in a terminal state
      const now = new Date();
      // First find ALL sessions with reserved stock to debug
      const allReservedSessions = await CheckoutSession.find({
        stockReserved: true
      });
      console.log(`[${correlationId}] DEBUG: Found ${allReservedSessions.length} total sessions with reserved stock`);
      for (const session of allReservedSessions) {
        console.log(`[${correlationId}] DEBUG: Session ${session.sessionId}:`, {
          status: session.status,
          stockReserved: session.stockReserved,
          createdAt: session.createdAt,
          timeoutAt: session.timeoutAt,
          expiresAt: session.expiresAt,
          items: session.items.map(item => ({
            name: item.name,
            size: item.size,
            quantity: item.quantity
          }))
        });
      }

      // Now find sessions that need cleanup
      const oldSessions = await CheckoutSession.find({
        stockReserved: true,
        $or: [
          // Sessions that have timed out (no response after 15 minutes)
          { timeoutAt: { $lt: now } },
          // Sessions that have expired (payment window closed after 10 minutes)
          { expiresAt: { $lt: now } },
          // Failed payments should be cleaned up immediately
          { status: 'failed' },
          // Sessions that are old and in a terminal state
          {
            status: { $in: ['pending', 'awaiting_payment'] },
            createdAt: { $lt: new Date(now - 5 * 60 * 1000) }
          },
          // CRITICAL: Also clean up sessions with no status (corrupted)
          { status: { $exists: false } },
          // CRITICAL: Clean up sessions with no items (corrupted)
          { items: { $size: 0 } },
          // CRITICAL: Clean up sessions with no timeoutAt (corrupted)
          { timeoutAt: { $exists: false } }
        ]
      });

      // Log which conditions matched
      console.log(`[${correlationId}] DEBUG: Found ${oldSessions.length} sessions to clean. Matching conditions:`);
      for (const session of oldSessions) {
        const conditions = [];
        if (session.timeoutAt < now) conditions.push('TIMEOUT');
        if (session.expiresAt < now) conditions.push('EXPIRED');
        if (session.status === 'failed') conditions.push('FAILED');
        if (['pending', 'awaiting_payment'].includes(session.status) && 
            session.createdAt < new Date(now - 5 * 60 * 1000)) conditions.push('OLD_PENDING');
        
        console.log(`[${correlationId}] DEBUG: Session ${session.sessionId} matched conditions:`, conditions);
    
    console.log(`[${correlationId}] Found ${oldSessions.length} old checkout sessions to clean`);
    
    let sessionsCleaned = 0;
    for (const session of oldSessions) {
      try {
        // Release stock for each item
        for (const item of session.items) {
          await releaseStockReservation(item.productId, item.size, item.quantity);
        }
        
        // Mark as expired
        await CheckoutSession.findByIdAndUpdate(session._id, {
          status: 'expired',
          stockReserved: false,
          expiredAt: new Date()
        });
        
        sessionsCleaned++;
        console.log(`[${correlationId}] Cleaned session: ${session.sessionId}`);
      } catch (error) {
        console.error(`[${correlationId}] Error cleaning session ${session.sessionId}:`, error);
      }
    }
    
    // 3. Force cleanup any stuck stock (emergency fallback)
    const productsWithReserved = await productModel.find({
      'sizes.reserved': { $gt: 0 }
    });
    
    if (productsWithReserved.length > 0) {
      console.log(`[${correlationId}] Found ${productsWithReserved.length} products with reserved stock - force cleaning...`);
      
      for (const product of productsWithReserved) {
        for (const size of product.sizes) {
          if (size.reserved > 0) {
            await productModel.updateOne(
              { _id: product._id, 'sizes.size': size.size },
              { $set: { 'sizes.$.reserved': 0 } }
            );
            console.log(`[${correlationId}] Force released ${size.reserved} units of ${product.name} size ${size.size}`);
          }
        }
      }
    }
    
    console.log(`✅ [${correlationId}] Cleanup completed: ${reservationsCleaned} reservations, ${sessionsCleaned} sessions cleaned`);
    
    return {
      success: true,
      reservationsCleaned,
      sessionsCleaned,
      productsWithReserved: productsWithReserved.length
    };
    
  } catch (error) {
    console.error(`❌ [${correlationId}] Cleanup failed:`, error);
    return { success: false, error: error.message };
  }
};

// Main worker function
const runWorker = async () => {
  try {
    console.log('🔄 [Stock Cleanup Worker] Starting cleanup cycle...');
    const result = await cleanupAbandonedOrders();
    console.log('✅ [Stock Cleanup Worker] Cleanup completed:', result);
  } catch (error) {
    console.error('❌ [Stock Cleanup Worker] Cleanup failed:', error);
  }
};

// Connect to MongoDB and start the worker
mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ [Stock Cleanup Worker] Connected to MongoDB');
    
    // Run immediately on startup
    runWorker();
    
    // Then run every 5 minutes (300000ms)
    setInterval(runWorker, 5 * 60 * 1000);
    
    console.log('🔄 [Stock Cleanup Worker] Started - will run every 5 minutes');
  })
  .catch((error) => {
    console.error('❌ [Stock Cleanup Worker] Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 [Stock Cleanup Worker] Shutting down gracefully...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 [Stock Cleanup Worker] Shutting down gracefully...');
  mongoose.connection.close();
  process.exit(0);
});
