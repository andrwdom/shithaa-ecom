import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from backend/.env
const __filename = fileURLToPath(import.meta.url);
// This worker is in backend/workers, so we need to go up two levels to the project root, then to backend/.env
const __dirname = dirname(dirname(__filename)); // D:\...\shithaa-ecom-F1\backend
const envPath = join(__dirname, '.env');

console.log(`[Reservation Expiry Worker] Loading .env from: ${envPath}`);
dotenv.config({ path: envPath });

import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';
import orderModel from '../models/orderModel.js'; // 🔧 NEW: Import orderModel
import { releaseStockReservation } from '../utils/stock.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Worker to expire old reservations and release stock
 * This should be run every 5-10 minutes via cron or PM2
 */
export const expireOldReservations = async () => {
  const correlationId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${correlationId}] Starting reservation expiry worker`);
    
    // Find all active reservations that have expired
    const expiredReservations = await Reservation.find({
      status: 'active',
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`[${correlationId}] Found ${expiredReservations.length} expired reservations`);
    
    // Also find very old reservations (older than 5 minutes) regardless of expiry
    const veryOldReservations = await Reservation.find({
      status: 'active',
      createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
    });
    
    console.log(`[${correlationId}] Found ${veryOldReservations.length} very old reservations (>5min)`);
    
    // Combine both lists, removing duplicates
    const allExpiredReservations = [...new Map([
      ...expiredReservations.map(r => [r._id.toString(), r]),
      ...veryOldReservations.map(r => [r._id.toString(), r])
    ]).values()];
    
    console.log(`[${correlationId}] Total reservations to process: ${allExpiredReservations.length}`);
    
    if (allExpiredReservations.length === 0) {
      console.log(`[${correlationId}] No expired reservations to process`);
      return { success: true, processed: 0 };
    }
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const reservation of allExpiredReservations) {
      try {
        console.log(`[${correlationId}] Processing expired reservation: ${reservation.reservationId}`);
        
        // 🚨 CRITICAL FIX: Check if there's a paid/confirmed order linked to this reservation
        const checkoutSessionId = reservation.checkoutSessionId;
        if (checkoutSessionId) {
          const paidOrder = await orderModel.findOne({
            $or: [
              { checkoutSessionId: checkoutSessionId },
              { 'metadata.checkoutSessionId': checkoutSessionId }
            ],
            $or: [
              { status: 'CONFIRMED' },  // ✅ Check status field
              { orderStatus: 'CONFIRMED' },  // ✅ Check orderStatus field
              { paymentStatus: 'PAID' }  // ✅ Check paymentStatus field
            ]
          });
          
          if (paidOrder) {
            console.log(`[${correlationId}] 🚨 SKIPPING stock release for reservation ${reservation.reservationId} - Order ${paidOrder.orderId} is PAID/CONFIRMED`);
            console.log(`[${correlationId}] ✅ STOCK RELEASE FIX: Prevents double release - Order Status: ${paidOrder.status || paidOrder.orderStatus}, Payment: ${paidOrder.paymentStatus}`);
            // Mark reservation as expired but DON'T release stock
            await reservation.expire();
            processedCount++;
            continue; // Skip to next reservation
          }
        }
        
        // Only release stock if no paid order exists
        // The atomic release function will also verify reserved > 0
        const releasePromises = reservation.items.map(item =>
          releaseStockReservation(item.productId, item.size, item.quantity).catch(error => {
            // If release fails (e.g., no reserved stock), it's okay - just log it
            console.log(`[${correlationId}] Stock release skipped for ${item.productId} size ${item.size}: ${error.message}`);
          })
        );
        
        await Promise.all(releasePromises);
        
        // Mark reservation as expired
        await reservation.expire();
        
        console.log(`[${correlationId}] Successfully expired reservation: ${reservation.reservationId}`);
        processedCount++;
        
      } catch (error) {
        console.error(`[${correlationId}] Error processing reservation ${reservation.reservationId}:`, error);
        errorCount++;
        
        // Try to mark as expired even if stock release failed
        try {
          await reservation.expire();
        } catch (markError) {
          console.error(`[${correlationId}] Failed to mark reservation as expired:`, markError);
        }
      }
    }
    
    // Also clean up expired checkout sessions
    console.log(`[${correlationId}] Cleaning up expired checkout sessions...`);
    const checkoutCleanupResult = await CheckoutSession.cleanExpired();
    
  // Additional cleanup: Force release stock for sessions older than 20 minutes
  // 🔧 HOTFIX #2: Increased from 10min to 20min (PhonePe processing time)
  console.log(`[${correlationId}] Cleaning up very old sessions (>20min)...`);
  const veryOldSessions = await CheckoutSession.find({
    createdAt: { $lt: new Date(Date.now() - 20 * 60 * 1000) },
    stockReserved: true,
    status: { $in: ['pending', 'awaiting_payment'] }
  });
    
    if (veryOldSessions.length > 0) {
      console.log(`[${correlationId}] Found ${veryOldSessions.length} very old sessions, checking for draft orders...`);
      
      for (const session of veryOldSessions) {
        try {
          // 🔧 CRITICAL FIX: Check if there's a draft order with this session
          // If there is, DON'T release stock because the order owns it now
          // Check multiple possible linking fields
          const draftOrder = await orderModel.findOne({ 
            $or: [
              { checkoutSessionId: session.sessionId },
              { 'metadata.checkoutSessionId': session.sessionId },
              { phonepeTransactionId: session.phonepeTransactionId },
              { 'metadata.phonepeTransactionId': session.phonepeTransactionId }
            ],
            status: { $in: ['DRAFT', 'PENDING', 'CONFIRMED'] }
          });
          
          if (draftOrder) {
            console.log(`[${correlationId}] ⚠️ Order ${draftOrder.orderId} (status: ${draftOrder.status}) exists for session ${session.sessionId} - NOT releasing stock`);
            console.log(`[${correlationId}] Order linked by: checkoutSessionId=${draftOrder.checkoutSessionId}, metadata=${draftOrder.metadata?.checkoutSessionId}`);
            
            // 🚨 CRITICAL: If order is already CONFIRMED, DEFINITELY don't release stock
            if (draftOrder.status === 'CONFIRMED' || draftOrder.paymentStatus === 'PAID') {
              console.log(`[${correlationId}] ✅ Order is CONFIRMED/PAID - stock was already deducted, NOT releasing`);
            }
            
            // Just mark session as expired, but DON'T release stock
            session.status = 'expired';
            await session.save();
            continue; // Skip to next session
          }
          
          // 🚨 CRITICAL FIX: Also check if order is PAID/CONFIRMED (not just DRAFT/PENDING)
          const paidOrder = await orderModel.findOne({ 
            $or: [
              { checkoutSessionId: session.sessionId },
              { 'metadata.checkoutSessionId': session.sessionId },
              { phonepeTransactionId: session.phonepeTransactionId }
            ],
            $or: [
              { status: 'CONFIRMED' },  // ✅ Check status field
              { orderStatus: 'CONFIRMED' },  // ✅ Check orderStatus field
              { paymentStatus: 'PAID' }  // ✅ Check paymentStatus field
            ]
          });
          
          if (paidOrder) {
            console.log(`[${correlationId}] 🚨 Order ${paidOrder.orderId} is PAID/CONFIRMED for session ${session.sessionId} - NOT releasing stock`);
            session.status = 'expired';
            await session.save();
            continue; // Skip to next session
          }
          
          // No paid order exists, safe to release stock
          console.log(`[${correlationId}] No paid order found for session ${session.sessionId} - releasing stock`);
          
          // Force release stock (atomic function will verify reserved > 0)
          const releasePromises = session.items.map(item =>
            releaseStockReservation(item.productId, item.size, item.quantity).catch(error => {
              console.log(`[${correlationId}] Stock release skipped for ${item.productId} size ${item.size}: ${error.message}`);
            })
          );
          
          await Promise.all(releasePromises);
          
          // Mark session as expired
          session.status = 'expired';
          session.stockReserved = false;
          await session.save();
          
          console.log(`[${correlationId}] Force released stock for very old session: ${session.sessionId}`);
        } catch (error) {
          console.error(`[${correlationId}] Error force processing very old session ${session.sessionId}:`, error);
        }
      }
    }
    
    // Additional cleanup: Force cleanup of any stuck sessions (regardless of age)
    console.log(`[${correlationId}] Cleaning up any stuck sessions...`);
    const stuckSessions = await CheckoutSession.find({
      stockReserved: true,
      status: { $in: ['pending', 'awaiting_payment'] },
      $or: [
        { expiresAt: { $exists: false } }, // Sessions without expiry
        { expiresAt: { $lt: new Date() } } // Expired sessions
      ]
    });
    
    if (stuckSessions.length > 0) {
      console.log(`[${correlationId}] Found ${stuckSessions.length} stuck sessions, checking for draft orders...`);
      
      for (const session of stuckSessions) {
        try {
          // 🔧 CRITICAL FIX: Check if there's a draft order with this session
          // If there is, DON'T release stock because the order owns it now
          const draftOrder = await orderModel.findOne({ 
            checkoutSessionId: session.sessionId,
            status: { $in: ['DRAFT', 'PENDING', 'CONFIRMED'] }
          });
          
          if (draftOrder) {
            console.log(`[${correlationId}] ⚠️ Draft order ${draftOrder.orderId} exists for stuck session ${session.sessionId} - NOT releasing stock`);
            console.log(`[${correlationId}] Order status: ${draftOrder.status}, stockReserved: ${draftOrder.stockReserved}`);
            
            // Just mark session as expired, but DON'T release stock
            session.status = 'expired';
            await session.save();
            continue; // Skip to next session
          }
          
          // 🚨 CRITICAL FIX: Also check if order is PAID/CONFIRMED
          const paidOrder = await orderModel.findOne({ 
            $or: [
              { checkoutSessionId: session.sessionId },
              { 'metadata.checkoutSessionId': session.sessionId },
              { phonepeTransactionId: session.phonepeTransactionId }
            ],
            $or: [
              { status: 'CONFIRMED' },  // ✅ Check status field
              { orderStatus: 'CONFIRMED' },  // ✅ Check orderStatus field
              { paymentStatus: 'PAID' }  // ✅ Check paymentStatus field
            ]
          });
          
          if (paidOrder) {
            console.log(`[${correlationId}] 🚨 Order ${paidOrder.orderId} is PAID/CONFIRMED for stuck session ${session.sessionId} - NOT releasing stock`);
            session.status = 'expired';
            await session.save();
            continue; // Skip to next session
          }
          
          // No paid order exists, safe to release stock
          console.log(`[${correlationId}] No paid order found for stuck session ${session.sessionId} - releasing stock`);
          
          // Force release stock (atomic function will verify reserved > 0)
          const releasePromises = session.items.map(item =>
            releaseStockReservation(item.productId, item.size, item.quantity).catch(error => {
              console.log(`[${correlationId}] Stock release skipped for ${item.productId} size ${item.size}: ${error.message}`);
            })
          );
          
          await Promise.all(releasePromises);
          
          // Mark session as expired
          session.status = 'expired';
          session.stockReserved = false;
          await session.save();
          
          console.log(`[${correlationId}] Force cleaned stuck session: ${session.sessionId}`);
        } catch (error) {
          console.error(`[${correlationId}] Error force processing stuck session ${session.sessionId}:`, error);
        }
      }
    }

    console.log(`[${correlationId}] Reservation expiry worker completed. Processed: ${processedCount}, Errors: ${errorCount}, Checkout sessions cleaned: ${checkoutCleanupResult.deletedCount}, Stuck sessions cleaned: ${stuckSessions.length}`);
    
    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: allExpiredReservations.length,
      checkoutSessionsCleaned: checkoutCleanupResult.deletedCount,
      stuckSessionsCleaned: stuckSessions.length
    };
    
  } catch (error) {
    console.error(`[${correlationId}] Reservation expiry worker failed:`, error);
    return {
      success: false,
      error: error.message,
      processed: 0
    };
  }
};

/**
 * Manual trigger for testing
 */
export const manualExpiryTrigger = async (req, res) => {
  try {
    const result = await expireOldReservations();
    
    if (result.success) {
      return successResponse(res, {
        message: 'Reservation expiry worker completed successfully',
        ...result
      });
    } else {
      return errorResponse(res, 500, 'Reservation expiry worker failed', result.error);
    }
  } catch (error) {
    console.error('Manual expiry trigger failed:', error);
    return errorResponse(res, 500, 'Failed to trigger reservation expiry', error.message);
  }
};

/**
 * Get reservation statistics
 */
export const getReservationStats = async (req, res) => {
  try {
    const stats = await Reservation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);
    
    const totalReservations = await Reservation.countDocuments();
    const activeReservations = await Reservation.countDocuments({ status: 'active' });
    const expiredReservations = await Reservation.countDocuments({ status: 'expired' });
    
    return successResponse(res, {
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, totalItems: stat.totalItems };
        return acc;
      }, {}),
      summary: {
        total: totalReservations,
        active: activeReservations,
        expired: expiredReservations
      }
    });
    
  } catch (error) {
    console.error('Failed to get reservation stats:', error);
    return errorResponse(res, 500, 'Failed to get reservation statistics', error.message);
  }
};

// Always run as a persistent worker when imported
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const runWorker = async () => {
  try {
    console.log('🔄 [Reservation Worker] Starting cleanup cycle...');
    const result = await expireOldReservations();
    console.log('✅ [Reservation Worker] Cleanup completed:', result);
  } catch (error) {
    console.error('❌ [Reservation Worker] Cleanup failed:', error);
  }
};

// Connect to MongoDB and start the worker
mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ [Reservation Worker] Connected to MongoDB');
    
    // Run immediately on startup
    runWorker();
    
    // Then run every 2 minutes (120000ms)
    setInterval(runWorker, 2 * 60 * 1000);
    
    console.log('🔄 [Reservation Worker] Started - will run every 2 minutes');
    
    // Keep the process alive - don't exit
    // PM2 will handle the process lifecycle
  })
  .catch((error) => {
    console.error('❌ [Reservation Worker] Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 [Reservation Worker] Shutting down gracefully...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 [Reservation Worker] Shutting down gracefully...');
  mongoose.connection.close();
  process.exit(0);
});

// Keep the process alive
process.on('uncaughtException', (error) => {
  console.error('❌ [Reservation Worker] Uncaught Exception:', error);
  // Don't exit, let PM2 handle it
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [Reservation Worker] Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, let PM2 handle it
});
