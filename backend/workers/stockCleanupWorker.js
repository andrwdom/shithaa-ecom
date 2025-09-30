#!/usr/bin/env node

/**
 * Stock Cleanup Worker - FIXED VERSION
 * This worker runs every 5 minutes and cleans up abandoned orders
 */

import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';
import PaymentSession from '../models/paymentSessionModel.js';
import orderModel from '../models/orderModel.js'; // 🔧 NEW: Import orderModel
import { releaseStockReservation } from '../utils/stock.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const cleanupAbandonedOrders = async () => {
  const correlationId = `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`🚨 [${correlationId}] Starting abandoned order cleanup...`);
    
    // Start a MongoDB transaction for atomicity
    const session = await mongoose.startSession();
    await session.startTransaction();
    
    try {
      // 1. Clean up reservations older than 14 minutes (PhonePe session timeout)
      const oldReservations = await Reservation.find({
        status: 'active',
        $or: [
          // Older than 14 minutes
          { createdAt: { $lt: new Date(Date.now() - 14 * 60 * 1000) } },
          // Failed payments
          { status: 'failed' },
          // Corrupted reservations
          { items: { $size: 0 } },
          { items: null },
          { expiresAt: { $exists: false } }
        ]
      }).session(session);
      
      console.log(`[${correlationId}] Found ${oldReservations.length} old reservations to clean`);
      
      let reservationsCleaned = 0;
      for (const reservation of oldReservations) {
        try {
          // Release stock for each item atomically
          if (reservation.items && reservation.items.length > 0) {
            for (const item of reservation.items) {
              const released = await releaseStockReservation(
                item.productId,
                item.size,
                item.quantity,
                { session }
              );
              
              if (!released) {
                console.error(`[${correlationId}] Failed to release stock for item in reservation ${reservation._id}`);
                continue;
              }
            }
          }
          
          // Mark as expired
          await Reservation.findByIdAndUpdate(
            reservation._id,
            {
              status: 'expired',
              expiredAt: new Date(),
              reason: 'Timeout cleanup',
              updatedAt: new Date()
            },
            { session }
          );
          
          reservationsCleaned++;
          console.log(`[${correlationId}] Cleaned reservation: ${reservation._id}`);
        } catch (error) {
          console.error(`[${correlationId}] Error cleaning reservation ${reservation._id}:`, error);
        }
      }
      
      // 2. Clean up checkout sessions
      const now = new Date();
      const oldSessions = await CheckoutSession.find({
        stockReserved: true,
        $or: [
          // Sessions that have timed out (no response after 14 minutes - PhonePe timeout)
          { timeoutAt: { $lt: now } },
          // Sessions that have expired (payment window closed)
          { expiresAt: { $lt: now } },
          // Failed payments should be cleaned up immediately
          { status: 'failed' },
          // Sessions that are old and in a terminal state
          {
            status: { $in: ['pending', 'awaiting_payment'] },
            createdAt: { $lt: new Date(now - 14 * 60 * 1000) }
          },
          // Corrupted sessions
          { status: { $exists: false } },
          { items: { $size: 0 } },
          { items: null },
          { timeoutAt: { $exists: false } }
        ]
      }).session(session);
      
      console.log(`[${correlationId}] Found ${oldSessions.length} old checkout sessions to clean`);
      
      let sessionsCleaned = 0;
      for (const checkoutSession of oldSessions) {
        try {
          // 🔧 CRITICAL FIX: Check if there's a draft order with this session
          // If there is, DON'T release stock because the order owns it now
          const draftOrder = await orderModel.findOne({ 
            checkoutSessionId: checkoutSession.sessionId,
            status: { $in: ['DRAFT', 'PENDING', 'CONFIRMED'] }
          }).session(session);
          
          if (draftOrder) {
            console.log(`[${correlationId}] ⚠️ Draft order ${draftOrder.orderId} exists for session ${checkoutSession.sessionId} - NOT releasing stock`);
            console.log(`[${correlationId}] Order status: ${draftOrder.status}, stockReserved: ${draftOrder.stockReserved}`);
            
            // Just mark session as expired, but DON'T release stock
            await CheckoutSession.findByIdAndUpdate(
              checkoutSession._id,
              {
                status: 'expired',
                stockReserved: true, // Keep this true since order owns the reservation
                expiredAt: new Date(),
                updatedAt: new Date()
              },
              { session }
            );
            continue; // Skip to next session
          }
          
          // No draft order exists, safe to release stock
          console.log(`[${correlationId}] No draft order found for session ${checkoutSession.sessionId} - releasing stock`);
          
          // Get associated payment session
          const paymentSession = await PaymentSession.findOne({
            sessionId: checkoutSession.sessionId
          }).session(session);
          
          // Release stock for each item atomically
          if (checkoutSession.items && checkoutSession.items.length > 0) {
            for (const item of checkoutSession.items) {
              const released = await releaseStockReservation(
                item.productId,
                item.size,
                item.quantity,
                { session }
              );
              
              if (!released) {
                console.error(`[${correlationId}] Failed to release stock for item in session ${checkoutSession.sessionId}`);
                continue;
              }
            }
          }
          
          // Mark checkout session as expired
          await CheckoutSession.findByIdAndUpdate(
            checkoutSession._id,
            {
              status: 'expired',
              stockReserved: false,
              expiredAt: new Date(),
              updatedAt: new Date(),
              reason: 'Timeout cleanup'
            },
            { session }
          );
          
          // Update payment session if it exists
          if (paymentSession) {
            await PaymentSession.findByIdAndUpdate(
              paymentSession._id,
              {
                status: 'expired',
                expiredAt: new Date(),
                updatedAt: new Date()
              },
              { session }
            );
          }
          
          sessionsCleaned++;
          console.log(`[${correlationId}] Cleaned session: ${checkoutSession.sessionId}`);
        } catch (error) {
          console.error(`[${correlationId}] Error cleaning session ${checkoutSession.sessionId}:`, error);
        }
      }
      
      // 3. Verify and fix any inconsistencies (emergency fallback)
      const productsWithReserved = await productModel.find({
        'sizes.reserved': { $gt: 0 }
      }).session(session);
      
      if (productsWithReserved.length > 0) {
        console.log(`[${correlationId}] Found ${productsWithReserved.length} products with reserved stock - verifying...`);
        
        for (const product of productsWithReserved) {
          for (const size of product.sizes) {
            if (size.reserved > 0) {
              // Check if there are any active reservations for this product/size
              const activeReservations = await Reservation.find({
                status: 'active',
                'items.productId': product._id,
                'items.size': size.size
              }).session(session);
              
              const activeCheckoutSessions = await CheckoutSession.find({
                stockReserved: true,
                status: { $in: ['pending', 'awaiting_payment'] },
                'items.productId': product._id,
                'items.size': size.size
              }).session(session);
              
              // If no active reservations or sessions, reset reserved count
              if (activeReservations.length === 0 && activeCheckoutSessions.length === 0) {
                await productModel.updateOne(
                  { _id: product._id, 'sizes.size': size.size },
                  { $set: { 'sizes.$.reserved': 0 } },
                  { session }
                );
                console.log(`[${correlationId}] Reset reserved count for ${product.name} size ${size.size} (no active reservations)`);
              }
            }
          }
        }
      }
      
      // Commit transaction
      await session.commitTransaction();
      console.log(`✅ [${correlationId}] Cleanup completed: ${reservationsCleaned} reservations, ${sessionsCleaned} sessions cleaned`);
      
      return {
        success: true,
        reservationsCleaned,
        sessionsCleaned,
        productsWithReserved: productsWithReserved.length
      };
      
    } catch (error) {
      // Rollback transaction on any error
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
    
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
