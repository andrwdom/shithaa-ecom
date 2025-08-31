import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
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
    
    if (expiredReservations.length === 0) {
      console.log(`[${correlationId}] No expired reservations to process`);
      return { success: true, processed: 0 };
    }
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const reservation of expiredReservations) {
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
    
    console.log(`[${correlationId}] Reservation expiry worker completed. Processed: ${processedCount}, Errors: ${errorCount}`);
    
    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: expiredReservations.length
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

// If running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return expireOldReservations();
    })
    .then((result) => {
      console.log('Worker completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Worker failed:', error);
      process.exit(1);
    });
}
