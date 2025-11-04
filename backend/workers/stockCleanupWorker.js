#!/usr/bin/env node

/**
 * Stock Cleanup Worker - FIXED VERSION
 * This worker runs every 5 minutes and cleans up abandoned orders
 */

import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import connectDB from '../config/mongodb.js'; // Import the shared connection

const MONGO_URI = process.env.MONGODB_URI;

async function runWorker() {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`[${workerId}] Starting stock cleanup worker`);

    if (!MONGO_URI) {
        console.error("MONGODB_URI not set, skipping stock cleanup worker.");
        return;
    }

    try {
        await connectDB(); // Use the shared connection

        // Find DRAFT orders older than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const oldDraftOrders = await Order.find({
            status: 'DRAFT',
            createdAt: { $lt: oneHourAgo }
        });

        console.log(`[${workerId}] Found ${oldDraftOrders.length} old DRAFT orders to clean up.`);

        for (const order of oldDraftOrders) {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                // Restore stock for each item in the order
                for (const item of order.items) {
                    await Product.updateOne(
                        { 'variants.sku': item.sku },
                        { $inc: { 'variants.$.stock': item.quantity } }
                    ).session(session);
                }

                // Change order status to CANCELLED
                order.status = 'CANCELLED';
                order.notes = (order.notes || '') + '\nOrder automatically cancelled and stock restored due to being in DRAFT state for too long.';
                await order.save({ session });

                await session.commitTransaction();
                console.log(`[${workerId}] Order ${order._id} cancelled and stock restored.`);
            } catch (error) {
                await session.abortTransaction();
                console.error(`[${workerId}] Error processing order ${order._id}:`, error);
            } finally {
                session.endSession();
            }
        }
    } catch (error) {
        console.error(`[${workerId}] Error in stock cleanup worker:`, error);
    } finally {
        // We no longer close the connection, as it's shared.
        console.log(`[${workerId}] Stock cleanup worker cycle finished.`);
    }
}

function start() {
    console.log('🔄 [Stock Cleanup Worker] Started - will run every hour');
    // Run every hour
    setInterval(runWorker, 60 * 60 * 1000);

    // Initial run
    runWorker();
}

start();

export { runWorker, start };
