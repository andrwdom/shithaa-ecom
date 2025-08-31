import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
import productModel from '../models/productModel.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Worker to release expired reservations and restore stock
 * This should run every minute via cron or setInterval
 */
export async function releaseExpiredReservations() {
    const session = await mongoose.startSession();
    
    try {
        console.log('🕐 Starting expired reservation cleanup...');
        
        // Find all expired reservations
        const expiredReservations = await Reservation.findExpired();
        
        if (expiredReservations.length === 0) {
            console.log('✅ No expired reservations found');
            return { processed: 0, success: 0, errors: 0 };
        }
        
        console.log(`📋 Found ${expiredReservations.length} expired reservations to process`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const reservation of expiredReservations) {
            try {
                session.startTransaction();
                
                // Release stock back to products
                for (const item of reservation.items) {
                    const result = await productModel.updateOne(
                        {
                            _id: item.productId,
                            'sizes.size': item.size
                        },
                        {
                            $inc: { 'sizes.$.stock': item.qty }
                        },
                        { session }
                    );
                    
                    if (result.modifiedCount === 0) {
                        console.warn(`⚠️ Failed to restore stock for product ${item.productId} size ${item.size}`);
                    }
                }
                
                // Update reservation status
                reservation.status = 'expired';
                reservation.metadata = { 
                    ...reservation.metadata, 
                    releasedBy: 'worker',
                    releasedAt: new Date(),
                    reason: 'expired'
                };
                await reservation.save({ session });
                
                await session.commitTransaction();
                successCount++;
                
                console.log(`✅ Released reservation ${reservation._id} (${reservation.items.length} items)`);
                
            } catch (error) {
                await session.abortTransaction();
                errorCount++;
                console.error(`❌ Failed to release reservation ${reservation._id}:`, error.message);
                
                // Continue processing other reservations even if one fails
                continue;
            }
        }
        
        console.log(`🏁 Reservation cleanup completed: ${successCount} successful, ${errorCount} errors`);
        
        return {
            processed: expiredReservations.length,
            success: successCount,
            errors: errorCount
        };
        
    } catch (error) {
        console.error('❌ Fatal error in reservation cleanup worker:', error);
        return { processed: 0, success: 0, errors: 1 };
    } finally {
        session.endSession();
    }
}

/**
 * Start the worker with interval
 * @param {number} intervalMinutes - Interval in minutes (default: 1)
 */
export function startReservationWorker(intervalMinutes = 1) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`🚀 Starting reservation worker with ${intervalMinutes} minute interval`);
    
    // Run immediately on start
    releaseExpiredReservations();
    
    // Set up recurring execution
    const intervalId = setInterval(async () => {
        try {
            await releaseExpiredReservations();
        } catch (error) {
            console.error('❌ Worker interval error:', error);
        }
    }, intervalMs);
    
    // Return interval ID for cleanup
    return intervalId;
}

/**
 * Stop the worker
 * @param {number} intervalId - The interval ID returned by startReservationWorker
 */
export function stopReservationWorker(intervalId) {
    if (intervalId) {
        clearInterval(intervalId);
        console.log('🛑 Reservation worker stopped');
    }
}

// If running directly (not imported), start the worker
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🔄 Running reservation worker in standalone mode');
    
    // Connect to MongoDB
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('✅ Connected to MongoDB');
            startReservationWorker();
        })
        .catch((error) => {
            console.error('❌ Failed to connect to MongoDB:', error);
            process.exit(1);
        });
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down reservation worker...');
        await mongoose.connection.close();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        console.log('\n🛑 Shutting down reservation worker...');
        await mongoose.connection.close();
        process.exit(0);
    });
}
