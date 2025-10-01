#!/usr/bin/env node

/**
 * WEBHOOK RECOVERY SCRIPT
 * 
 * This script can be run to:
 * 1. Find and process failed webhooks
 * 2. Recover orders from successful payments that weren't processed
 * 3. Generate reports on webhook failures
 * 4. Fix data inconsistencies between payments and orders
 * 
 * Usage:
 * node backend/scripts/webhookRecovery.js [options]
 * 
 * Options:
 * --dry-run: Show what would be processed without making changes
 * --days=N: Look back N days (default: 7)
 * --order-id=ID: Process specific order ID
 * --auto-fix: Automatically fix recoverable issues
 */

import mongoose from 'mongoose';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import CheckoutSession from '../models/CheckoutSession.js';
import BulletproofWebhookService from '../services/bulletproofWebhookService.js';
import EnhancedLogger from '../utils/enhancedLogger.js';
import dotenv from 'dotenv';

dotenv.config();

class WebhookRecoveryTool {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      days: options.days || 7,
      orderId: options.orderId || null,
      autoFix: options.autoFix || false,
      verbose: options.verbose || false,
      ...options
    };
    
    this.webhookService = new BulletproofWebhookService();
    this.results = {
      processed: 0,
      recovered: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');
      console.log('✅ Connected to MongoDB');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      process.exit(1);
    }
  }

  async run() {
    console.log('🚀 Starting Webhook Recovery Tool...\n');
    
    if (this.options.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    try {
      await this.connect();

      if (this.options.orderId) {
        await this.processSpecificOrder(this.options.orderId);
      } else {
        await this.scanAndRecover();
      }

      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Recovery tool failed:', error.message);
      this.results.errors.push({ type: 'tool_failure', error: error.message });
    } finally {
      await mongoose.disconnect();
      console.log('\n🔚 Recovery tool completed');
    }
  }

  async scanAndRecover() {
    console.log('🔍 Scanning for webhook issues...\n');

    // 1. Find failed webhooks
    await this.findFailedWebhooks();

    // 2. Find successful payments without orders
    await this.findOrphanedPayments();

    // 3. Find inconsistent order states
    await this.findInconsistentOrders();

    // 4. Process recoverable items
    if (this.options.autoFix) {
      await this.processRecoverableItems();
    }
  }

  async findFailedWebhooks() {
    const since = new Date(Date.now() - this.options.days * 24 * 60 * 60 * 1000);
    
    const failedWebhooks = await RawWebhook.find({
      receivedAt: { $gte: since },
      $or: [
        { processed: false },
        { processed: true, error: { $exists: true } }
      ]
    }).sort({ receivedAt: -1 });

    console.log(`📊 Found ${failedWebhooks.length} failed webhooks in last ${this.options.days} days`);

    for (const webhook of failedWebhooks) {
      await this.analyzeWebhook(webhook);
    }
  }

  async findOrphanedPayments() {
    const since = new Date(Date.now() - this.options.days * 24 * 60 * 60 * 1000);
    
    // Find payment sessions with successful webhooks but no corresponding orders
    const successfulWebhooks = await RawWebhook.find({
      receivedAt: { $gte: since },
      'parsedData.isSuccess': true,
      processed: true
    });

    let orphanedCount = 0;
    
    for (const webhook of successfulWebhooks) {
      const orderId = webhook.parsedData?.orderId;
      if (!orderId) continue;

      const order = await orderModel.findOne({ phonepeTransactionId: orderId });
      if (!order) {
        orphanedCount++;
        console.log(`🚨 ORPHANED PAYMENT: ${orderId} - Payment successful but no order found`);
        
        if (this.options.autoFix && !this.options.dryRun) {
          await this.recoverOrphanedPayment(webhook);
        }
      }
    }

    console.log(`📊 Found ${orphanedCount} orphaned payments`);
  }

  async findInconsistentOrders() {
    const since = new Date(Date.now() - this.options.days * 24 * 60 * 60 * 1000);
    
    // Find draft orders older than 1 hour (likely abandoned)
    const staleOrders = await orderModel.find({
      status: 'DRAFT',
      createdAt: { $lte: new Date(Date.now() - 60 * 60 * 1000) }, // 1 hour ago
      createdAt: { $gte: since }
    });

    console.log(`📊 Found ${staleOrders.length} stale draft orders`);

    for (const order of staleOrders) {
      // Check if payment was actually successful
      const webhook = await RawWebhook.findOne({
        'parsedData.orderId': order.phonepeTransactionId,
        'parsedData.isSuccess': true
      });

      if (webhook) {
        console.log(`🚨 INCONSISTENT ORDER: ${order.orderId} - Payment successful but order still DRAFT`);
        
        if (this.options.autoFix && !this.options.dryRun) {
          await this.fixInconsistentOrder(order, webhook);
        }
      }
    }
  }

  async analyzeWebhook(webhook) {
    if (this.options.verbose) {
      console.log(`\n🔍 Analyzing webhook ${webhook._id}:`);
      console.log(`  - Correlation ID: ${webhook.correlationId}`);
      console.log(`  - Received: ${webhook.receivedAt}`);
      console.log(`  - Processed: ${webhook.processed}`);
      console.log(`  - Error: ${webhook.error || 'None'}`);
    }

    const orderId = webhook.parsedData?.orderId;
    if (orderId) {
      const order = await orderModel.findOne({ phonepeTransactionId: orderId });
      if (this.options.verbose) {
        console.log(`  - Order found: ${order ? 'Yes' : 'No'}`);
        if (order) {
          console.log(`  - Order status: ${order.status} / ${order.paymentStatus}`);
        }
      }
    }

    return webhook;
  }

  async recoverOrphanedPayment(webhook) {
    try {
      console.log(`🔄 Attempting to recover orphaned payment ${webhook.parsedData.orderId}...`);

      const webhookPayload = this.parseWebhookPayload(webhook.raw);
      if (!webhookPayload.isValid) {
        console.log(`❌ Cannot recover - invalid payload: ${webhookPayload.error}`);
        return;
      }

      const result = await this.webhookService.processWebhook(
        webhookPayload, 
        webhook.correlationId || `recovery_${Date.now()}`
      );

      if (result.action.includes('order')) {
        console.log(`✅ Recovered orphaned payment - ${result.action}: ${result.orderId}`);
        this.results.recovered++;
      } else {
        console.log(`⚠️ Recovery attempt completed but no order created: ${result.action}`);
      }

    } catch (error) {
      console.log(`❌ Recovery failed: ${error.message}`);
      this.results.errors.push({
        type: 'recovery_failed',
        webhookId: webhook._id,
        orderId: webhook.parsedData?.orderId,
        error: error.message
      });
    }
  }

  async fixInconsistentOrder(order, webhook) {
    try {
      console.log(`🔄 Fixing inconsistent order ${order.orderId}...`);

      order.status = 'CONFIRMED';
      order.paymentStatus = 'PAID';
      order.confirmedAt = new Date();
      order.webhookProcessedAt = new Date();
      order.meta = {
        ...(order.meta || {}),
        recoveredBy: 'webhook_recovery_tool',
        recoveredAt: new Date(),
        originalWebhookId: webhook._id
      };

      await order.save();

      console.log(`✅ Fixed inconsistent order ${order.orderId}`);
      this.results.recovered++;

    } catch (error) {
      console.log(`❌ Fix failed: ${error.message}`);
      this.results.errors.push({
        type: 'fix_failed',
        orderId: order.orderId,
        error: error.message
      });
    }
  }

  async processSpecificOrder(orderId) {
    console.log(`🔍 Processing specific order: ${orderId}\n`);

    // Find webhook for this order
    const webhook = await RawWebhook.findOne({
      'parsedData.orderId': orderId
    });

    if (!webhook) {
      console.log(`❌ No webhook found for order ${orderId}`);
      return;
    }

    // Find order
    const order = await orderModel.findOne({ phonepeTransactionId: orderId });
    
    console.log(`📋 Order Status:`);
    console.log(`  - Webhook exists: Yes (${webhook._id})`);
    console.log(`  - Webhook processed: ${webhook.processed}`);
    console.log(`  - Webhook error: ${webhook.error || 'None'}`);
    console.log(`  - Order exists: ${order ? 'Yes' : 'No'}`);
    
    if (order) {
      console.log(`  - Order status: ${order.status}`);
      console.log(`  - Payment status: ${order.paymentStatus}`);
      console.log(`  - Created: ${order.createdAt}`);
      console.log(`  - Confirmed: ${order.confirmedAt || 'Not confirmed'}`);
    }

    // Attempt recovery if needed
    if (webhook.parsedData?.isSuccess && (!order || order.status === 'DRAFT')) {
      if (this.options.autoFix && !this.options.dryRun) {
        await this.recoverOrphanedPayment(webhook);
      } else {
        console.log(`\n⚠️ Order needs recovery (use --auto-fix to attempt recovery)`);
      }
    }
  }

  parseWebhookPayload(rawPayload) {
    try {
      const body = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
      const { payload, event } = body;
      
      if (!payload || !event) {
        return { isValid: false, error: 'Missing payload or event' };
      }

      const orderId = payload.orderId || payload.merchantTransactionId || payload.transactionId;
      const state = (payload.state || payload.status || '').toString().toUpperCase();
      const amount = payload.amount || 0;
      
      const isSuccess = ['COMPLETED', 'SUCCESS', 'PAID', 'CAPTURED', 'OK'].includes(state);
      const isFailure = ['FAILED', 'CANCELLED', 'TIMEOUT', 'ERROR'].includes(state);

      return {
        isValid: true,
        orderId,
        state,
        amount,
        isSuccess,
        isFailure,
        event,
        fullPayload: payload
      };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  async generateReport() {
    console.log('\n📊 WEBHOOK RECOVERY REPORT');
    console.log('=' * 50);
    console.log(`Period: Last ${this.options.days} days`);
    console.log(`Mode: ${this.options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Auto-fix: ${this.options.autoFix ? 'ENABLED' : 'DISABLED'}`);
    console.log();
    console.log(`Results:`);
    console.log(`  - Items processed: ${this.results.processed}`);
    console.log(`  - Items recovered: ${this.results.recovered}`);
    console.log(`  - Items failed: ${this.results.failed}`);
    console.log(`  - Items skipped: ${this.results.skipped}`);
    console.log(`  - Errors encountered: ${this.results.errors.length}`);

    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type}: ${error.error}`);
        if (error.orderId) console.log(`   Order ID: ${error.orderId}`);
        if (error.webhookId) console.log(`   Webhook ID: ${error.webhookId}`);
      });
    }

    console.log();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--auto-fix') {
    options.autoFix = true;
  } else if (arg === '--verbose') {
    options.verbose = true;
  } else if (arg.startsWith('--days=')) {
    options.days = parseInt(arg.split('=')[1]) || 7;
  } else if (arg.startsWith('--order-id=')) {
    options.orderId = arg.split('=')[1];
  }
});

// Run the recovery tool
const tool = new WebhookRecoveryTool(options);
tool.run().catch(console.error);
