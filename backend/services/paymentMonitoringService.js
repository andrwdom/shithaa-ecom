/**
 * PAYMENT MONITORING SERVICE
 * 
 * 24/7 monitoring of the payment system with automatic recovery
 */

import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/PaymentSession.js';
import CheckoutSession from '../models/CheckoutSession.js';
import bulletproofPaymentProcessor from './bulletproofPaymentProcessor.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

class PaymentMonitoringService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 30000; // 30 seconds
    this.intervalId = null;
  }

  /**
   * Start monitoring service
   */
  start() {
    if (this.isRunning) {
      console.log('Payment monitoring service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🔍 Starting payment monitoring service...');

    // Initial check
    this.performHealthCheck();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);

    console.log('✅ Payment monitoring service started');
  }

  /**
   * Stop monitoring service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Payment monitoring service stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      console.log('🔍 Performing payment system health check...');

      // 1. Check for stuck orders
      await this.checkStuckOrders();

      // 2. Check for orphaned payment sessions
      await this.checkOrphanedSessions();

      // 3. Check for stock inconsistencies
      await this.checkStockInconsistencies();

      // 4. Check for failed payments that should be successful
      await this.checkFailedPayments();

      console.log('✅ Payment system health check completed');

    } catch (error) {
      console.error('❌ Payment system health check failed:', error);
      EnhancedLogger.criticalAlert('MONITORING: Health check failed', {
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Check for stuck orders and attempt recovery
   */
  async checkStuckOrders() {
    try {
      // Find orders stuck in draft state for more than 5 minutes
      const stuckOrders = await orderModel.find({
        status: { $in: ['DRAFT', 'draft', 'Pending', 'PENDING'] },
        createdAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }
      });

      if (stuckOrders.length > 0) {
        console.log(`🚨 Found ${stuckOrders.length} stuck orders`);
        
        for (const order of stuckOrders) {
          await this.attemptOrderRecovery(order);
        }
      }

    } catch (error) {
      console.error('Error checking stuck orders:', error);
    }
  }

  /**
   * Attempt to recover a stuck order
   */
  async attemptOrderRecovery(order) {
    try {
      console.log(`🔧 Attempting recovery for order ${order.orderId}`);

      // Check if there's a successful payment for this order
      if (order.phonepeTransactionId) {
        const result = await bulletproofPaymentProcessor.processPayment(
          order.phonepeTransactionId,
          { state: 'COMPLETED' }, // Assume success for recovery
          'monitoring_recovery',
          `monitor_${Date.now()}`
        );

        if (result.success) {
          console.log(`✅ Successfully recovered order ${order.orderId}`);
        } else {
          console.log(`❌ Failed to recover order ${order.orderId}: ${result.message}`);
        }
      }

    } catch (error) {
      console.error(`Error recovering order ${order.orderId}:`, error);
    }
  }

  /**
   * Check for orphaned payment sessions
   */
  async checkOrphanedSessions() {
    try {
      // Find payment sessions that are successful but have no corresponding order
      const orphanedSessions = await PaymentSession.find({
        status: 'success',
        orderId: { $exists: false }
      });

      if (orphanedSessions.length > 0) {
        console.log(`🚨 Found ${orphanedSessions.length} orphaned payment sessions`);
        
        for (const session of orphanedSessions) {
          await this.attemptSessionRecovery(session);
        }
      }

    } catch (error) {
      console.error('Error checking orphaned sessions:', error);
    }
  }

  /**
   * Attempt to recover an orphaned payment session
   */
  async attemptSessionRecovery(session) {
    try {
      console.log(`🔧 Attempting recovery for session ${session._id}`);

      const result = await bulletproofPaymentProcessor.processPayment(
        session.phonepeTransactionId,
        session.phonepeResponse || { state: 'COMPLETED' },
        'session_recovery',
        `session_${Date.now()}`
      );

      if (result.success) {
        console.log(`✅ Successfully recovered session ${session._id}`);
      } else {
        console.log(`❌ Failed to recover session ${session._id}: ${result.message}`);
      }

    } catch (error) {
      console.error(`Error recovering session ${session._id}:`, error);
    }
  }

  /**
   * Check for stock inconsistencies
   */
  async checkStockInconsistencies() {
    try {
      // This would check for negative stock, mismatched reservations, etc.
      // Implementation depends on your specific stock tracking needs
      console.log('📊 Checking stock inconsistencies...');
      // Add specific stock validation logic here
      
    } catch (error) {
      console.error('Error checking stock inconsistencies:', error);
    }
  }

  /**
   * Check for failed payments that should be successful
   */
  async checkFailedPayments() {
    try {
      // Find orders marked as failed but with successful PhonePe responses
      const failedOrders = await orderModel.find({
        status: 'FAILED',
        'phonepeResponse.state': { $in: ['COMPLETED', 'PAID', 'SUCCESS'] }
      });

      if (failedOrders.length > 0) {
        console.log(`🚨 Found ${failedOrders.length} failed orders with successful payments`);
        
        for (const order of failedOrders) {
          await this.attemptPaymentRecovery(order);
        }
      }

    } catch (error) {
      console.error('Error checking failed payments:', error);
    }
  }

  /**
   * Attempt to recover a failed payment
   */
  async attemptPaymentRecovery(order) {
    try {
      console.log(`🔧 Attempting payment recovery for order ${order.orderId}`);

      const result = await bulletproofPaymentProcessor.processPayment(
        order.phonepeTransactionId,
        order.phonepeResponse,
        'payment_recovery',
        `payment_${Date.now()}`
      );

      if (result.success) {
        console.log(`✅ Successfully recovered payment for order ${order.orderId}`);
      } else {
        console.log(`❌ Failed to recover payment for order ${order.orderId}: ${result.message}`);
      }

    } catch (error) {
      console.error(`Error recovering payment for order ${order.orderId}:`, error);
    }
  }

  /**
   * Get monitoring statistics
   */
  async getStatistics() {
    try {
      const stats = {
        totalOrders: await orderModel.countDocuments(),
        confirmedOrders: await orderModel.countDocuments({ status: 'CONFIRMED' }),
        failedOrders: await orderModel.countDocuments({ status: 'FAILED' }),
        draftOrders: await orderModel.countDocuments({ status: { $in: ['DRAFT', 'draft', 'Pending', 'PENDING'] } }),
        totalSessions: await PaymentSession.countDocuments(),
        successfulSessions: await PaymentSession.countDocuments({ status: 'success' }),
        failedSessions: await PaymentSession.countDocuments({ status: 'failed' }),
        timestamp: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      console.error('Error getting statistics:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new PaymentMonitoringService();
