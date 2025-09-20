#!/usr/bin/env node

/**
 * Stock Cleanup Cron Job
 * This script should be run every 15-30 minutes to clean up expired reservations
 * and maintain stock system health
 */

import mongoose from 'mongoose';
import { config } from '../config.js';
import { 
    cleanupExpiredReservations, 
    getStockHealthReport,
    cleanupStockReservations 
} from './stock.js';

// Configuration
const CLEANUP_CONFIG = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shitha-maternity',
    RUN_MODE: process.env.RUN_MODE || 'cleanup', // 'cleanup', 'health', 'reset'
    DRY_RUN: process.env.DRY_RUN === 'true' || false
};

/**
 * Main cleanup function
 */
async function runStockCleanup() {
    console.log('🧹 Starting Stock Cleanup Job');
    console.log('==============================');
    console.log(`Mode: ${CLEANUP_CONFIG.RUN_MODE}`);
    console.log(`Dry Run: ${CLEANUP_CONFIG.DRY_RUN}`);
    console.log(`Time: ${new Date().toISOString()}`);
    
    try {
        // Connect to MongoDB
        await mongoose.connect(CLEANUP_CONFIG.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        let result;
        
        switch (CLEANUP_CONFIG.RUN_MODE) {
            case 'cleanup':
                result = await cleanupExpiredReservations();
                break;
                
            case 'health':
                result = await getStockHealthReport();
                break;
                
            case 'reset':
                if (CLEANUP_CONFIG.DRY_RUN) {
                    console.log('⚠️  DRY RUN: Would reset all stock reservations');
                    result = { success: true, message: 'Dry run - no changes made' };
                } else {
                    result = await cleanupStockReservations();
                }
                break;
                
            default:
                throw new Error(`Unknown run mode: ${CLEANUP_CONFIG.RUN_MODE}`);
        }
        
        console.log('\n📊 Cleanup Results:');
        console.log('==================');
        console.log(JSON.stringify(result, null, 2));
        
        // If health report, show recommendations
        if (CLEANUP_CONFIG.RUN_MODE === 'health' && result.recommendations) {
            console.log('\n💡 Recommendations:');
            console.log('==================');
            result.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. [${rec.priority}] ${rec.action}`);
                console.log(`   ${rec.description}`);
            });
        }
        
        console.log('\n✅ Stock cleanup job completed successfully');
        
    } catch (error) {
        console.error('❌ Stock cleanup job failed:', error);
        process.exit(1);
    } finally {
        // Disconnect from MongoDB
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            console.log('✅ Disconnected from MongoDB');
        }
    }
}

/**
 * Setup cron job for automatic cleanup
 */
function setupCronJob() {
    console.log('⏰ Setting up automatic stock cleanup cron job...');
    console.log('This should be added to your system crontab:');
    console.log('');
    console.log('# Stock cleanup every 15 minutes');
    console.log('*/15 * * * * cd /path/to/your/backend && node utils/stockCleanup.js');
    console.log('');
    console.log('# Stock health check every hour');
    console.log('0 * * * * cd /path/to/your/backend && RUN_MODE=health node utils/stockCleanup.js');
    console.log('');
    console.log('# Emergency stock reset (use with caution)');
    console.log('# 0 2 * * 0 cd /path/to/your/backend && RUN_MODE=reset node utils/stockCleanup.js');
}

/**
 * Show usage information
 */
function showUsage() {
    console.log('Stock Cleanup Utility');
    console.log('====================');
    console.log('');
    console.log('Usage:');
    console.log('  node utils/stockCleanup.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  RUN_MODE=cleanup    Clean up expired reservations (default)');
    console.log('  RUN_MODE=health     Generate stock health report');
    console.log('  RUN_MODE=reset      Reset all stock reservations (dangerous)');
    console.log('  DRY_RUN=true        Show what would be done without making changes');
    console.log('');
    console.log('Examples:');
    console.log('  node utils/stockCleanup.js');
    console.log('  RUN_MODE=health node utils/stockCleanup.js');
    console.log('  DRY_RUN=true RUN_MODE=reset node utils/stockCleanup.js');
    console.log('');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        showUsage();
        process.exit(0);
    }
    
    if (args.includes('--cron')) {
        setupCronJob();
        process.exit(0);
    }
    
    runStockCleanup().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { runStockCleanup, setupCronJob };
