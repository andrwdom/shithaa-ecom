#!/usr/bin/env node

/**
 * QUICK DRAFT ORDERS FIX
 * Simple script to fix stuck draft orders with better error handling
 */

import mongoose from 'mongoose';

// MongoDB connection string
const MONGODB_URI = "mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=admin";

// Order schema (simplified)
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
    _id: mongoose.Schema.Types.ObjectId
}, { collection: 'orders' });

const Order = mongoose.model('Order', orderSchema);

// Payment session schema (simplified)
const paymentSessionSchema = new mongoose.Schema({
    phonepeTransactionId: String,
    status: String,
    _id: mongoose.Schema.Types.ObjectId
}, { collection: 'paymentsessions' });

const PaymentSession = mongoose.model('PaymentSession', paymentSessionSchema);

async function connectDB() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        
        const options = {
            serverSelectionTimeoutMS: 30000, // 30 seconds
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            maxPoolSize: 10,
            retryWrites: true
        };
        
        await mongoose.connect(MONGODB_URI, options);
        console.log('✅ Connected to MongoDB successfully');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        return false;
    }
}

async function findStuckDraftOrders() {
    console.log('🔍 Searching for stuck DRAFT orders...');
    
    try {
        // Find DRAFT orders with PhonePe transaction IDs
        const draftOrders = await Order.find({
            status: 'DRAFT',
            phonepeTransactionId: { $exists: true, $ne: null }
        }).limit(20); // Limit to avoid overwhelming the system
        
        console.log(`📊 Found ${draftOrders.length} DRAFT orders`);
        
        if (draftOrders.length === 0) {
            console.log('✅ No stuck DRAFT orders found!');
            return [];
        }
        
        // Show the orders we found
        console.log('\n📋 DRAFT Orders found:');
        draftOrders.forEach((order, i) => {
            console.log(`  ${i + 1}. Order ${order.orderId} - ₹${order.total || order.totalAmount || 'Unknown'} - ${order.phonepeTransactionId}`);
            console.log(`     Customer: ${order.userInfo?.email || 'Unknown'} - Created: ${order.createdAt}`);
        });
        
        return draftOrders;
    } catch (error) {
        console.error('❌ Error finding draft orders:', error.message);
        return [];
    }
}

async function checkPaymentSessions(orders) {
    console.log('\n🔍 Checking payment sessions for these orders...');
    
    const results = [];
    
    for (const order of orders) {
        try {
            console.log(`\n🔧 Checking order ${order.orderId}...`);
            
            // Check if there's a successful payment session
            const paymentSession = await PaymentSession.findOne({
                phonepeTransactionId: order.phonepeTransactionId
            });
            
            if (paymentSession) {
                console.log(`   📊 Payment session found: ${paymentSession.status}`);
                
                if (paymentSession.status === 'success') {
                    console.log(`   ✅ Successful payment session found!`);
                    results.push({
                        order,
                        paymentSession,
                        shouldFix: true,
                        reason: 'successful_payment_session'
                    });
                } else {
                    console.log(`   ⚠️ Payment session status: ${paymentSession.status}`);
                    results.push({
                        order,
                        paymentSession,
                        shouldFix: false,
                        reason: `payment_status_${paymentSession.status}`
                    });
                }
            } else {
                console.log(`   ❌ No payment session found`);
                results.push({
                    order,
                    paymentSession: null,
                    shouldFix: false,
                    reason: 'no_payment_session'
                });
            }
        } catch (error) {
            console.error(`   ❌ Error checking order ${order.orderId}:`, error.message);
            results.push({
                order,
                paymentSession: null,
                shouldFix: false,
                reason: `error_${error.message}`
            });
        }
    }
    
    return results;
}

async function fixOrders(results) {
    console.log('\n🔧 Fixing orders with successful payments...');
    
    const toFix = results.filter(r => r.shouldFix);
    console.log(`📊 Found ${toFix.length} orders that can be fixed`);
    
    if (toFix.length === 0) {
        console.log('✅ No orders need fixing!');
        return;
    }
    
    let fixedCount = 0;
    let failedCount = 0;
    
    for (const result of toFix) {
        try {
            console.log(`\n🔧 Fixing order ${result.order.orderId}...`);
            
            // Update the order status
            const updateResult = await Order.findByIdAndUpdate(result.order._id, {
                status: 'CONFIRMED',
                orderStatus: 'CONFIRMED',
                paymentStatus: 'PAID',
                confirmedAt: new Date(),
                paidAt: new Date(),
                fixedBy: 'draft_fix_script',
                fixedAt: new Date()
            });
            
            if (updateResult) {
                console.log(`   ✅ Order ${result.order.orderId} fixed successfully!`);
                fixedCount++;
            } else {
                console.log(`   ❌ Failed to update order ${result.order.orderId}`);
                failedCount++;
            }
        } catch (error) {
            console.error(`   ❌ Error fixing order ${result.order.orderId}:`, error.message);
            failedCount++;
        }
    }
    
    console.log('\n📊 FIX SUMMARY:');
    console.log('================');
    console.log(`✅ Successfully fixed: ${fixedCount} orders`);
    console.log(`❌ Failed to fix: ${failedCount} orders`);
    
    if (fixedCount > 0) {
        console.log('\n🎉 DRAFT ORDERS FIXED SUCCESSFULLY!');
        console.log('Orders have been updated to CONFIRMED status.');
    }
}

async function main() {
    console.log('🔧 QUICK DRAFT ORDERS FIX');
    console.log('==========================');
    
    const connected = await connectDB();
    if (!connected) {
        console.log('❌ Cannot proceed without database connection');
        process.exit(1);
    }
    
    try {
        // Step 1: Find stuck draft orders
        const draftOrders = await findStuckDraftOrders();
        
        if (draftOrders.length === 0) {
            console.log('✅ No stuck orders found. System is healthy!');
            return;
        }
        
        // Step 2: Check payment sessions
        const results = await checkPaymentSessions(draftOrders);
        
        // Step 3: Fix orders with successful payments
        await fixOrders(results);
        
    } catch (error) {
        console.error('❌ Script failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run the script
main().catch(console.error);
