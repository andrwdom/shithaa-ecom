#!/usr/bin/env node

/**
 * Backup and Clear Orders Script for Shithaa E-commerce
 * This script creates a backup of all order data before clearing it
 * Run this before site launch to start with a clean database
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
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

async function createBackup() {
    try {
        log('💾 Creating backup of order data...', 'yellow');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, `../backups/orders-backup-${timestamp}`);
        
        // Create backup directory
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Backup orders
        log('   Backing up orders...', 'blue');
        const orders = await orderModel.find({}).lean();
        fs.writeFileSync(
            path.join(backupDir, 'orders.json'),
            JSON.stringify(orders, null, 2)
        );
        log(`   ✅ Backed up ${orders.length} orders`, 'green');
        
        // Backup payment sessions
        log('   Backing up payment sessions...', 'blue');
        const paymentSessions = await PaymentSession.find({}).lean();
        fs.writeFileSync(
            path.join(backupDir, 'payment-sessions.json'),
            JSON.stringify(paymentSessions, null, 2)
        );
        log(`   ✅ Backed up ${paymentSessions.length} payment sessions`, 'green');
        
        // Backup checkout sessions
        log('   Backing up checkout sessions...', 'blue');
        const checkoutSessions = await CheckoutSession.find({}).lean();
        fs.writeFileSync(
            path.join(backupDir, 'checkout-sessions.json'),
            JSON.stringify(checkoutSessions, null, 2)
        );
        log(`   ✅ Backed up ${checkoutSessions.length} checkout sessions`, 'green');
        
        // Backup payments
        log('   Backing up payments...', 'blue');
        const payments = await Payment.find({}).lean();
        fs.writeFileSync(
            path.join(backupDir, 'payments.json'),
            JSON.stringify(payments, null, 2)
        );
        log(`   ✅ Backed up ${payments.length} payments`, 'green');
        
        // Backup payment events
        log('   Backing up payment events...', 'blue');
        const paymentEvents = await PaymentEvent.find({}).lean();
        fs.writeFileSync(
            path.join(backupDir, 'payment-events.json'),
            JSON.stringify(paymentEvents, null, 2)
        );
        log(`   ✅ Backed up ${paymentEvents.length} payment events`, 'green');
        
        // Backup reservations
        log('   Backing up reservations...', 'blue');
        const reservations = await Reservation.find({}).lean();
        fs.writeFileSync(
            path.join(backupDir, 'reservations.json'),
            JSON.stringify(reservations, null, 2)
        );
        log(`   ✅ Backed up ${reservations.length} reservations`, 'green');
        
        // Create backup info file
        const backupInfo = {
            timestamp: new Date().toISOString(),
            totalOrders: orders.length,
            totalPaymentSessions: paymentSessions.length,
            totalCheckoutSessions: checkoutSessions.length,
            totalPayments: payments.length,
            totalPaymentEvents: paymentEvents.length,
            totalReservations: reservations.length,
            purpose: 'Pre-launch cleanup'
        };
        
        fs.writeFileSync(
            path.join(backupDir, 'backup-info.json'),
            JSON.stringify(backupInfo, null, 2)
        );
        
        log(`\n✅ Backup created successfully at: ${backupDir}`, 'green');
        return backupDir;
        
    } catch (error) {
        log(`❌ Error creating backup: ${error.message}`, 'red');
        throw error;
    }
}

async function clearAllOrders() {
    try {
        log('🧹 Clearing all order data...', 'yellow');
        
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
        
        log('✅ All order data cleared successfully!', 'green');
        
    } catch (error) {
        log(`❌ Error during cleanup: ${error.message}`, 'red');
        throw error;
    }
}

async function main() {
    try {
        log('🚀 Shithaa Backup and Clear Orders Script', 'bright');
        log('==========================================', 'bright');
        
        // Connect to database
        const connected = await connectToDatabase();
        if (!connected) {
            process.exit(1);
        }
        
        // Check if there are any orders to backup
        const orderCount = await orderModel.countDocuments();
        if (orderCount === 0) {
            log('✅ No orders found. Database is already clean!', 'green');
            return;
        }
        
        // Create backup
        const backupDir = await createBackup();
        
        // Clear all orders
        await clearAllOrders();
        
        log('\n🎉 Process completed successfully!', 'green');
        log('✅ Database is now clean and ready for launch!', 'green');
        log(`📁 Backup saved at: ${backupDir}`, 'cyan');
        
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
