#!/usr/bin/env node
/**
 * EMERGENCY RECONCILIATION SCRIPT
 * 
 * Finds and reconciles DRAFT orders with successful PhonePe payments
 * Run this ONCE after deploying hotfixes 1-3
 * 
 * Usage:
 *   node emergency-reconcile-paid-drafts.js [--dry-run] [--limit 50]
 * 
 * Flags:
 *   --dry-run   : Don't actually commit orders, just report what would be done
 *   --limit N   : Process max N orders (default: 50)
 */

import mongoose from 'mongoose';
import orderModel from './backend/models/orderModel.js';
import PaymentSession from './backend/models/PaymentSession.js';
import RawWebhook from './backend/models/RawWebhook.js';
import { confirmStockReservation } from './backend/utils/stock.js';
import EnhancedLogger from './backend/utils/enhancedLogger.js';

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex >= 0 ? parseInt(args[limitIndex + 1]) : 50;

console.log('🚨 EMERGENCY RECONCILIATION SCRIPT');
console.log('===================================');
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
console.log(`Limit: ${limit} orders`);
console.log('');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa_maternity_db';
await mongoose.connect(MONGODB_URI);
console.log('✅ Connected to MongoDB');

const results = {
  found: 0,
  verified: 0,
  reconciled: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

try {
  // Step 1: Find DRAFT orders with successful payment indicators
  console.log('\n📋 Step 1: Finding DRAFT orders with successful payments...');
  
  const draftOrders = await orderModel.find({
    status: 'DRAFT',
    $or: [
      { paymentStatus: 'PAID' },
      { paymentStatus: 'SUCCESS' },
      { 'phonepeResponse.state': 'COMPLETED' },
      { 'phonepeResponse.state': 'SUCCESS' },
      { 'phonepeResponse.responseCode': 'SUCCESS' }
    ],
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  }).limit(limit);
  
  results.found = draftOrders.length;
  console.log(`Found ${results.found} DRAFT orders with payment success indicators`);
  
  if (results.found === 0) {
    console.log('✅ No stuck orders found. System is healthy!');
    process.exit(0);
  }
  
  console.log('\n📋 Orders found:');
  draftOrders.forEach((order, i) => {
    console.log(`  ${i + 1}. Order ${order.orderId} - ₹${order.total} - ${order.phonepeTransactionId || 'NO_TXN_ID'}`);
  });
  
  // Step 2: Verify each order with PhonePe (or webhook records)
  console.log('\n🔍 Step 2: Verifying payment status...');
  
  for (const order of draftOrders) {
    const correlationId = `RECONCILE-${order.orderId}-${Date.now()}`;
    
    try {
      console.log(`\n--- Processing Order ${order.orderId} ---`);
      
      // Check if order has transaction ID
      if (!order.phonepeTransactionId) {
        console.log('⚠️  No PhonePe transaction ID, checking payment session...');
        
        const paymentSession = await PaymentSession.findOne({
          orderId: order.orderId
        });
        
        if (!paymentSession || !paymentSession.phonepeTransactionId) {
          console.log('❌ Cannot verify without transaction ID, skipping');
          results.skipped++;
          results.errors.push({
            orderId: order.orderId,
            reason: 'No transaction ID found'
          });
          continue;
        }
        
        order.phonepeTransactionId = paymentSession.phonepeTransactionId;
        console.log(`✅ Found transaction ID: ${order.phonepeTransactionId}`);
      }
      
      // Verify payment status
      let isPaymentVerified = false;
      
      // Method 1: Check webhook records
      const webhook = await RawWebhook.findOne({
        'parsedData.orderId': order.orderId,
        processed: true
      }).sort({ createdAt: -1 });
      
      if (webhook) {
        const webhookData = webhook.parsedData || {};
        const state = (webhookData.state || '').toUpperCase();
        isPaymentVerified = ['COMPLETED', 'SUCCESS', 'PAID'].includes(state);
        
        console.log(`Webhook found: state=${state}, verified=${isPaymentVerified}`);
      }
      
      // Method 2: Check order's phonepeResponse
      if (!isPaymentVerified && order.phonepeResponse) {
        const state = (order.phonepeResponse.state || '').toUpperCase();
        const code = (order.phonepeResponse.responseCode || '').toUpperCase();
        isPaymentVerified = 
          ['COMPLETED', 'SUCCESS', 'PAID'].includes(state) ||
          ['SUCCESS', 'PAYMENT_SUCCESS'].includes(code);
        
        console.log(`Order response: state=${state}, code=${code}, verified=${isPaymentVerified}`);
      }
      
      // Method 3: PhonePe API verification (optional - requires SDK)
      // TODO: Add PhonePe API call if SDK available
      
      if (!isPaymentVerified) {
        console.log('⚠️  Payment not verified, skipping reconciliation');
        results.skipped++;
        results.errors.push({
          orderId: order.orderId,
          reason: 'Payment verification failed'
        });
        continue;
      }
      
      results.verified++;
      console.log('✅ Payment verified as successful');
      
      // Step 3: Reconcile order (atomic commit)
      if (isDryRun) {
        console.log('🔸 DRY RUN: Would reconcile this order');
        results.reconciled++;
        continue;
      }
      
      console.log('💾 Reconciling order (atomic transaction)...');
      
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          // Confirm stock reservations
          const itemsToProcess = order.cartItems && order.cartItems.length > 0 
            ? order.cartItems 
            : order.items;
          
          if (!itemsToProcess || itemsToProcess.length === 0) {
            throw new Error('Order has no items to process');
          }
          
          console.log(`  Confirming stock for ${itemsToProcess.length} items...`);
          
          for (const item of itemsToProcess) {
            const productId = item.productId || item._id || item.id || item.product;
            
            if (!productId || !item.size || !item.quantity) {
              throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
            }
            
            const stockConfirmed = await confirmStockReservation(
              productId,
              item.size,
              item.quantity,
              { session, correlationId }
            );
            
            if (!stockConfirmed) {
              console.log(`  ⚠️  Stock confirmation failed for ${item.name} (${item.size})`);
              // Don't throw - log and continue
            } else {
              console.log(`  ✅ Stock confirmed: ${item.name} (${item.size}) x${item.quantity}`);
            }
          }
          
          // Update order status
          await orderModel.findByIdAndUpdate(
            order._id,
            {
              status: 'CONFIRMED',
              orderStatus: 'CONFIRMED',
              paymentStatus: 'PAID',
              stockConfirmed: true,
              stockConfirmedAt: new Date(),
              confirmedAt: new Date(),
              paidAt: new Date(),
              reconciledAt: new Date(),
              reconciledBy: 'emergency-script',
              updatedAt: new Date()
            },
            { session }
          );
          
          console.log('✅ Order status updated to CONFIRMED');
        });
        
        results.reconciled++;
        console.log('✅ Order reconciled successfully!');
        
        EnhancedLogger.webhookLog('SUCCESS', 'Emergency reconciliation completed', {
          correlationId,
          orderId: order.orderId,
          transactionId: order.phonepeTransactionId
        });
        
      } catch (txError) {
        console.error('❌ Transaction failed:', txError.message);
        results.failed++;
        results.errors.push({
          orderId: order.orderId,
          reason: txError.message
        });
      } finally {
        await session.endSession();
      }
      
    } catch (error) {
      console.error(`❌ Error processing order ${order.orderId}:`, error.message);
      results.failed++;
      results.errors.push({
        orderId: order.orderId,
        reason: error.message
      });
    }
  }
  
} catch (error) {
  console.error('❌ Fatal error:', error);
  results.errors.push({
    orderId: 'GLOBAL',
    reason: error.message
  });
}

// Final report
console.log('\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('📊 RECONCILIATION SUMMARY');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Found:          ${results.found} orders`);
console.log(`Verified:       ${results.verified} orders`);
console.log(`Reconciled:     ${results.reconciled} orders`);
console.log(`Failed:         ${results.failed} orders`);
console.log(`Skipped:        ${results.skipped} orders`);
console.log('');

if (results.errors.length > 0) {
  console.log('❌ ERRORS:');
  results.errors.forEach((err, i) => {
    console.log(`  ${i + 1}. Order ${err.orderId}: ${err.reason}`);
  });
  console.log('');
}

if (isDryRun) {
  console.log('🔸 DRY RUN MODE - No changes were made');
  console.log('   Run without --dry-run to actually reconcile orders');
} else {
  console.log(`✅ ${results.reconciled} orders successfully reconciled`);
  
  if (results.failed > 0 || results.skipped > 0) {
    console.log('⚠️  Some orders need manual review (see errors above)');
  }
}

console.log('═══════════════════════════════════════════════════════════');

// Disconnect
await mongoose.disconnect();
console.log('\n✅ Disconnected from MongoDB');

process.exit(results.failed > 0 ? 1 : 0);

