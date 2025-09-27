import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PaymentSession from '../models/paymentSessionModel.js';
import orderModel from '../models/orderModel.js';
import CheckoutSession from '../models/CheckoutSession.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

dotenv.config();

const systemHealthCheck = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔍 COMPREHENSIVE SYSTEM HEALTH CHECK\n');
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 1. Database Connection Health
    console.log('📊 DATABASE HEALTH:');
    const dbStats = await mongoose.connection.db.stats();
    console.log(`   ✅ Database: ${mongoose.connection.name}`);
    console.log(`   ✅ Collections: ${dbStats.collections}`);
    console.log(`   ✅ Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ✅ Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    
    // 2. Payment System Health
    console.log('\n💳 PAYMENT SYSTEM HEALTH:');
    
    const totalSessions = await PaymentSession.countDocuments();
    const totalOrders = await orderModel.countDocuments();
    const totalCheckoutSessions = await CheckoutSession.countDocuments();
    
    console.log(`   📊 Total Payment Sessions: ${totalSessions}`);
    console.log(`   📊 Total Orders: ${totalOrders}`);
    console.log(`   📊 Total Checkout Sessions: ${totalCheckoutSessions}`);
    
    // 3. Recent Activity
    console.log('\n⏰ RECENT ACTIVITY:');
    
    const recentSessions = await PaymentSession.find({
      createdAt: { $gte: oneHourAgo }
    }).sort({ createdAt: -1 });
    
    const recentOrders = await orderModel.find({
      createdAt: { $gte: oneHourAgo }
    }).sort({ createdAt: -1 });
    
    const recentCheckoutSessions = await CheckoutSession.find({
      createdAt: { $gte: oneHourAgo }
    }).sort({ createdAt: -1 });
    
    console.log(`   🕐 Last Hour:`);
    console.log(`      Sessions: ${recentSessions.length}`);
    console.log(`      Orders: ${recentOrders.length}`);
    console.log(`      Checkout Sessions: ${recentCheckoutSessions.length}`);
    
    // 4. Missing Orders Check
    console.log('\n🚨 MISSING ORDERS CHECK:');
    
    const successfulSessions = await PaymentSession.find({ status: 'success' });
    const missingOrders = [];
    
    for (const session of successfulSessions) {
      const order = await orderModel.findOne({
        phonepeTransactionId: session.phonepeTransactionId
      });
      if (!order) {
        missingOrders.push(session);
      }
    }
    
    if (missingOrders.length > 0) {
      console.log(`   ❌ CRITICAL: ${missingOrders.length} missing orders found!`);
      missingOrders.forEach((session, index) => {
        console.log(`      ${index + 1}. ${session.phonepeTransactionId} - ${session.userEmail} - ${session.createdAt}`);
      });
    } else {
      console.log(`   ✅ No missing orders found`);
    }
    
    // 5. Failed Sessions Check
    console.log('\n❌ FAILED SESSIONS CHECK:');
    
    const failedSessions = await PaymentSession.find({
      status: 'failed',
      createdAt: { $gte: oneDayAgo }
    });
    
    const pendingSessions = await PaymentSession.find({
      status: 'pending',
      createdAt: { $gte: oneDayAgo }
    });
    
    console.log(`   Failed Sessions (24h): ${failedSessions.length}`);
    console.log(`   Pending Sessions (24h): ${pendingSessions.length}`);
    
    if (failedSessions.length > 0) {
      console.log(`   ⚠️  Recent failed sessions:`);
      failedSessions.slice(0, 5).forEach((session, index) => {
        console.log(`      ${index + 1}. ${session.phonepeTransactionId} - ${session.userEmail} - ${session.createdAt}`);
      });
    }
    
    // 6. Data Integrity Check
    console.log('\n🔍 DATA INTEGRITY CHECK:');
    
    const sessionsWithoutOrderPayload = await PaymentSession.find({
      orderPayload: { $exists: false }
    });
    
    const sessionsWithoutOrderData = await PaymentSession.find({
      orderData: { $exists: false }
    });
    
    const orphanedCheckoutSessions = await CheckoutSession.find({
      status: { $in: ['pending', 'awaiting_payment'] },
      createdAt: { $lt: oneDayAgo }
    });
    
    console.log(`   Sessions without orderPayload: ${sessionsWithoutOrderPayload.length}`);
    console.log(`   Sessions without orderData: ${sessionsWithoutOrderData.length}`);
    console.log(`   Orphaned checkout sessions: ${orphanedCheckoutSessions.length}`);
    
    // 7. Performance Metrics
    console.log('\n⚡ PERFORMANCE METRICS:');
    
    const avgOrderValue = await orderModel.aggregate([
      { $match: { total: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgValue: { $avg: '$total' } } }
    ]);
    
    const totalRevenue = await orderModel.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
    ]);
    
    console.log(`   Average Order Value: ₹${avgOrderValue[0]?.avgValue?.toFixed(2) || '0.00'}`);
    console.log(`   Total Revenue: ₹${totalRevenue[0]?.totalRevenue?.toFixed(2) || '0.00'}`);
    
    // 8. System Status Summary
    console.log('\n📋 SYSTEM STATUS SUMMARY:');
    
    const criticalIssues = [];
    const warnings = [];
    
    if (missingOrders.length > 0) {
      criticalIssues.push(`${missingOrders.length} missing orders`);
    }
    
    if (failedSessions.length > 10) {
      warnings.push(`${failedSessions.length} failed sessions in 24h`);
    }
    
    if (sessionsWithoutOrderPayload.length > 0) {
      warnings.push(`${sessionsWithoutOrderPayload.length} sessions without orderPayload`);
    }
    
    if (orphanedCheckoutSessions.length > 0) {
      warnings.push(`${orphanedCheckoutSessions.length} orphaned checkout sessions`);
    }
    
    if (criticalIssues.length > 0) {
      console.log(`   🚨 CRITICAL ISSUES:`);
      criticalIssues.forEach(issue => console.log(`      - ${issue}`));
    } else {
      console.log(`   ✅ No critical issues found`);
    }
    
    if (warnings.length > 0) {
      console.log(`   ⚠️  WARNINGS:`);
      warnings.forEach(warning => console.log(`      - ${warning}`));
    } else {
      console.log(`   ✅ No warnings`);
    }
    
    // 9. Overall Health Status
    const overallStatus = criticalIssues.length > 0 ? 'CRITICAL' : 
                         warnings.length > 0 ? 'WARNING' : 'HEALTHY';
    
    console.log(`\n🎯 OVERALL SYSTEM STATUS: ${overallStatus}`);
    
    if (overallStatus === 'CRITICAL') {
      console.log(`\n🚨 IMMEDIATE ACTION REQUIRED!`);
      console.log(`   Run: node scripts/recover-orders.js`);
    } else if (overallStatus === 'WARNING') {
      console.log(`\n⚠️  System needs attention but is operational`);
    } else {
      console.log(`\n✅ System is healthy and operational`);
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Health check error:', error);
  }
};

systemHealthCheck();
