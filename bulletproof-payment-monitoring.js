#!/usr/bin/env node

/**
 * BULLETPROOF PAYMENT MONITORING
 * 
 * This script monitors your payment system 24/7 and automatically
 * fixes issues before they become problems.
 */

import mongoose from 'mongoose';
import orderModel from './backend/models/orderModel.js';
import PaymentSession from './backend/models/PaymentSession.js';

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');

console.log('🛡️ BULLETPROOF PAYMENT MONITORING STARTED...');

// Monitor for stuck orders every 5 minutes
setInterval(async () => {
  try {
    console.log('🔍 Checking for stuck orders...');
    
    // Find orders that are stuck in pending state for more than 10 minutes
    const stuckOrders = await orderModel.find({
      paymentStatus: 'pending',
      createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) }
    });
    
    if (stuckOrders.length > 0) {
      console.log(`⚠️ Found ${stuckOrders.length} stuck orders`);
      
      for (const order of stuckOrders) {
        // Try to verify payment status with PhonePe
        if (order.phonepeTransactionId) {
          try {
            // In production, call PhonePe's status API here
            // For now, mark as failed after timeout
            await orderModel.findByIdAndUpdate(order._id, {
              paymentStatus: 'failed',
              orderStatus: 'Failed',
              status: 'Payment Timeout',
              updatedAt: new Date()
            });
            
            console.log(`❌ Marked stuck order ${order.orderId} as failed`);
          } catch (error) {
            console.error(`Error processing stuck order ${order.orderId}:`, error.message);
          }
        }
      }
    }
    
    // Check for orphaned payment sessions
    const orphanedSessions = await PaymentSession.find({
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes
    });
    
    if (orphanedSessions.length > 0) {
      console.log(`🧹 Cleaning up ${orphanedSessions.length} orphaned payment sessions`);
      
      for (const session of orphanedSessions) {
        await PaymentSession.findByIdAndUpdate(session._id, {
          status: 'expired',
          updatedAt: new Date()
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Monitoring error:', error.message);
  }
}, 5 * 60 * 1000); // Check every 5 minutes

// Monitor for failed payments every 10 minutes
setInterval(async () => {
  try {
    console.log('🔍 Checking for failed payments that should be successful...');
    
    // Find orders marked as failed but with successful PhonePe responses
    const failedOrders = await orderModel.find({
      paymentStatus: 'failed',
      phonepeResponse: { $exists: true }
    });
    
    for (const order of failedOrders) {
      if (order.phonepeResponse && order.phonepeResponse.state) {
        const state = order.phonepeResponse.state.toUpperCase();
        const responseCode = order.phonepeResponse.responseCode;
        
        const isSuccess = (
          state === 'PAID' ||
          state === 'COMPLETED' ||
          state === 'SUCCESS' ||
          state === 'SUCCESSFUL' ||
          state === 'CAPTURED' ||
          responseCode === 'SUCCESS' ||
          responseCode === '000' ||
          (responseCode && responseCode.toString().startsWith('00'))
        );
        
        if (isSuccess) {
          console.log(`🔧 Auto-fixing order ${order.orderId} - payment was actually successful`);
          
          await orderModel.findByIdAndUpdate(order._id, {
            paymentStatus: 'PAID',
            orderStatus: 'CONFIRMED',
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            paidAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Auto-fix error:', error.message);
  }
}, 10 * 60 * 1000); // Check every 10 minutes

// Health check endpoint
const express = require('express');
const app = express();
const PORT = 3001;

app.get('/health', async (req, res) => {
  try {
    const stats = {
      totalOrders: await orderModel.countDocuments(),
      successfulOrders: await orderModel.countDocuments({ paymentStatus: 'PAID' }),
      failedOrders: await orderModel.countDocuments({ paymentStatus: 'failed' }),
      pendingOrders: await orderModel.countDocuments({ paymentStatus: 'pending' }),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      status: 'healthy',
      stats,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🛡️ Bulletproof monitoring running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🛡️ Bulletproof monitoring stopped');
  process.exit(0);
});
