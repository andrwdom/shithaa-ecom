/**
 * PRODUCTION RECONCILIATION JOB
 * 
 * This job runs every 60 seconds to find and reconcile draft orders that may have been paid
 * but missed webhook delivery due to network issues, Cloudflare glitches, or other problems.
 * 
 * FEATURES:
 * ✅ Real PhonePe API integration
 * ✅ Atomic stock commit using commitOrder
 * ✅ Comprehensive error handling and retry logic
 * ✅ Detailed logging and monitoring
 * ✅ Idempotency protection
 * ✅ Rate limiting to avoid API abuse
 */

import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import { commitOrder } from '../services/orderCommit.js';
import EnhancedLogger from '../utils/enhancedLogger.js';
import { sendDraftRecoveryEmail } from '../utils/emailService.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

class DraftReconciliationJob {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.rateLimiter = new Map(); // Track API calls per minute
    this.maxApiCallsPerMinute = 30; // PhonePe rate limit
    this.reconciliationInterval = 60000; // 60 seconds
    this.lookbackMinutes = 5; // Look back 5 minutes for draft orders
    this.maxOrdersPerRun = 20; // Process max 20 orders per run
  }

  /**
   * Start the reconciliation job
   */
  start() {
    if (this.isRunning) {
      EnhancedLogger.webhookLog('WARN', 'Reconciliation job already running');
      return;
    }

    this.isRunning = true;
    EnhancedLogger.webhookLog('INFO', 'Starting draft reconciliation job', {
      interval: this.reconciliationInterval,
      lookbackMinutes: this.lookbackMinutes,
      maxOrdersPerRun: this.maxOrdersPerRun
    });

    // Start the reconciliation loop
    this.intervalId = setInterval(() => {
      this.performReconciliation();
    }, this.reconciliationInterval);

    // Run initial reconciliation
    this.performReconciliation();
  }

  /**
   * Stop the reconciliation job
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    EnhancedLogger.webhookLog('INFO', 'Draft reconciliation job stopped');
  }

  /**
   * Send draft recovery emails for abandoned orders
   */
  async sendDraftRecoveryEmails(draftOrders, correlationId) {
    const emailPromises = draftOrders.map(async (order) => {
      try {
        // Only send if not already sent in last 24 hours
        const lastEmailSent = order.lastRecoveryEmailSent;
        const now = new Date();
        const hoursSinceLastEmail = lastEmailSent ? 
          (now - lastEmailSent) / (1000 * 60 * 60) : 24;
        
        if (hoursSinceLastEmail < 24) {
          EnhancedLogger.webhookLog('INFO', 'Skipping email - sent recently', {
            correlationId,
            orderId: order.orderId,
            hoursSinceLastEmail: Math.round(hoursSinceLastEmail * 100) / 100
          });
          return;
        }
        
        await sendDraftRecoveryEmail({
          to: order.email,
          orderId: order.orderId,
          amount: order.totalAmount,
          items: order.items.map(item => ({
            name: item.name,
            size: item.size,
            quantity: item.quantity,
            price: item.price
          })),
          checkoutUrl: `${process.env.FRONTEND_URL}/checkout?recovery=${order.idempotencyKey}`,
          expiresAt: new Date(order.draftCreatedAt.getTime() + 24 * 60 * 60 * 1000) // 24 hours
        });
        
        // Update last email sent timestamp
        order.lastRecoveryEmailSent = now;
        await order.save();
        
        EnhancedLogger.webhookLog('SUCCESS', 'Draft recovery email sent', {
          correlationId,
          orderId: order.orderId,
          email: order.email
        });
        
      } catch (error) {
        EnhancedLogger.webhookLog('ERROR', 'Failed to send draft recovery email', {
          correlationId,
          orderId: order.orderId,
          error: error.message
        });
      }
    });
    
    await Promise.allSettled(emailPromises);
  }

  /**
   * Main reconciliation function
   */
  async performReconciliation() {
    if (!this.isRunning) return;

    const correlationId = `RECONCILE-${Date.now()}`;
    const startTime = Date.now();

    try {
      EnhancedLogger.webhookLog('INFO', 'Starting draft reconciliation cycle', {
        correlationId,
        timestamp: new Date().toISOString()
      });

      // 1. Find draft orders that need reconciliation
      const draftOrders = await this.findDraftOrdersForReconciliation();
      
      if (draftOrders.length === 0) {
        EnhancedLogger.webhookLog('INFO', 'No draft orders found for reconciliation', {
          correlationId
        });
        return;
      }

      EnhancedLogger.webhookLog('INFO', `Found ${draftOrders.length} draft orders for reconciliation`, {
        correlationId,
        orderIds: draftOrders.map(o => o.orderId)
      });

      // 2. Send recovery emails for abandoned orders
      await this.sendDraftRecoveryEmails(draftOrders, correlationId);

      // 3. Process each draft order
      const results = {
        processed: 0,
        confirmed: 0,
        cancelled: 0,
        errors: 0,
        skipped: 0
      };

      for (const order of draftOrders) {
        try {
          const result = await this.reconcileDraftOrder(order, correlationId);
          results.processed++;
          
          if (result.action === 'confirmed') {
            results.confirmed++;
          } else if (result.action === 'cancelled') {
            results.cancelled++;
          } else if (result.action === 'skipped') {
            results.skipped++;
          }
        } catch (error) {
          results.errors++;
          EnhancedLogger.criticalAlert('RECONCILIATION: Failed to reconcile draft order', {
            correlationId,
            orderId: order.orderId,
            error: error.message,
            stack: error.stack
          });
        }
      }

      const processingTime = Date.now() - startTime;
      EnhancedLogger.webhookLog('SUCCESS', 'Draft reconciliation cycle completed', {
        correlationId,
        processingTime,
        results
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      EnhancedLogger.criticalAlert('RECONCILIATION: Reconciliation cycle failed', {
        correlationId,
        processingTime,
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Find draft orders that need reconciliation
   */
  async findDraftOrdersForReconciliation() {
    const lookbackTime = new Date(Date.now() - this.lookbackMinutes * 60 * 1000);
    
    const draftOrders = await orderModel.find({
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      createdAt: { $lt: lookbackTime },
      phonepeTransactionId: { $exists: true, $ne: null }
    })
    .sort({ createdAt: 1 }) // Process oldest first
    .limit(this.maxOrdersPerRun);

    return draftOrders;
  }

  /**
   * Reconcile a single draft order
   */
  async reconcileDraftOrder(order, correlationId) {
    EnhancedLogger.webhookLog('INFO', 'Reconciling draft order', {
      correlationId,
      orderId: order.orderId,
      phonepeTransactionId: order.phonepeTransactionId,
      createdAt: order.createdAt
    });

    // 1. Check PhonePe payment status
    const paymentStatus = await this.checkPhonePePaymentStatus(order.phonepeTransactionId, correlationId);
    
    if (!paymentStatus.success) {
      EnhancedLogger.webhookLog('WARN', 'Failed to check payment status, skipping order', {
        correlationId,
        orderId: order.orderId,
        error: paymentStatus.error
      });
      return { action: 'skipped', reason: 'API error' };
    }

    // 2. Process based on payment status
    if (paymentStatus.status === 'PAID' || paymentStatus.status === 'COMPLETED') {
      return await this.confirmDraftOrder(order, paymentStatus, correlationId);
    } else if (paymentStatus.status === 'FAILED' || paymentStatus.status === 'CANCELLED') {
      return await this.cancelDraftOrder(order, paymentStatus, correlationId);
    } else {
      // Still pending - check if it's too old
      const maxAge = 30 * 60 * 1000; // 30 minutes
      if (Date.now() - order.createdAt.getTime() > maxAge) {
        EnhancedLogger.webhookLog('WARN', 'Draft order too old and still pending, cancelling', {
          correlationId,
          orderId: order.orderId,
          age: Date.now() - order.createdAt.getTime()
        });
        return await this.cancelDraftOrder(order, { status: 'EXPIRED' }, correlationId);
      }
      
      return { action: 'skipped', reason: 'Still pending' };
    }
  }

  /**
   * Check PhonePe payment status using real API
   */
  async checkPhonePePaymentStatus(transactionId, correlationId) {
    try {
      // Rate limiting check
      if (!this.canMakeApiCall()) {
        return {
          success: false,
          error: 'Rate limit exceeded'
        };
      }

      const merchantId = process.env.PHONEPE_MERCHANT_ID;
      const saltKey = process.env.PHONEPE_SALT_KEY;
      const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
      
      if (!merchantId || !saltKey) {
        return {
          success: false,
          error: 'PhonePe credentials not configured'
        };
      }

      // Create request payload
      const payload = {
        merchantId,
        merchantTransactionId: transactionId
      };

      // Create checksum
      const crypto = await import('crypto');
      const checksum = crypto
        .createHash('sha256')
        .update(JSON.stringify(payload) + saltKey)
        .digest('hex');

      // Make API request
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? 'https://api.phonepe.com/apis/hermes/pg/v1/status'
        : 'https://api-preprod.phonepe.com/apis/hermes/pg/v1/status';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum + '###' + saltIndex,
          'accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`PhonePe API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          status: data.data?.state || 'UNKNOWN',
          amount: data.data?.amount,
          response: data
        };
      } else {
        return {
          success: false,
          error: data.message || 'API request failed'
        };
      }

    } catch (error) {
      EnhancedLogger.webhookLog('ERROR', 'PhonePe API call failed', {
        correlationId,
        transactionId,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirm a draft order using commitOrder
   */
  async confirmDraftOrder(order, paymentStatus, correlationId) {
    try {
      EnhancedLogger.webhookLog('INFO', 'Confirming draft order', {
        correlationId,
        orderId: order.orderId,
        paymentStatus: paymentStatus.status
      });

      // Use the atomic commitOrder function
      const paymentInfo = {
        phonepeTransactionId: order.phonepeTransactionId,
        transactionId: paymentStatus.response?.data?.transactionId || order.phonepeTransactionId,
        amount: paymentStatus.amount || order.total,
        status: 'SUCCESS',
        rawPayload: paymentStatus.response
      };

      const commitResult = await commitOrder(order._id, paymentInfo, {
        correlationId,
        source: 'reconciliation'
      });

      EnhancedLogger.webhookLog('SUCCESS', 'Draft order confirmed successfully', {
        correlationId,
        orderId: order.orderId,
        commitResult
      });

      return { action: 'confirmed', result: commitResult };

    } catch (error) {
      EnhancedLogger.criticalAlert('RECONCILIATION: Failed to confirm draft order', {
        correlationId,
        orderId: order.orderId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Cancel a draft order
   */
  async cancelDraftOrder(order, paymentStatus, correlationId) {
    try {
      EnhancedLogger.webhookLog('INFO', 'Cancelling draft order', {
        correlationId,
        orderId: order.orderId,
        reason: paymentStatus.status
      });

      // Update order status
      await orderModel.findByIdAndUpdate(order._id, {
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
        cancelledAt: new Date(),
        cancellationReason: `Reconciliation: ${paymentStatus.status}`
      });

      EnhancedLogger.webhookLog('SUCCESS', 'Draft order cancelled successfully', {
        correlationId,
        orderId: order.orderId
      });

      return { action: 'cancelled', reason: paymentStatus.status };

    } catch (error) {
      EnhancedLogger.criticalAlert('RECONCILIATION: Failed to cancel draft order', {
        correlationId,
        orderId: order.orderId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Rate limiting check
   */
  canMakeApiCall() {
    const now = Date.now();
    const minuteAgo = now - 60000;
    
    // Clean old entries
    for (const [timestamp] of this.rateLimiter) {
      if (timestamp < minuteAgo) {
        this.rateLimiter.delete(timestamp);
      }
    }
    
    // Check if we can make another call
    if (this.rateLimiter.size >= this.maxApiCallsPerMinute) {
      return false;
    }
    
    // Record this call
    this.rateLimiter.set(now, true);
    return true;
  }
}

// Create singleton instance
const reconciliationJob = new DraftReconciliationJob();

// Export for use in other modules
export default reconciliationJob;

// Start the job if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting Draft Reconciliation Job...');
  
  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db')
    .then(() => {
      console.log('✅ Connected to MongoDB');
      reconciliationJob.start();
    })
    .catch(error => {
      console.error('❌ MongoDB connection failed:', error);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Shutting down reconciliation job...');
    reconciliationJob.stop();
    mongoose.connection.close();
    process.exit(0);
  });
}
