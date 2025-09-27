import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PaymentSession from '../models/paymentSessionModel.js';
import orderModel from '../models/orderModel.js';
import CheckoutSession from '../models/CheckoutSession.js';

dotenv.config();

const auditPaymentSystem = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔍 COMPREHENSIVE PAYMENT SYSTEM AUDIT\n');
    
    // 1. Check all payment sessions vs orders
    const allPaymentSessions = await PaymentSession.find({});
    const allOrders = await orderModel.find({});
    
    console.log(`📊 TOTAL PAYMENT SESSIONS: ${allPaymentSessions.length}`);
    console.log(`📊 TOTAL ORDERS: ${allOrders.length}`);
    
    // 2. Find missing orders
    const missingOrders = [];
    for (const session of allPaymentSessions) {
      if (session.status === 'success') {
        const order = await orderModel.findOne({
          phonepeTransactionId: session.phonepeTransactionId
        });
        if (!order) {
          missingOrders.push(session);
        }
      }
    }
    
    console.log(`\n🚨 MISSING ORDERS: ${missingOrders.length}`);
    missingOrders.forEach((session, index) => {
      console.log(`${index + 1}. ${session.phonepeTransactionId} - ${session.userEmail} - ${session.createdAt}`);
    });
    
    // 3. Check for orphaned data
    const orphanedCheckoutSessions = await CheckoutSession.find({
      status: { $in: ['pending', 'awaiting_payment'] },
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    console.log(`\n🧹 ORPHANED CHECKOUT SESSIONS: ${orphanedCheckoutSessions.length}`);
    
    // 4. Check for failed payments
    const failedSessions = await PaymentSession.find({
      status: 'failed'
    });
    
    console.log(`\n❌ FAILED PAYMENT SESSIONS: ${failedSessions.length}`);
    
    // 5. Check for recent activity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSessions = await PaymentSession.find({
      createdAt: { $gte: oneHourAgo }
    });
    const recentOrders = await orderModel.find({
      createdAt: { $gte: oneHourAgo }
    });
    
    console.log(`\n⏰ RECENT ACTIVITY (1 hour):`);
    console.log(`   Sessions: ${recentSessions.length}`);
    console.log(`   Orders: ${recentOrders.length}`);
    
    // 6. Check for data integrity issues
    const sessionsWithoutOrderPayload = await PaymentSession.find({
      orderPayload: { $exists: false }
    });
    
    console.log(`\n🔍 DATA INTEGRITY ISSUES:`);
    console.log(`   Sessions without orderPayload: ${sessionsWithoutOrderPayload.length}`);
    
    // 7. Summary
    console.log(`\n📋 AUDIT SUMMARY:`);
    console.log(`   ✅ Total Orders: ${allOrders.length}`);
    console.log(`   ⚠️  Missing Orders: ${missingOrders.length}`);
    console.log(`   🧹 Orphaned Sessions: ${orphanedCheckoutSessions.length}`);
    console.log(`   ❌ Failed Sessions: ${failedSessions.length}`);
    console.log(`   🔍 Data Issues: ${sessionsWithoutOrderPayload.length}`);
    
    if (missingOrders.length > 0) {
      console.log(`\n🚨 CRITICAL: ${missingOrders.length} missing orders need immediate attention!`);
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('Audit error:', error);
  }
};

auditPaymentSystem();
