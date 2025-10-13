#!/usr/bin/env node

/**
 * PAYMENT-STOCK ISSUES MONITOR
 * Monitors orders where payment was successful but stock confirmation failed
 */

import mongoose from 'mongoose';

const MONGODB_URI = "mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=admin";

// Order schema
const orderSchema = new mongoose.Schema({
    orderId: String,
    status: String,
    orderStatus: String,
    paymentStatus: String,
    stockConfirmed: Boolean,
    stockConfirmationErrors: [String],
    phonepeResponse: Object,
    createdAt: Date,
    _id: mongoose.Schema.Types.ObjectId
}, { collection: 'orders' });

const Order = mongoose.model('Order', orderSchema);

async function connectDB() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000
        });
        console.log('✅ Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
}

async function monitorPaymentStockIssues() {
    console.log('\n🔍 MONITORING PAYMENT-STOCK ISSUES');
    console.log('==================================');
    
    try {
        // Find orders where payment was successful but stock confirmation failed
        const problematicOrders = await Order.find({
            paymentStatus: 'PAID',
            stockConfirmed: false,
            stockConfirmationErrors: { $exists: true, $ne: [] }
        }).sort({ createdAt: -1 });
        
        console.log(`📊 Found ${problematicOrders.length} orders with payment-stock issues`);
        
        if (problematicOrders.length === 0) {
            console.log('✅ No payment-stock issues found - system is healthy!');
            return;
        }
        
        // Analyze each problematic order
        for (const order of problematicOrders) {
            console.log(`\n📦 Order: ${order.orderId}`);
            console.log(`   Status: ${order.status}`);
            console.log(`   Payment Status: ${order.paymentStatus}`);
            console.log(`   Stock Confirmed: ${order.stockConfirmed}`);
            console.log(`   Stock Errors: ${order.stockConfirmationErrors?.join(', ') || 'None'}`);
            console.log(`   Created: ${order.createdAt}`);
            
            // Check if this is a recent issue
            const now = new Date();
            const orderAge = now - order.createdAt;
            const hoursOld = orderAge / (1000 * 60 * 60);
            
            if (hoursOld < 24) {
                console.log(`   🚨 RECENT ISSUE: ${hoursOld.toFixed(1)} hours old`);
            } else {
                console.log(`   ⏰ OLD ISSUE: ${hoursOld.toFixed(1)} hours old`);
            }
        }
        
        // Summary
        console.log('\n📊 SUMMARY:');
        console.log('===========');
        console.log(`Total problematic orders: ${problematicOrders.length}`);
        
        const recentIssues = problematicOrders.filter(order => {
            const hoursOld = (new Date() - order.createdAt) / (1000 * 60 * 60);
            return hoursOld < 24;
        });
        
        console.log(`Recent issues (< 24h): ${recentIssues.length}`);
        console.log(`Old issues (> 24h): ${problematicOrders.length - recentIssues.length}`);
        
        if (recentIssues.length > 0) {
            console.log('\n🚨 ALERT: Recent payment-stock issues detected!');
            console.log('These orders need immediate attention.');
        }
        
    } catch (error) {
        console.error('❌ Monitoring failed:', error.message);
    }
}

async function getSystemHealth() {
    console.log('\n📈 SYSTEM HEALTH CHECK');
    console.log('=====================');
    
    try {
        // Get order statistics
        const totalOrders = await Order.countDocuments();
        const confirmedOrders = await Order.countDocuments({ status: 'CONFIRMED' });
        const draftOrders = await Order.countDocuments({ status: 'DRAFT' });
        const paidOrders = await Order.countDocuments({ paymentStatus: 'PAID' });
        const stockConfirmedOrders = await Order.countDocuments({ stockConfirmed: true });
        
        console.log(`📊 Total Orders: ${totalOrders}`);
        console.log(`✅ Confirmed Orders: ${confirmedOrders}`);
        console.log(`📝 Draft Orders: ${draftOrders}`);
        console.log(`💳 Paid Orders: ${paidOrders}`);
        console.log(`📦 Stock Confirmed Orders: ${stockConfirmedOrders}`);
        
        // Calculate success rates
        const paymentSuccessRate = totalOrders > 0 ? (paidOrders / totalOrders * 100).toFixed(1) : 0;
        const confirmationRate = paidOrders > 0 ? (confirmedOrders / paidOrders * 100).toFixed(1) : 0;
        const stockSuccessRate = paidOrders > 0 ? (stockConfirmedOrders / paidOrders * 100).toFixed(1) : 0;
        
        console.log('\n📊 SUCCESS RATES:');
        console.log(`💳 Payment Success Rate: ${paymentSuccessRate}%`);
        console.log(`✅ Order Confirmation Rate: ${confirmationRate}%`);
        console.log(`📦 Stock Confirmation Rate: ${stockSuccessRate}%`);
        
        // Health indicators
        if (confirmationRate >= 95) {
            console.log('\n🟢 HEALTH STATUS: EXCELLENT');
        } else if (confirmationRate >= 90) {
            console.log('\n🟡 HEALTH STATUS: GOOD');
        } else if (confirmationRate >= 80) {
            console.log('\n🟠 HEALTH STATUS: FAIR');
        } else {
            console.log('\n🔴 HEALTH STATUS: POOR');
        }
        
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
    }
}

async function main() {
    console.log('🔍 PAYMENT-STOCK ISSUES MONITOR');
    console.log('===============================');
    
    const connected = await connectDB();
    if (!connected) {
        process.exit(1);
    }
    
    try {
        await monitorPaymentStockIssues();
        await getSystemHealth();
        
        console.log('\n✅ Monitoring complete!');
        console.log('\n💡 Recommendations:');
        console.log('1. Run this monitor regularly to catch payment-stock issues');
        console.log('2. Set up alerts for orders with stockConfirmationErrors');
        console.log('3. Investigate any orders where payment succeeded but stock failed');
        
    } catch (error) {
        console.error('❌ Monitor failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

main().catch(console.error);
