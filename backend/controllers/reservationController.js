import mongoose from 'mongoose';
import Reservation from '../models/Reservation.js';
import productModel from '../models/productModel.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Create a new reservation for checkout items
 * POST /api/checkout/reserve
 */
export const createReservation = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        // Check if reservation system is enabled
        if (process.env.RESERVATION_ENABLED !== 'true') {
            return errorResponse(res, 400, 'Reservation system is disabled');
        }

        const { userId, items, idempotencyKey, holdMinutes = 15 } = req.body;

        // Validate request
        if (!userId || !items || !Array.isArray(items) || items.length === 0 || !idempotencyKey) {
            return errorResponse(res, 400, 'userId, items array, and idempotencyKey are required');
        }

        // Check idempotency - if reservation exists, return it
        const existingReservation = await Reservation.findByIdempotencyKey(idempotencyKey);
        if (existingReservation) {
            return successResponse(res, {
                reservationId: existingReservation._id,
                expiresAt: existingReservation.expiresAt,
                status: existingReservation.status
            }, 'Reservation already exists');
        }

        // Validate items
        if (!items.every(item => item.productId && item.qty && item.qty > 0 && item.size)) {
            return errorResponse(res, 400, 'Each item must have productId, qty > 0, and size');
        }

        // Calculate total amount and prepare reservation data
        let totalAmount = 0;
        const reservationItems = [];

        for (const item of items) {
            const product = await productModel.findById(item.productId);
            if (!product) {
                return errorResponse(res, 400, `Product not found: ${item.productId}`);
            }

            const sizeObj = product.sizes.find(s => s.size === item.size);
            if (!sizeObj) {
                return errorResponse(res, 400, `Size ${item.size} not available for ${product.name}`);
            }

            if (sizeObj.stock < item.qty) {
                return errorResponse(res, 409, `Insufficient stock for ${product.name} size ${item.size}. Available: ${sizeObj.stock}, Requested: ${item.qty}`);
            }

            const itemPrice = product.price * item.qty;
            totalAmount += itemPrice;

            reservationItems.push({
                productId: product._id,
                qty: item.qty,
                priceAtReserve: product.price,
                size: item.size
            });
        }

        // Start transaction
        session.startTransaction();

        try {
            // Reserve stock for all items in transaction
            for (const item of reservationItems) {
                const result = await productModel.updateOne(
                    {
                        _id: item.productId,
                        'sizes.size': item.size,
                        'sizes.stock': { $gte: item.qty }
                    },
                    {
                        $inc: { 'sizes.$.stock': -item.qty }
                    },
                    { session }
                );

                if (result.modifiedCount === 0) {
                    throw new Error(`Failed to reserve stock for product ${item.productId} size ${item.size}`);
                }
            }

            // Create reservation
            const reservation = new Reservation({
                userId,
                items: reservationItems,
                idempotencyKey,
                holdMinutes,
                totalAmount,
                expiresAt: new Date(Date.now() + (holdMinutes * 60 * 1000))
            });

            await reservation.save({ session });

            // Commit transaction
            await session.commitTransaction();

            return successResponse(res, {
                reservationId: reservation._id,
                expiresAt: reservation.expiresAt,
                totalAmount: reservation.totalAmount
            }, 'Reservation created successfully');

        } catch (transactionError) {
            // Rollback transaction on error
            await session.abortTransaction();
            throw transactionError;
        }

    } catch (error) {
        console.error('Reservation creation error:', error);
        
        // If transaction failed, try fallback approach
        if (error.message.includes('Failed to reserve stock')) {
            return await handleReservationFallback(req, res, items, userId, idempotencyKey, holdMinutes);
        }

        return errorResponse(res, 500, `Reservation creation failed: ${error.message}`);
    } finally {
        session.endSession();
    }
};

/**
 * Fallback reservation method when transactions are not available
 * Uses conditional updates and manual rollback
 */
