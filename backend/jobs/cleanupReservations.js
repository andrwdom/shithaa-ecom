import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { cleanupExpiredReservations } from '../utils/stock.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

dotenv.config({ path: './.env' });

const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes

const runCleanup = async () => {
    const correlationId = `CLEANUP-${Date.now()}`;
    EnhancedLogger.webhookLog('INFO', 'Starting expired reservations cleanup job', { correlationId });

    try {
        await cleanupExpiredReservations();
        EnhancedLogger.webhookLog('SUCCESS', 'Expired reservations cleanup job completed successfully', { correlationId });
    } catch (error) {
        EnhancedLogger.criticalAlert('RESERVATION_CLEANUP: Job failed', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
    }
};

const startJob = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shitha_maternity_db');
        EnhancedLogger.webhookLog('INFO', 'MongoDB connected for cleanup job.');
        
        console.log(`🚀 Starting Expired Reservations Cleanup Job. Running every ${CLEANUP_INTERVAL / 60000} minutes.`);
        
        // Run immediately on start
        runCleanup();

        // Then run on an interval
        setInterval(runCleanup, CLEANUP_INTERVAL);

    } catch (error) {
        console.error('❌ Failed to connect to MongoDB for cleanup job:', error);
        process.exit(1);
    }
};

startJob();
