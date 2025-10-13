#!/usr/bin/env node

/**
 * DRAFT ORDERS MONITOR
 * Helps identify and fix orders stuck in DRAFT status
 */

import mongoose from 'mongoose';

const MONGODB_URI = "mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=admin";

// Order schema
const orderSchema = new mongoose.Schema({
    orderId: String,
    status: String,
    orderStatus: String,
    paymentStatus: String,
    phonepeTransactionId: String,
    userInfo: Object,
    total: Number,
    totalAmount: Number,
    createdAt: Date,
    updatedAt: Date,
    _id: mongoose.Schema.Types.ObjectId
}, { collection: 'orders' });

const Order = mongoose.model('Order', orderSchema);

// Payment session schema
const paymentSessionSchema = new mongoose.Schema({
    phonepeTransactionId: String,
    status: String,
    createdAt: Date,
    _id: mongoose.Schema.Types.ObjectId
}, { collection: 'paymentsessions' });

const PaymentSession = mongoose.model('PaymentSession', paymentSessionSchema);

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

async function analyzeDraftOrders() {
    console.log('\n📊 DRAFT ORDERS ANALYSIS');
    console.log('========================');
    
    try {
        // Find all DRAFT orders
        const draftOrders = await Order.find({
            $or: [
                { status: 'DRAFT' },
                { orderStatus: 'DRAFT' }
            ]
        }).sort({ createdAt: -1 });
        
        console.log(`📋 Found ${draftOrders.length} DRAFT orders`);
        
        if (draftOrders.length === 0) {
            console.log('✅ No DRAFT orders found - system is healthy!');
            return;
        }
        
        // Analyze each DRAFT order
        console.log('\n🔍 Analyzing DRAFT orders...');
        
        const analysis = {
            withPaymentSession: 0,
            withoutPaymentSession: 0,
            recentOrders: 0,
            oldOrders: 0,
            withTransactionId: 0,
            withoutTransactionId: 0
        };
        
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        for (const order of draftOrders) {
            console.log(`\n📦 Order: ${order.orderId}`);
            console.log(`   Amount: ₹${order.total || order.totalAmount || 'Unknown'}`);
            console.log(`   Customer: ${order.userInfo?.email || 'Unknown'}`);
            console.log(`   Created: ${order.createdAt}`);
            console.log(`   Transaction ID: ${order.phonepeTransactionId || 'None'}`);
            
            // Check if it has a transaction ID
            if (order.phonepeTransactionId) {
                analysis.withTransactionId++;
                console.log(`   🔍 Checking payment session...`);
                
                // Check for payment session
                const paymentSession = await PaymentSession.findOne({
                    phonepeTransactionId: order.phonepeTransactionId
                });
                
                if (paymentSession) {
                    analysis.withPaymentSession++;
                    console.log(`   📊 Payment session found: ${paymentSession.status}`);
                    
                    if (paymentSession.status === 'success') {
                        console.log(`   ✅ This order should be CONFIRMED!`);
                        console.log(`   🔧 Recommendation: Run fix script to confirm this order`);
                    } else {
                        console.log(`   ⚠️ Payment session status: ${paymentSession.status}`);
                    }
                } else {
                    analysis.withoutPaymentSession++;
                    console.log(`   ❌ No payment session found`);
                    console.log(`   🤔 Possible causes:`);
                    console.log(`      - Payment was not completed`);
                    console.log(`      - Payment session expired`);
                    console.log(`      - User cancelled payment`);
                }
            } else {
                analysis.withoutTransactionId++;
                console.log(`   ❌ No PhonePe transaction ID`);
                console.log(`   🤔 This order was likely created but payment never started`);
            }
            
            // Check if order is recent or old
            if (order.createdAt > oneDayAgo) {
                analysis.recentOrders++;
                console.log(`   🆕 Recent order (within 24 hours)`);
            } else {
                analysis.oldOrders++;
                console.log(`   ⏰ Old order (older than 24 hours)`);
            }
        }
        
        // Summary
        console.log('\n📊 ANALYSIS SUMMARY:');
        console.log('====================');
        console.log(`Total DRAFT orders: ${draftOrders.length}`);
        console.log(`With PhonePe transaction ID: ${analysis.withTransactionId}`);
        console.log(`Without PhonePe transaction ID: ${analysis.withoutTransactionId}`);
        console.log(`With payment session: ${analysis.withPaymentSession}`);
        console.log(`Without payment session: ${analysis.withoutPaymentSession}`);
        console.log(`Recent orders (< 24h): ${analysis.recentOrders}`);
        console.log(`Old orders (> 24h): ${analysis.oldOrders}`);
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('===================');
        
        if (analysis.withPaymentSession > 0) {
            console.log(`🔧 ${analysis.withPaymentSession} orders have successful payments - run fix script`);
        }
        
        if (analysis.withoutPaymentSession > 0) {
            console.log(`⚠️ ${analysis.withoutPaymentSession} orders have no payment sessions - likely cancelled/failed payments`);
        }
        
        if (analysis.withoutTransactionId > 0) {
            console.log(`❌ ${analysis.withoutTransactionId} orders have no transaction IDs - payment never started`);
        }
        
        if (analysis.oldOrders > 0) {
            console.log(`⏰ ${analysis.oldOrders} orders are older than 24 hours - consider manual review`);
        }
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
    }
}

async function getOrderStatistics() {
    console.log('\n📈 ORDER STATUS STATISTICS');
    console.log('===========================');
    
    try {
        // Get counts by status
        const statusCounts = await Order.aggregate([
            {
                $group: {
                    _id: { 
                        status: '$status',
                        orderStatus: '$orderStatus'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        console.log('📊 Orders by Status:');
        statusCounts.forEach(stat => {
            const status = stat._id.status || stat._id.orderStatus || 'Unknown';
            console.log(`   ${status}: ${stat.count} orders`);
        });
        
        // Get recent orders (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentCounts = await Order.aggregate([
            { $match: { createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: { 
                        status: '$status',
                        orderStatus: '$orderStatus'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        console.log('\n📊 Recent Orders (Last 7 Days):');
        recentCounts.forEach(stat => {
            const status = stat._id.status || stat._id.orderStatus || 'Unknown';
            console.log(`   ${status}: ${stat.count} orders`);
        });
        
    } catch (error) {
        console.error('❌ Statistics failed:', error.message);
    }
}

async function main() {
    console.log('🔍 DRAFT ORDERS MONITOR');
    console.log('=======================');
    
    const connected = await connectDB();
    if (!connected) {
        process.exit(1);
    }
    
    try {
        await analyzeDraftOrders();
        await getOrderStatistics();
        
        console.log('\n✅ Analysis complete!');
        console.log('\n💡 To fix stuck orders, run: node fix-draft-orders-quick.js');
        
    } catch (error) {
        console.error('❌ Monitor failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

main().catch(console.error);