async function handleReservationFallback(req, res, items, userId, idempotencyKey, holdMinutes) {
    console.log('⚠️ Using fallback reservation method (transactions not available)');
    
    try {
        // Check idempotency again
        const existingReservation = await Reservation.findByIdempotencyKey(idempotencyKey);
        if (existingReservation) {
            return successResponse(res, {
                reservationId: existingReservation._id,
                expiresAt: existingReservation.expiresAt,
                status: existingReservation.status
            }, 'Reservation already exists');
        }

        let totalAmount = 0;
        const reservationItems = [];
        const successfulUpdates = [];

        // Calculate total and validate stock
        for (const item of items) {
            const product = await productModel.findById(item.productId);
            if (!product) {
                return errorResponse(res, 400, `Product not found: ${item.productId}`);
            }

            const sizeObj = product.sizes.find(s => s.size === item.size);
            if (!sizeObj) {
                return errorResponse(res, 400, `Size ${item.size} not available for ${product.name}`);
            }

            if (sizeObj.stock < item.qty) {
                return errorResponse(res, 409, `Insufficient stock for ${product.name} size ${item.size}. Available: ${sizeObj.stock}, Requested: ${item.qty}`);
            }

            const itemPrice = product.price * item.qty;
            totalAmount += itemPrice;

            reservationItems.push({
                productId: product._id,
                qty: item.qty,
                priceAtReserve: product.price,
                size: item.size
            });
        }

        // Attempt to reserve stock for each item
        for (const item of reservationItems) {
            const result = await productModel.updateOne(
                {
                    _id: item.productId,
                    'sizes.size': item.size,
                    'sizes.stock': { $gte: item.qty }
                },
                {
                    $inc: { 'sizes.$.stock': -item.qty }
                }
            );

            if (result.modifiedCount === 0) {
                // Rollback successful updates
                await rollbackStockUpdates(successfulUpdates);
                return errorResponse(res, 409, `Insufficient stock for product ${item.productId} size ${item.size}`);
            }

            successfulUpdates.push(item);
        }

        // Create reservation
        const reservation = new Reservation({
            userId,
            items: reservationItems,
            idempotencyKey,
            holdMinutes,
            totalAmount,
            expiresAt: new Date(Date.now() + (holdMinutes * 60 * 1000))
        });

        await reservation.save();

        return successResponse(res, {
            reservationId: reservation._id,
            expiresAt: reservation.expiresAt,
            totalAmount: reservation.totalAmount
        }, 'Reservation created successfully (fallback method)');

    } catch (error) {
        console.error('Fallback reservation error:', error);
        return errorResponse(res, 500, `Fallback reservation failed: ${error.message}`);
    }
}

/**
 * Rollback stock updates in case of partial failure
 */
async function rollbackStockUpdates(successfulUpdates) {
    console.log('🔄 Rolling back stock updates for:', successfulUpdates.length, 'items');
    
    for (const item of successfulUpdates) {
        try {
            await productModel.updateOne(
                {
                    _id: item.productId,
                    'sizes.size': item.size
                },
                {
                    $inc: { 'sizes.$.stock': item.qty }
                }
            );
        } catch (rollbackError) {
            console.error('Failed to rollback stock for item:', item, rollbackError);
        }
    }
}

/**
 * Get reservation by ID
 * GET /api/checkout/reservation/:id
 */
export const getReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const reservation = await Reservation.findById(id).populate('items.productId');
        
        if (!reservation) {
            return errorResponse(res, 404, 'Reservation not found');
        }

        return successResponse(res, reservation, 'Reservation retrieved successfully');
    } catch (error) {
        console.error('Get reservation error:', error);
        return errorResponse(res, 500, `Failed to get reservation: ${error.message}`);
    }
};

/**
 * Cancel a reservation and release stock
 * POST /api/checkout/reservation/:id/cancel
 */
export const cancelReservation = async (req, res) => {
    const session = await mongoose.startSession();
    
    try {
        const { id } = req.params;
        const reservation = await Reservation.findById(id);
        
        if (!reservation) {
            return errorResponse(res, 404, 'Reservation not found');
        }

        if (reservation.status !== 'reserved') {
            return errorResponse(res, 400, 'Only reserved reservations can be cancelled');
        }

        session.startTransaction();

        try {
            // Release stock back to products
            for (const item of reservation.items) {
                await productModel.updateOne(
                    {
                        _id: item.productId,
                        'sizes.size': item.size
                    },
                    {
                        $inc: { 'sizes.$.stock': item.qty }
                    },
                    { session }
                );
            }

            // Update reservation status
            reservation.status = 'cancelled';
            await reservation.save({ session });

            await session.commitTransaction();

            return successResponse(res, { reservationId: reservation._id }, 'Reservation cancelled successfully');
        } catch (transactionError) {
            await session.abortTransaction();
            throw transactionError;
        }

    } catch (error) {
        console.error('Cancel reservation error:', error);
        return errorResponse(res, 500, `Failed to cancel reservation: ${error.message}`);
    } finally {
        session.endSession();
    }
};

/**
 * Release a reservation (used by webhook and worker)
 * This function can be called externally to release stock
 */
export const releaseReservation = async (reservationId, reason = 'manual') => {
    try {
        const reservation = await Reservation.findById(reservationId);
        if (!reservation || reservation.status !== 'reserved') {
            return { success: false, message: 'Reservation not found or not in reserved status' };
        }

        // Release stock back to products
        for (const item of reservation.items) {
            await productModel.updateOne(
                {
                    _id: item.productId,
                    'sizes.size': item.size
                },
                {
                    $inc: { 'sizes.$.stock': item.qty }
                }
            );
        }

        // Update reservation status
        reservation.status = 'expired';
        reservation.metadata = { ...reservation.metadata, releaseReason: reason, releasedAt: new Date() };
        await reservation.save();

        return { success: true, message: 'Reservation released successfully' };
    } catch (error) {
        console.error('Release reservation error:', error);
        return { success: false, message: `Failed to release reservation: ${error.message}` };
    }
};
