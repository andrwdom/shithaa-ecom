import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import Reservation from '../models/Reservation.js';
import CheckoutSession from '../models/CheckoutSession.js';
import PaymentSession from '../models/paymentSessionModel.js';

/**
 * Track stock management events for monitoring
 * @param {boolean} success - Whether the operation was successful
 * @param {Object} details - Additional details about the operation
 */
export async function trackStockEvent(success, details = {}) {
  try {
    const event = {
      timestamp: new Date(),
      success,
      ...details
    };
    
    // Log event for monitoring
    console.log(`📊 STOCK EVENT:`, event);
    
    // Here you would typically send this to your monitoring system
    // For example: Datadog, New Relic, CloudWatch, etc.
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
      } catch (error) {
        console.error('Failed to send event to monitoring webhook:', error);
      }
    }
  } catch (error) {
    console.error('Failed to track stock event:', error);
  }
}

/**
 * Get current stock health metrics
 * @returns {Promise<Object>} Stock health metrics
 */
export async function getStockHealthMetrics() {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Get products with high reservation ratios
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
    
    // Get stuck reservations (active for more than 5 minutes)
    const stuckReservations = await Reservation.find({
      status: 'active',
      createdAt: { $lt: fiveMinutesAgo }
    });
    
    // Get stuck checkout sessions
    const stuckSessions = await CheckoutSession.find({
      stockReserved: true,
      status: { $in: ['pending', 'awaiting_payment'] },
      createdAt: { $lt: fiveMinutesAgo }
    });
    
    // Get failed payment sessions with reserved stock
    const failedPayments = await PaymentSession.find({
      status: 'failed',
      createdAt: { $gt: fiveMinutesAgo }
    });
    
    // Calculate metrics
    const metrics = {
      timestamp: now,
      productsWithHighReservation: productsWithHighReservation.length,
      stuckReservations: stuckReservations.length,
      stuckSessions: stuckSessions.length,
      recentFailedPayments: failedPayments.length,
      details: {
        highReservationProducts: productsWithHighReservation.map(p => ({
          id: p._id,
          name: p.name,
          sizes: p.sizes.filter(s => s.reserved / s.stock >= 0.8).map(s => ({
            size: s.size,
            stock: s.stock,
            reserved: s.reserved,
            reservationRatio: s.reserved / s.stock
          }))
        })),
        stuckReservations: stuckReservations.map(r => ({
          id: r._id,
          createdAt: r.createdAt,
          items: r.items
        })),
        stuckSessions: stuckSessions.map(s => ({
          id: s.sessionId,
          createdAt: s.createdAt,
          items: s.items
        }))
      }
    };
    
    // Calculate health score
    const healthScore = calculateHealthScore(metrics);
    metrics.healthScore = healthScore;
    
    // Send alerts if needed
    if (healthScore < 70) {
      await sendStockAlert('CRITICAL', metrics);
    } else if (healthScore < 90) {
      await sendStockAlert('WARNING', metrics);
    }
    
    return metrics;
  } catch (error) {
    console.error('Failed to get stock health metrics:', error);
    throw error;
  }
}

/**
 * Calculate stock system health score (0-100)
 * @param {Object} metrics - Stock health metrics
 * @returns {number} Health score
 */
function calculateHealthScore(metrics) {
  let score = 100;
  
  // Deduct for high reservation products
  if (metrics.productsWithHighReservation > 0) {
    score -= Math.min(30, metrics.productsWithHighReservation * 5);
  }
  
  // Deduct for stuck reservations
  if (metrics.stuckReservations > 0) {
    score -= Math.min(30, metrics.stuckReservations * 3);
  }
  
  // Deduct for stuck sessions
  if (metrics.stuckSessions > 0) {
    score -= Math.min(20, metrics.stuckSessions * 2);
  }
  
  // Deduct for recent failed payments
  if (metrics.recentFailedPayments > 0) {
    score -= Math.min(20, metrics.recentFailedPayments * 2);
  }
  
  return Math.max(0, Math.round(score));
}

