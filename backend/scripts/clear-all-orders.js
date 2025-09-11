#!/usr/bin/env node

/**
 * Clear All Orders Script for Shithaa E-commerce
 * This script safely removes all order history while preserving database structure
 * Run this before site launch to start with a clean database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Import models
import orderModel from '../models/orderModel.js';
import PaymentSession from '../models/paymentSessionModel.js';
import CheckoutSession from '../models/CheckoutSession.js';
import Payment from '../models/Payment.js';
import PaymentEvent from '../models/PaymentEvent.js';
import Reservation from '../models/Reservation.js';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectToDatabase() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shitha-maternity';
        
        log('🔌 Connecting to MongoDB...', 'blue');
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            maxPoolSize: 10
        });
        
        log('✅ Connected to MongoDB successfully!', 'green');
        return true;
    } catch (error) {
        log(`❌ Failed to connect to MongoDB: ${error.message}`, 'red');
        return false;
    }
}

async function getOrderCounts() {
    try {
        const counts = {
            orders: await orderModel.countDocuments(),
            paymentSessions: await PaymentSession.countDocuments(),
            checkoutSessions: await CheckoutSession.countDocuments(),
            payments: await Payment.countDocuments(),
            paymentEvents: await PaymentEvent.countDocuments(),
            reservations: await Reservation.countDocuments()
        };
        
        return counts;
    } catch (error) {
        log(`❌ Error getting counts: ${error.message}`, 'red');
        return null;
    }
}

async function clearAllOrders() {
    try {
        log('🧹 Starting order cleanup process...', 'yellow');
        
        // Get initial counts
        log('📊 Getting current database counts...', 'blue');
        const initialCounts = await getOrderCounts();
        
        if (!initialCounts) {
            throw new Error('Failed to get initial counts');
        }
        
        log('📈 Current database state:', 'cyan');
        log(`   • Orders: ${initialCounts.orders}`, 'cyan');
        log(`   • Payment Sessions: ${initialCounts.paymentSessions}`, 'cyan');
        log(`   • Checkout Sessions: ${initialCounts.checkoutSessions}`, 'cyan');
        log(`   • Payments: ${initialCounts.payments}`, 'cyan');
        log(`   • Payment Events: ${initialCounts.paymentEvents}`, 'cyan');
        log(`   • Reservations: ${initialCounts.reservations}`, 'cyan');
        
        if (initialCounts.orders === 0) {
            log('✅ No orders found. Database is already clean!', 'green');
            return;
        }
        
        // Confirmation prompt
        log('\n⚠️  WARNING: This will permanently delete ALL order data!', 'red');
        log('This includes:', 'yellow');
        log('   • All customer orders', 'yellow');
        log('   • All payment sessions', 'yellow');
        log('   • All checkout sessions', 'yellow');
        log('   • All payment events', 'yellow');
        log('   • All stock reservations', 'yellow');
        
        // In a real scenario, you might want to add a confirmation prompt here
        // For now, we'll proceed with the cleanup
        
        log('\n🗑️  Proceeding with cleanup...', 'yellow');
        
        // Clear orders first (main data)
        log('   Clearing orders...', 'blue');
        const orderResult = await orderModel.deleteMany({});
        log(`   ✅ Deleted ${orderResult.deletedCount} orders`, 'green');
        
        // Clear payment sessions
        log('   Clearing payment sessions...', 'blue');
        const paymentSessionResult = await PaymentSession.deleteMany({});
        log(`   ✅ Deleted ${paymentSessionResult.deletedCount} payment sessions`, 'green');
        
        // Clear checkout sessions
        log('   Clearing checkout sessions...', 'blue');
        const checkoutSessionResult = await CheckoutSession.deleteMany({});
        log(`   ✅ Deleted ${checkoutSessionResult.deletedCount} checkout sessions`, 'green');
        
        // Clear payments
        log('   Clearing payments...', 'blue');
        const paymentResult = await Payment.deleteMany({});
        log(`   ✅ Deleted ${paymentResult.deletedCount} payments`, 'green');
        
        // Clear payment events
        log('   Clearing payment events...', 'blue');
        const paymentEventResult = await PaymentEvent.deleteMany({});
        log(`   ✅ Deleted ${paymentEventResult.deletedCount} payment events`, 'green');
        
        // Clear reservations
        log('   Clearing reservations...', 'blue');
        const reservationResult = await Reservation.deleteMany({});
        log(`   ✅ Deleted ${reservationResult.deletedCount} reservations`, 'green');
        
        // Get final counts
        log('\n📊 Final database state:', 'cyan');
        const finalCounts = await getOrderCounts();
        
        if (finalCounts) {
            log(`   • Orders: ${finalCounts.orders}`, 'cyan');
            log(`   • Payment Sessions: ${finalCounts.paymentSessions}`, 'cyan');
            log(`   • Checkout Sessions: ${finalCounts.checkoutSessions}`, 'cyan');
            log(`   • Payments: ${finalCounts.payments}`, 'cyan');
            log(`   • Payment Events: ${finalCounts.paymentEvents}`, 'cyan');
            log(`   • Reservations: ${finalCounts.reservations}`, 'cyan');
        }
        
        log('\n🎉 Order cleanup completed successfully!', 'green');
        log('✅ Database is now clean and ready for launch!', 'green');
        
    } catch (error) {
        log(`❌ Error during cleanup: ${error.message}`, 'red');
        log(`Stack trace: ${error.stack}`, 'red');
        throw error;
    }
}

async function main() {
    try {
        log('🚀 Shithaa Order Cleanup Script', 'bright');
        log('================================', 'bright');
        
        // Connect to database
        const connected = await connectToDatabase();
        if (!connected) {
            process.exit(1);
        }
        
        // Clear all orders
        await clearAllOrders();
        
        log('\n✨ All done! Your database is ready for launch!', 'green');
        
    } catch (error) {
        log(`\n💥 Script failed: ${error.message}`, 'red');
        process.exit(1);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        log('\n🔌 Database connection closed.', 'blue');
    }
}

// Run the script
main();
