#!/usr/bin/env node

/**
 * SIMPLE STUCK DRAFT ORDERS FIX
 * Finds and fixes draft orders where payment was successful
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load environment variables
function loadEnv() {
  const envPath = path.join(process.cwd(), 'backend', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !process.env[key]) {
        process.env[key] = value.trim();
      }
    });
  }
}

loadEnv();

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('🔧 FIXING STUCK DRAFT ORDERS');
  console.log('============================');
  
  await connectDB();
  
  try {
    // Import models
    const orderModel = (await import('./backend/models/orderModel.js')).default;
    const PaymentSession = (await import('./backend/models/paymentSessionModel.js')).default;
    
    console.log('✅ Models loaded successfully');
    
    // Find stuck draft orders
    console.log('\n🔍 Finding stuck draft orders...');
    const stuckOrders = await orderModel.find({
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      phonepeTransactionId: { $exists: true, $ne: null }
    });
    
    console.log(`📊 Found ${stuckOrders.length} stuck draft orders`);
    
    if (stuckOrders.length === 0) {
      console.log('✅ No stuck draft orders found!');
      return;
    }
    
    const results = [];
    
    for (const order of stuckOrders) {
      console.log(`\n🔧 Processing order ${order.orderId} (${order.phonepeTransactionId})`);
      
      try {
        // Check if payment was successful via PaymentSession
        const paymentSession = await PaymentSession.findOne({
          phonepeTransactionId: order.phonepeTransactionId
        });
        
        if (paymentSession && paymentSession.status === 'success') {
          console.log(`✅ Found successful payment session for order ${order.orderId}`);
          
          // Confirm the order
          await orderModel.findByIdAndUpdate(order._id, {
            status: 'CONFIRMED',
            orderStatus: 'CONFIRMED',
            paymentStatus: 'PAID',
            paidAt: new Date(),
            confirmedAt: new Date(),
            fixedBy: 'stuck_draft_fix_script',
            fixedAt: new Date()
          });
          
          console.log(`✅ Order ${order.orderId} confirmed successfully`);
          results.push({ orderId: order.orderId, success: true, method: 'payment_session' });
        } else {
          console.log(`⚠️ No successful payment session found for order ${order.orderId}`);
          results.push({ orderId: order.orderId, success: false, reason: 'no_successful_payment' });
        }
      } catch (error) {
        console.error(`❌ Error processing order ${order.orderId}:`, error.message);
        results.push({ orderId: order.orderId, success: false, error: error.message });
      }
    }
    
    // Summary
    console.log('\n📊 FIX RESULTS:');
    console.log('================');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successfully fixed: ${successful} orders`);
    console.log(`❌ Could not fix: ${failed} orders`);
    
    if (successful > 0) {
      console.log('\n🎉 FIX COMPLETED!');
      console.log('Orders have been confirmed and customers will receive their items.');
      console.log('\n✅ Fixed orders:');
      results.filter(r => r.success).forEach(result => {
        console.log(`   - ${result.orderId}`);
      });
    }
    
    if (failed > 0) {
      console.log('\n⚠️ COULD NOT FIX:');
      results.filter(r => !r.success).forEach(result => {
        console.log(`   - ${result.orderId}: ${result.reason || result.error || 'unknown error'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Fix script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the fix
main().catch(console.error);