/**
 * Send stock management alerts
 * @param {string} severity - Alert severity (CRITICAL or WARNING)
 * @param {Object} metrics - Stock health metrics
 */
async function sendStockAlert(severity, metrics) {
  try {
    const alert = {
      severity,
      timestamp: new Date(),
      metrics,
      message: generateAlertMessage(severity, metrics)
    };
    
    // Log alert
    console.log(`🚨 STOCK ALERT [${severity}]:`, alert);
    
    // Send to monitoring system
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await fetch(process.env.MONITORING_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        console.error('Failed to send alert to monitoring webhook:', error);
      }
    }
    
    // Send to notification service (e.g., email, SMS)
    if (process.env.NOTIFICATION_WEBHOOK_URL) {
      try {
        await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        console.error('Failed to send alert to notification webhook:', error);
      }
    }
  } catch (error) {
    console.error('Failed to send stock alert:', error);
  }
}

/**
 * Generate alert message from metrics
 * @param {string} severity - Alert severity
 * @param {Object} metrics - Stock health metrics
 * @returns {string} Alert message
 */
function generateAlertMessage(severity, metrics) {
  const messages = [];
  
  if (severity === 'CRITICAL') {
    messages.push('🚨 CRITICAL: Stock management system requires immediate attention!');
  } else {
    messages.push('⚠️ WARNING: Stock management system needs attention');
  }
  
  messages.push(`Health Score: ${metrics.healthScore}/100`);
  
  if (metrics.productsWithHighReservation > 0) {
    messages.push(`- ${metrics.productsWithHighReservation} products have >80% stock reserved`);
  }
  
  if (metrics.stuckReservations > 0) {
    messages.push(`- ${metrics.stuckReservations} stuck reservations need cleanup`);
  }
  
  if (metrics.stuckSessions > 0) {
    messages.push(`- ${metrics.stuckSessions} checkout sessions with reserved stock`);
  }
  
  if (metrics.recentFailedPayments > 0) {
    messages.push(`- ${metrics.recentFailedPayments} recent failed payments need review`);
  }
  
  return messages.join('\n');
}

/**
 * Track stock reservation events
 * @param {boolean} success - Whether the reservation was successful
 * @param {Object} details - Additional details about the reservation
 */
export async function trackStockReservation(success, details = {}) {
  try {
    const event = {
      timestamp: new Date(),
      success,
      type: 'stock_reservation',
      ...details
    };
    
    // Log event for monitoring
    console.log(`📊 STOCK RESERVATION:`, event);
    
    // Track the event using the main tracking function
    await trackStockEvent(success, { ...details, type: 'stock_reservation' });
  } catch (error) {
    console.error('Failed to track stock reservation:', error);
  }
}

/**
 * Track payment events
 * @param {boolean} success - Whether the payment was successful
 * @param {Object} details - Additional details about the payment
 */
export async function trackPayment(success, details = {}) {
  try {
    const event = {
      timestamp: new Date(),
      success,
      type: 'payment',
      ...details
    };
    
    // Log event for monitoring
    console.log(`📊 PAYMENT EVENT:`, event);
    
    // Track the event using the main tracking function
    await trackStockEvent(success, { ...details, type: 'payment' });
  } catch (error) {
    console.error('Failed to track payment:', error);
  }
}

/**
 * Dummy function for tracking requests - replace with actual implementation
 */
export async function trackRequest(req) {
  // Replace with actual monitoring logic (e.g., logging request details)
  console.log(`REQUEST: ${req.method} ${req.url}`);
}

/**
 * Dummy function for tracking memory usage - replace with actual implementation
 */
export async function trackMemoryUsage() {
  // Replace with actual memory tracking logic
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`MEMORY USAGE: ${Math.round(used * 100) / 100} MB`);
}

/**
 * Alias for getStockHealthMetrics to be used as getHealthStatus
 */
export const getHealthStatus = getStockHealthMetrics;


// Export monitoring functions
export const monitoring = {
  trackStockEvent,
  trackStockReservation,
  trackPayment,
  getStockHealthMetrics,
  sendStockAlert,
  getHealthStatus,
  trackRequest,
  trackMemoryUsage
};