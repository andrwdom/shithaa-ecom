import mongoose from 'mongoose';
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
        
        // Release stock for all items in this reservation
        const releasePromises = reservation.items.map(item =>
          releaseStockReservation(item.productId, item.size, item.quantity)
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
    
    // Additional cleanup: Force release stock for sessions older than 10 minutes
    console.log(`[${correlationId}] Cleaning up very old sessions (>10min)...`);
    const veryOldSessions = await CheckoutSession.find({
      createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) },
      stockReserved: true,
      status: { $in: ['pending', 'awaiting_payment'] }
    });
    
    if (veryOldSessions.length > 0) {
      console.log(`[${correlationId}] Found ${veryOldSessions.length} very old sessions, checking for draft orders...`);
      
      for (const session of veryOldSessions) {
        try {
          // 🔧 CRITICAL FIX: Check if there's a draft order with this session
          // If there is, DON'T release stock because the order owns it now
          const draftOrder = await orderModel.findOne({ 
            checkoutSessionId: session.sessionId,
            status: { $in: ['DRAFT', 'PENDING', 'CONFIRMED'] }
          });
          
          if (draftOrder) {
            console.log(`[${correlationId}] ⚠️ Draft order ${draftOrder.orderId} exists for session ${session.sessionId} - NOT releasing stock`);
            console.log(`[${correlationId}] Order status: ${draftOrder.status}, stockReserved: ${draftOrder.stockReserved}`);
            
            // Just mark session as expired, but DON'T release stock
            session.status = 'expired';
            await session.save();
            continue; // Skip to next session
          }
          
          // No draft order exists, safe to release stock
          console.log(`[${correlationId}] No draft order found for session ${session.sessionId} - releasing stock`);
          
          // Force release stock
          const releasePromises = session.items.map(item =>
            releaseStockReservation(item.productId, item.size, item.quantity).catch(error => {
              console.error(`Failed to force release stock for product ${item.productId} size ${item.size}:`, error);
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
          
          // No draft order exists, safe to release stock
          console.log(`[${correlationId}] No draft order found for stuck session ${session.sessionId} - releasing stock`);
          
          // Force release stock
          const releasePromises = session.items.map(item =>
            releaseStockReservation(item.productId, item.size, item.quantity).catch(error => {
              console.error(`Failed to force release stuck stock for product ${item.productId} size ${item.size}:`, error);
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
