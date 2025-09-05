#!/usr/bin/env node

/**
 * Fix Reserved Stock Issue Script
 * This script fixes the atomic stock reservation issue by:
 * 1. Releasing all currently reserved stock
 * 2. Marking failed payment sessions as properly handled
 * 3. Cleaning up expired sessions
 */

import mongoose from 'mongoose';
import productModel from './backend/models/productModel.js';
import CheckoutSession from './backend/models/CheckoutSession.js';
import PaymentSession from './backend/models/PaymentSession.js';
import { releaseStockReservation } from './backend/utils/stock.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom';

const fixReservedStockIssue = async () => {
  try {
    console.log('🔧 Starting reserved stock fix...');
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // 1. Find all checkout sessions with reserved stock
    const sessionsWithReservedStock = await CheckoutSession.find({
      stockReserved: true,
      status: { $in: ['pending', 'awaiting_payment', 'failed'] }
    });
    
    console.log(`📊 Found ${sessionsWithReservedStock.length} sessions with reserved stock`);
    
    // 2. Release stock for each session
    let releasedCount = 0;
    let errorCount = 0;
    
    for (const session of sessionsWithReservedStock) {
      try {
        console.log(`🔄 Processing session: ${session.sessionId}`);
        
        // Release stock for all items
        for (const item of session.items) {
          try {
            await releaseStockReservation(item.productId, item.size, item.quantity);
            console.log(`  ✅ Released ${item.quantity}x ${item.name} (${item.size})`);
          } catch (error) {
            console.error(`  ❌ Failed to release stock for ${item.name}:`, error.message);
            errorCount++;
          }
        }
        
        // Mark session as processed
        session.stockReserved = false;
        if (session.status === 'pending' || session.status === 'awaiting_payment') {
          session.status = 'expired';
        }
        await session.save();
        
        releasedCount++;
        console.log(`  ✅ Session ${session.sessionId} processed successfully`);
        
      } catch (error) {
        console.error(`❌ Error processing session ${session.sessionId}:`, error);
        errorCount++;
      }
    }
    
    // 3. Clean up failed payment sessions
    const failedPaymentSessions = await PaymentSession.find({
      status: 'failed',
      checkoutSessionId: { $exists: true }
    });
    
    console.log(`📊 Found ${failedPaymentSessions.length} failed payment sessions`);
    
    for (const paymentSession of failedPaymentSessions) {
      try {
        // Find and update the corresponding checkout session
        const checkoutSession = await CheckoutSession.findOne({
          sessionId: paymentSession.checkoutSessionId
        });
        
        if (checkoutSession && checkoutSession.stockReserved) {
          console.log(`🔄 Fixing failed payment session: ${paymentSession.phonepeTransactionId}`);
          
          // Release any remaining stock
          for (const item of checkoutSession.items) {
            try {
              await releaseStockReservation(item.productId, item.size, item.quantity);
            } catch (error) {
              console.error(`  ❌ Failed to release stock:`, error.message);
            }
          }
          
          // Mark as properly failed
          checkoutSession.stockReserved = false;
          checkoutSession.status = 'failed';
          await checkoutSession.save();
        }
      } catch (error) {
        console.error(`❌ Error fixing payment session:`, error);
      }
    }
    
    // 4. Run the standard cleanup
    console.log('🧹 Running standard cleanup...');
    const cleanupResult = await CheckoutSession.cleanExpired();
    console.log(`✅ Cleaned ${cleanupResult.deletedCount} expired sessions`);
    
    // 5. Verify the fix
    console.log('🔍 Verifying fix...');
    const remainingReserved = await productModel.find({
      'sizes.reserved': { $gt: 0 }
    });
    
    console.log('\n📈 Summary:');
    console.log(`   - Sessions processed: ${releasedCount}`);
    console.log(`   - Errors encountered: ${errorCount}`);
    console.log(`   - Expired sessions cleaned: ${cleanupResult.deletedCount}`);
    console.log(`   - Products still with reserved stock: ${remainingReserved.length}`);
    
    if (remainingReserved.length > 0) {
      console.log('\n⚠️  Products still with reserved stock:');
      for (const product of remainingReserved) {
        const reservedSizes = product.sizes.filter(size => size.reserved > 0);
        console.log(`   - ${product.name}: ${reservedSizes.map(s => `${s.size}(${s.reserved})`).join(', ')}`);
      }
    } else {
      console.log('\n✅ All reserved stock has been released!');
    }
    
    console.log('\n🎉 Reserved stock fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the fix
fixReservedStockIssue()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
