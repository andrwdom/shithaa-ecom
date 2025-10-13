#!/usr/bin/env node

/**
 * CRITICAL FIX: Payment Status Logic
 * 
 * PROBLEM: Orders stay DRAFT even when payment is successful because
 * stock confirmation fails, but customer's money is already debited.
 * 
 * SOLUTION: Separate payment confirmation from stock confirmation.
 * Payment status should be based on PhonePe response, not stock status.
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
    phonepeResponse: Object,
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
    phonepeResponse: Object,
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

async function analyzePaymentStatusIssues() {
    console.log('\n🔍 ANALYZING PAYMENT STATUS ISSUES');
    console.log('==================================');
    
    try {
        // Find DRAFT orders with PhonePe transaction IDs
        const draftOrders = await Order.find({
            status: 'DRAFT',
            phonepeTransactionId: { $exists: true, $ne: null }
        });
        
        console.log(`📊 Found ${draftOrders.length} DRAFT orders with transaction IDs`);
        
        if (draftOrders.length === 0) {
            console.log('✅ No problematic DRAFT orders found');
            return;
        }
        
        // Analyze each DRAFT order
        for (const order of draftOrders) {
            console.log(`\n📦 Analyzing Order: ${order.orderId}`);
            console.log(`   Transaction ID: ${order.phonepeTransactionId}`);
            console.log(`   Amount: ₹${order.total || order.totalAmount || 'Unknown'}`);
            console.log(`   Customer: ${order.userInfo?.email || 'Unknown'}`);
            console.log(`   Created: ${order.createdAt}`);
            
            // Check for payment session
            const paymentSession = await PaymentSession.findOne({
                phonepeTransactionId: order.phonepeTransactionId
            });
            
            if (paymentSession) {
                console.log(`   📊 Payment session found: ${paymentSession.status}`);
                console.log(`   📊 Payment response:`, paymentSession.phonepeResponse);
                
                // Check if payment was actually successful
                const paymentResponse = paymentSession.phonepeResponse || {};
                const isPaymentSuccessful = (
                    paymentResponse.state === 'PAID' ||
                    paymentResponse.state === 'COMPLETED' ||
                    paymentResponse.state === 'SUCCESS' ||
                    paymentResponse.responseCode === 'SUCCESS' ||
                    paymentResponse.responseCode === '000'
                );
                
                if (isPaymentSuccessful) {
                    console.log(`   🚨 ISSUE FOUND: Payment was successful but order is DRAFT!`);
                    console.log(`   💡 This order should be CONFIRMED regardless of stock issues`);
                    
                    // This is the problematic case - payment successful but order still DRAFT
                    console.log(`   🔧 RECOMMENDATION: Fix this order immediately`);
                } else {
                    console.log(`   ✅ Payment was not successful - DRAFT status is correct`);
                }
            } else {
                console.log(`   ❌ No payment session found`);
                console.log(`   🤔 This could be a cancelled/failed payment`);
            }
        }
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
    }
}

async function fixPaymentStatusLogic() {
    console.log('\n🔧 FIXING PAYMENT STATUS LOGIC');
    console.log('==============================');
    
    try {
        // Find DRAFT orders where payment was actually successful
        const draftOrders = await Order.find({
            status: 'DRAFT',
            phonepeTransactionId: { $exists: true, $ne: null }
        });
        
        let fixedCount = 0;
        let skippedCount = 0;
        
        for (const order of draftOrders) {
            console.log(`\n🔧 Processing Order: ${order.orderId}`);
            
            // Check payment session
            const paymentSession = await PaymentSession.findOne({
                phonepeTransactionId: order.phonepeTransactionId
            });
            
            if (!paymentSession) {
                console.log(`   ⚠️ No payment session - skipping`);
                skippedCount++;
                continue;
            }
            
            // Check if payment was successful
            const paymentResponse = paymentSession.phonepeResponse || {};
            const isPaymentSuccessful = (
                paymentResponse.state === 'PAID' ||
                paymentResponse.state === 'COMPLETED' ||
                paymentResponse.state === 'SUCCESS' ||
                paymentResponse.responseCode === 'SUCCESS' ||
                paymentResponse.responseCode === '000'
            );
            
            if (isPaymentSuccessful) {
                console.log(`   ✅ Payment was successful - fixing order status`);
                
                // Update order to CONFIRMED regardless of stock issues
                await Order.findByIdAndUpdate(order._id, {
                    status: 'CONFIRMED',
                    orderStatus: 'CONFIRMED',
                    paymentStatus: 'PAID',
                    phonepeResponse: paymentResponse,
                    confirmedAt: new Date(),
                    paidAt: new Date(),
                    fixedBy: 'payment_status_logic_fix',
                    fixedAt: new Date(),
                    metadata: {
                        ...order.metadata,
                        fixReason: 'Payment was successful but order was stuck in DRAFT due to stock confirmation failure',
                        originalIssue: 'Stock confirmation failed but payment was successful'
                    }
                });
                
                console.log(`   ✅ Order ${order.orderId} fixed - now CONFIRMED`);
                fixedCount++;
            } else {
                console.log(`   ⚠️ Payment was not successful - keeping DRAFT status`);
                skippedCount++;
            }
        }
        
        console.log('\n📊 FIX SUMMARY:');
        console.log('================');
        console.log(`✅ Orders fixed: ${fixedCount}`);
        console.log(`⚠️ Orders skipped: ${skippedCount}`);
        
        if (fixedCount > 0) {
            console.log('\n🎉 PAYMENT STATUS LOGIC FIXED!');
            console.log('Orders with successful payments are now CONFIRMED regardless of stock issues.');
        }
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
    }
}

async function createPaymentStatusValidation() {
    console.log('\n🛡️ CREATING PAYMENT STATUS VALIDATION');
    console.log('=====================================');
    
    const validationCode = `
// PAYMENT STATUS VALIDATION - Add this to your payment callback logic

function isPaymentSuccessful(phonepeResponse) {
    if (!phonepeResponse) return false;
    
    return (
        phonepeResponse.state === 'PAID' ||
        phonepeResponse.state === 'COMPLETED' ||
        phonepeResponse.state === 'SUCCESS' ||
        phonepeResponse.responseCode === 'SUCCESS' ||
        phonepeResponse.responseCode === '000'
    );
}

function isPaymentFailed(phonepeResponse) {
    if (!phonepeResponse) return false;
    
    return (
        phonepeResponse.state === 'FAILED' ||
        phonepeResponse.state === 'CANCELLED' ||
        phonepeResponse.state === 'TIMEOUT' ||
        phonepeResponse.responseCode === 'PAYMENT_ERROR' ||
        phonepeResponse.responseCode === 'PAYMENT_CANCELLED'
    );
}

// CRITICAL: Update order status based on payment, not stock
async function updateOrderStatusBasedOnPayment(order, phonepeResponse) {
    if (isPaymentSuccessful(phonepeResponse)) {
        // Payment successful - order should be CONFIRMED
        await orderModel.findByIdAndUpdate(order._id, {
            status: 'CONFIRMED',
            orderStatus: 'CONFIRMED', 
            paymentStatus: 'PAID',
            phonepeResponse: phonepeResponse,
            confirmedAt: new Date(),
            paidAt: new Date()
        });
        
        // Try to handle stock separately (don't fail the order if stock fails)
        try {
            await confirmStockReservation(order.items);
            await orderModel.findByIdAndUpdate(order._id, {
                stockConfirmed: true,
                stockConfirmedAt: new Date()
            });
        } catch (stockError) {
            console.error('Stock confirmation failed but payment was successful:', stockError);
            // Order is still CONFIRMED - stock issue is separate
        }
        
    } else if (isPaymentFailed(phonepeResponse)) {
        // Payment failed - order should be FAILED
        await orderModel.findByIdAndUpdate(order._id, {
            status: 'FAILED',
            orderStatus: 'FAILED',
            paymentStatus: 'FAILED',
            phonepeResponse: phonepeResponse,
            failedAt: new Date()
        });
        
    } else {
        // Payment status unclear - keep as DRAFT
        console.log('Payment status unclear, keeping order as DRAFT');
    }
}
`;
    
    console.log('📝 Validation code created:');
    console.log(validationCode);
    
    // Save to file
    const fs = await import('fs');
    fs.writeFileSync('payment-status-validation.js', validationCode);
    console.log('\n💾 Validation code saved to: payment-status-validation.js');
}

async function main() {
    console.log('🔧 PAYMENT STATUS LOGIC FIX');
    console.log('============================');
    
    const connected = await connectDB();
    if (!connected) {
        process.exit(1);
    }
    
    try {
        await analyzePaymentStatusIssues();
        await fixPaymentStatusLogic();
        await createPaymentStatusValidation();
        
        console.log('\n✅ Payment status logic fix complete!');
        console.log('\n💡 Next steps:');
        console.log('1. Update your payment callback logic to use the validation code');
        console.log('2. Separate payment confirmation from stock confirmation');
        console.log('3. Monitor for any remaining DRAFT orders with successful payments');
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

main().catch(console.error);
