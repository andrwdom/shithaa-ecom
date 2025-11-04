import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import cron from 'node-cron';
import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
import productModel from '../models/productModel.js';
import connectDB from '../config/mongodb.js'; // Import the shared connection


const RESERVATION_EXPIRY_MINUTES = parseInt(process.env.RESERVATION_EXPIRY_MINUTES || '15', 10);
const MONGO_URI = process.env.MONGODB_URI;

async function runWorker() {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[${workerId}] Starting reservation expiry worker`);

    if (!MONGO_URI) {
        console.error("MONGODB_URI not set, skipping reservation expiry worker.");
        return;
    }

    try {
        await connectDB(); // Use the shared connection

        const now = new Date();
        const expiryTime = new Date(now.getTime() - RESERVATION_EXPIRY_MINUTES * 60 * 1000);
        const veryOldExpiryTime = new Date(now.getTime() - (RESERVATION_EXPIRY_MINUTES + 5) * 60 * 1000); // 5 minutes older

        const expiredReservations = await Reservation.find({
            createdAt: { $lte: expiryTime },
            status: 'reserved'
        });

        // DEBUG: Find very old reservations that might be stuck
        const veryOldReservations = await Reservation.find({
            createdAt: { $lte: veryOldExpiryTime },
            status: 'reserved'
        });
        
        console.log(`[${workerId}] Found ${expiredReservations.length} expired reservations`);
        if (veryOldReservations.length > 0) {
            console.log(`[${workerId}] Found ${veryOldReservations.length} very old reservations (>5min)`);
        }

        const reservationsToProcess = [...expiredReservations];

        console.log(`[${workerId}] Total reservations to process: ${reservationsToProcess.length}`);

        if (reservationsToProcess.length > 0) {
            for (const reservation of reservationsToProcess) {
                const session = await mongoose.startSession();
                session.startTransaction();
                try {
                    // 1. Find reservation again to ensure it's still valid
                    const freshReservation = await Reservation.findById(reservation._id).session(session);
                    if (!freshReservation || freshReservation.status !== 'reserved') {
                        console.log(`[${workerId}] Reservation ${reservation._id} already processed, skipping.`);
                        await session.abortTransaction();
                        continue;
                    }

                    // 2. Release stock
                    await productModel.updateOne(
                        { 'variants.sku': reservation.sku },
                        { $inc: { 'variants.$.stock': reservation.quantity } }
                    ).session(session);

                    // 3. Update reservation status
                    freshReservation.status = 'expired';
                    await freshReservation.save({ session });

                    await session.commitTransaction();
                    console.log(`[${workerId}] Reservation ${reservation._id} expired and stock released for SKU ${reservation.sku}`);
        } catch (error) {
                    await session.abortTransaction();
                    console.error(`[${workerId}] Error processing reservation ${reservation._id}:`, error);
                } finally {
                    session.endSession();
                }
            }
        } else {
            console.log(`[${workerId}] No expired reservations to process`);
        }
  } catch (error) {
        console.error(`[${workerId}] Error in reservation expiry worker:`, error);
    } finally {
        // We no longer close the connection, as it's shared.
        console.log(`[${workerId}] Worker cycle finished.`);
    }
}

function start() {
    console.log('🔄 [Reservation Worker] Started - will run every 2 minutes');
    // Run every 2 minutes
    cron.schedule('*/2 * * * *', runWorker);

    // Initial run
    runWorker();
}

// Ensure the worker is started when the script is executed
if (process.env.RESERVATION_AUTO_EXPIRY === 'true') {
    start();
}

export { runWorker, start };
