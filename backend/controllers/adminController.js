import { successResponse, errorResponse } from '../utils/response.js';
import { cleanupStockReservations, checkStockAvailability } from '../utils/stock.js';
import CheckoutSession from '../models/CheckoutSession.js';
import { expireOldReservations } from '../workers/reservationExpiryWorker.js';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';

/**
 * Admin controller for system maintenance and cleanup
 */

// Emergency stock cleanup - resets all reserved stock to 0
export const emergencyStockCleanup = async (req, res) => {
  try {
    console.log('🚨 Starting emergency stock cleanup...');
    
    // 1. Find all sessions with reserved stock
    const sessions = await CheckoutSession.find({ stockReserved: true });
    console.log(`Found ${sessions.length} sessions with reserved stock`);
    
    // 2. For each session, check if stock is actually reserved
    for (const session of sessions) {
      console.log(`Checking session ${session.sessionId}:`, {
        status: session.status,
        createdAt: session.createdAt,
        items: session.items.length
      });
      
      // Release stock for each item
      for (const item of session.items) {
        try {
          // Check if stock is actually reserved
          const availability = await checkStockAvailability(item.productId, item.size, item.quantity);
          console.log(`Stock check for ${item.name}:`, availability);
          
          // Force release stock
          await productModel.updateOne(
            { _id: item.productId, 'sizes.size': item.size },
            { $inc: { 'sizes.$.reserved': -item.quantity } }
          );
          
          console.log(`Released ${item.quantity} units of ${item.name} (${item.size})`);
        } catch (error) {
          console.error(`Failed to release stock for item:`, error);
        }
      }
      
      // Mark session as failed and stock as released
      session.status = 'failed';
      session.stockReserved = false;
      await session.save();
    }
    
    // 3. Reset all reserved fields to 0 (just to be sure)
    const resetResult = await productModel.updateMany(
      {},
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    
    // 4. Mark all reservations as expired
    const reservationResult = await Reservation.updateMany(
      { status: 'active' },
      { 
        $set: { 
          status: 'expired',
          expiredAt: new Date(),
          reason: 'Emergency cleanup'
        }
      }
    );
    
    // 5. Get current stock statistics
    const stockStats = await productModel.aggregate([
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
    
    const stats = stockStats[0] || { totalStock: 0, totalReserved: 0, totalAvailable: 0 };
    
    const result = {
      success: true,
      sessionsProcessed: sessions.length,
      stockResetCount: resetResult.modifiedCount,
      reservationsExpired: reservationResult.modifiedCount,
      stockStats: {
        totalStock: stats.totalStock,
        totalReserved: stats.totalReserved,
        totalAvailable: stats.totalAvailable
      },
      message: `Emergency cleanup completed: ${sessions.length} sessions processed, ${resetResult.modifiedCount} products reset, ${reservationResult.modifiedCount} reservations expired`
    };
    
    console.log('✅ Emergency cleanup completed:', result);
    return successResponse(res, result);
    
  } catch (error) {
    console.error('❌ Emergency stock cleanup failed:', error);
    return errorResponse(res, 500, 'Emergency stock cleanup failed', error.message);
  }
};

// Regular stock cleanup - only cleans up expired reservations
export const regularStockCleanup = async (req, res) => {
  try {
    console.log('🧹 Admin triggered regular stock cleanup');
    
    const result = await expireOldReservations();
    
    if (result.success) {
      return successResponse(res, {
        message: 'Regular stock cleanup completed successfully',
        ...result
      });
    } else {
      return errorResponse(res, 500, 'Regular stock cleanup failed', result.error);
    }
    
  } catch (error) {
    console.error('❌ Regular stock cleanup failed:', error);
    return errorResponse(res, 500, 'Regular stock cleanup failed', error.message);
  }
};

// Get system health and stock status
export const getSystemHealth = async (req, res) => {
  try {
    // Get stock statistics
    const stockStats = await productModel.aggregate([
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
          },
          productsWithReservedStock: {
            $sum: {
              $cond: [
                { $gt: [{ $ifNull: ['$sizes.reserved', 0] }, 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    // Get reservation statistics
    const reservationStats = await Reservation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);
    
    // Get checkout session statistics
    const sessionStats = await CheckoutSession.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const stats = stockStats[0] || { 
      totalStock: 0, 
      totalReserved: 0, 
      totalAvailable: 0, 
      productsWithReservedStock: 0 
    };
    
    return successResponse(res, {
      message: 'System health retrieved successfully',
      stock: {
        totalStock: stats.totalStock,
        totalReserved: stats.totalReserved,
        totalAvailable: stats.totalAvailable,
        productsWithReservedStock: stats.productsWithReservedStock,
        utilizationRate: stats.totalStock > 0 ? (stats.totalReserved / stats.totalStock * 100).toFixed(2) + '%' : '0%'
      },
      reservations: reservationStats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, totalItems: stat.totalItems };
        return acc;
      }, {}),
      checkoutSessions: sessionStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to get system health:', error);
    return errorResponse(res, 500, 'Failed to get system health', error.message);
  }
};
