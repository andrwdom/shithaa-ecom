#!/usr/bin/env node

/**
 * Cleanup script to remove failed/cancelled orders from the database
 * This script removes orders that were created but payment failed or was cancelled
 */

import mongoose from 'mongoose';
import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import CheckoutSession from '../models/CheckoutSession.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clean up failed orders
const cleanupFailedOrders = async () => {
  try {
    console.log('🧹 Starting cleanup of failed orders...');
    
    // Find orders with failed payment status
    const failedOrders = await orderModel.find({
      $or: [
        { paymentStatus: 'failed' },
        { paymentStatus: 'PENDING' },
        { orderStatus: 'Failed' },
        { orderStatus: 'PENDING' },
        { status: 'Payment Failed' },
        { status: 'PENDING' }
      ]
    });
    
    console.log(`📊 Found ${failedOrders.length} failed/pending orders to clean up`);
    
    if (failedOrders.length === 0) {
      console.log('✅ No failed orders found. Database is clean!');
      return;
    }
    
    // Log details of orders to be deleted
    console.log('\n📋 Orders to be deleted:');
    failedOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ID: ${order.orderId || order._id}`);
      // console.log(`   Customer: ${order.customerName || order.userInfo?.name || 'Unknown'}`);
      // console.log(`   Email: ${order.email || order.userInfo?.email || 'Unknown'}`);
      console.log(`   Amount: ₹${order.totalAmount || order.total || order.totalPrice || 0}`);
      console.log(`   Status: ${order.paymentStatus} | ${order.orderStatus} | ${order.status}`);
      console.log(`   Created: ${order.createdAt || order.placedAt}`);
      console.log('   ---');
    });
    
    // Delete failed orders
    const deleteResult = await orderModel.deleteMany({
      $or: [
        { paymentStatus: 'failed' },
        { paymentStatus: 'PENDING' },
        { orderStatus: 'Failed' },
        { orderStatus: 'PENDING' },
        { status: 'Payment Failed' },
        { status: 'PENDING' }
      ]
    });
    
    console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} failed orders`);
    
    // Clean up related payment sessions
    const failedPaymentSessions = await PaymentSession.find({
      status: 'failed'
    });
    
    console.log(`📊 Found ${failedPaymentSessions.length} failed payment sessions to clean up`);
    
    if (failedPaymentSessions.length > 0) {
      const paymentSessionDeleteResult = await PaymentSession.deleteMany({
        status: 'failed'
      });
      
      console.log(`🗑️  Deleted ${paymentSessionDeleteResult.deletedCount} failed payment sessions`);
    }
    
    // Clean up expired checkout sessions
    const expiredCheckoutSessions = await CheckoutSession.find({
      $or: [
        { status: 'expired' },
        { status: 'failed' },
        { expiresAt: { $lt: new Date() } }
      ]
    });
    
    console.log(`📊 Found ${expiredCheckoutSessions.length} expired checkout sessions to clean up`);
    
    if (expiredCheckoutSessions.length > 0) {
      const checkoutSessionDeleteResult = await CheckoutSession.deleteMany({
        $or: [
          { status: 'expired' },
          { status: 'failed' },
          { expiresAt: { $lt: new Date() } }
        ]
      });
      
      console.log(`🗑️  Deleted ${checkoutSessionDeleteResult.deletedCount} expired checkout sessions`);
    }
    
    console.log('\n✅ Cleanup completed successfully!');
    console.log('📈 Summary:');
    console.log(`   - Failed orders deleted: ${deleteResult.deletedCount}`);
    console.log(`   - Failed payment sessions deleted: ${failedPaymentSessions.length > 0 ? paymentSessionDeleteResult.deletedCount : 0}`);
    console.log(`   - Expired checkout sessions deleted: ${expiredCheckoutSessions.length > 0 ? checkoutSessionDeleteResult.deletedCount : 0}`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await cleanupFailedOrders();
    console.log('\n🎉 Cleanup script completed successfully!');
  } catch (error) {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
main();
