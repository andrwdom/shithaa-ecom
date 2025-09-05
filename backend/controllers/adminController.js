import { successResponse, errorResponse } from '../utils/response.js';
import { cleanupStockReservations } from '../utils/stock.js';
import { expireOldReservations } from '../workers/reservationExpiryWorker.js';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';

/**
 * Admin controller for system maintenance and cleanup
 */

// Emergency stock cleanup - resets all reserved stock to 0
export const emergencyStockCleanup = async (req, res) => {
  try {
    console.log('🚨 Admin triggered emergency stock cleanup');
    
    // 1. Reset all reserved fields to 0
    const resetResult = await productModel.updateMany(
      {},
      { $set: { 'sizes.$[].reserved': 0 } }
    );
    
    // 2. Mark all active reservations as expired
    const reservationResult = await Reservation.updateMany(
      { status: 'active' },
      { 
        status: 'expired',
        updatedAt: new Date()
      }
    );
    
    // 3. Clean up expired checkout sessions
    const sessionResult = await CheckoutSession.deleteMany({
      $or: [
        { status: 'expired' },
        { expiresAt: { $lt: new Date() } }
      ]
    });
    
    // 4. Get current stock statistics
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
    
    return successResponse(res, {
      message: 'Emergency stock cleanup completed successfully',
      results: {
        productsReset: resetResult.modifiedCount,
        reservationsExpired: reservationResult.modifiedCount,
        sessionsDeleted: sessionResult.deletedCount
      },
      stockStats: {
        totalStock: stats.totalStock,
        totalReserved: stats.totalReserved,
        totalAvailable: stats.totalAvailable
      }
    });
    
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
