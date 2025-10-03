import mongoose from 'mongoose';
import productModel from '../models/productModel.js';
import { StockError, ValidationError } from './errorHandler.js';

/**
 * ATOMIC: Reserve stock for a single product/size (simplified version)
 * Uses atomic updateOne with $expr to prevent race conditions
 * 
 * @param {string} productId - Product ID
 * @param {string} size - Size to reserve
 * @param {number} quantity - Quantity to reserve
 * @param {Object} session - MongoDB session
 * @returns {Promise<Object>} - Result of the reservation
 */
export async function reserveSingleStockAtomic(productId, size, quantity, session) {
  try {
    // Atomic update: Check stock and reserve in one operation
    const result = await productModel.updateOne(
      {
        _id: productId,
        'sizes.size': size,
        $expr: { 
          $gte: [
            { $subtract: ['$sizes.stock', '$sizes.reserved'] }, 
            quantity
          ] 
        }
      },
      { $inc: { 'sizes.$.reserved': quantity } },
      { session }
    );

    if (result.modifiedCount === 0) {
      // Get current stock info for error message
      const product = await productModel.findById(productId).session(session);
      const sizeObj = product?.sizes?.find(s => s.size === size);
      const availableStock = sizeObj ? Math.max(0, sizeObj.stock - (sizeObj.reserved || 0)) : 0;
      
      throw new StockError(`Insufficient stock for product ${productId}, size ${size}, requested ${quantity}. Available: ${availableStock}`);
    }

    return {
      success: true,
      productId,
      size,
      quantity,
      modifiedCount: result.modifiedCount
    };
  } catch (error) {
    throw new StockError(`Failed to reserve stock: ${error.message}`);
  }
}

/**
 * BATCH ATOMIC: Reserve stock for multiple items in a single transaction
 * Either ALL items are reserved successfully, or NONE are reserved
 * Uses MongoDB transactions to ensure atomicity across multiple documents
 */
export async function reserveBatchStockAtomic(cartItems, options = {}) {
  const { session, correlationId } = options;
  
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    throw new ValidationError('Cart items are required for batch reservation', { correlationId });
  }

  // Validate all items first
  for (const item of cartItems) {
    if (!item.productId || !item.size || !item.quantity || item.quantity <= 0) {
      throw new ValidationError(`Invalid cart item: ${JSON.stringify(item)}`, { correlationId });
    }
  }

  console.log(`STOCK:BATCH:RESERVE:START: items=${cartItems.length}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

  // Start transaction if no session provided
  const shouldEndSession = !session;
  const mongoSession = session || await mongoose.startSession();
  
  try {
    if (shouldEndSession) {
      await mongoSession.startTransaction();
    }

    const results = [];
    const successfulReservations = [];

    // Reserve each item atomically within the transaction
    for (const item of cartItems) {
      const { productId, size, quantity } = item;
      
      try {
        // 🚨 CRITICAL FIX: Atomic operation - check availability AND reserve in one operation
        // Uses $expr with $arrayElemAt to find the specific size and check available stock
        const result = await productModel.updateOne(
          {
            _id: productId,
            'sizes.size': size,
            $expr: {
              $gte: [
                {
                  $subtract: [
                    {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: { $range: [0, { $size: '$sizes' }] },
                            as: 'i',
                            in: {
                              $cond: [
                                { $eq: [{ $arrayElemAt: ['$sizes.size', '$$i'] }, size] },
                                { $arrayElemAt: ['$sizes.stock', '$$i'] },
                                null
                              ]
                            }
                          }
                        },
                        0
                      ]
                    },
                    {
                      $add: [
                        {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: { $range: [0, { $size: '$sizes' }] },
                                as: 'i',
                                in: {
                                  $cond: [
                                    { $eq: [{ $arrayElemAt: ['$sizes.size', '$$i'] }, size] },
                                    { $ifNull: [{ $arrayElemAt: ['$sizes.reserved', '$$i'] }, 0] },
                                    0
                                  ]
                                }
                              }
                            },
                            0
                          ]
                        },
                        quantity
                      ]
                    }
                  ]
                },
                quantity
              ]
            }
          },
          { $inc: { 'sizes.$[elem].reserved': quantity } },
          { 
            session: mongoSession,
            arrayFilters: [{ 'elem.size': size }]
          }
        );

        if (result.modifiedCount === 0) {
          // Get current stock info for error message
          const product = await productModel.findById(productId).session(mongoSession);
          const sizeObj = product?.sizes?.find(s => s.size === size);
          const availableStock = sizeObj ? Math.max(0, sizeObj.stock - (sizeObj.reserved || 0)) : 0;
          
          console.log(`STOCK:BATCH:RESERVE:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, available=${availableStock}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
          
          throw new StockError(`Insufficient stock for ${item.name || 'product'} (${size}). Available: ${availableStock}, Requested: ${quantity}`, {
            productId, size, quantity, availableStock, correlationId
          });
        }

        results.push({
          productId,
          size,
          quantity,
          success: true
        });
        
        successfulReservations.push(item);
        
        console.log(`STOCK:BATCH:RESERVE:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

      } catch (error) {
        console.error(`STOCK:BATCH:RESERVE:ERROR: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
        
        // If any item fails, the entire transaction will be aborted
        throw error;
      }
    }

    // Commit transaction if we started it
    if (shouldEndSession) {
      await mongoSession.commitTransaction();
    }

    console.log(`STOCK:BATCH:RESERVE:COMPLETE: totalItems=${cartItems.length}, successfulItems=${successfulReservations.length}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

    return {
      success: true,
      reservedItems: successfulReservations,
      results
    };

  } catch (error) {
    // Abort transaction if we started it
    if (shouldEndSession) {
      await mongoSession.abortTransaction();
    }
    
    console.error(`STOCK:BATCH:RESERVE:ABORTED: error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
    
  } finally {
    if (shouldEndSession) {
      await mongoSession.endSession();
    }
  }
}

/**
 * BATCH ATOMIC: Confirm and deduct stock for multiple items in a single transaction
 * Either ALL items are confirmed and deducted, or NONE are
 */
export async function confirmBatchStockAtomic(cartItems, options = {}) {
  const { session, correlationId } = options;
  
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    throw new ValidationError('Cart items are required for batch confirmation', { correlationId });
  }

  console.log(`STOCK:BATCH:CONFIRM:START: items=${cartItems.length}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

  // Start transaction if no session provided
  const shouldEndSession = !session;
  const mongoSession = session || await mongoose.startSession();
  
  try {
    if (shouldEndSession) {
      await mongoSession.startTransaction();
    }

    const results = [];
    const successfulConfirmations = [];

    // Confirm each item atomically within the transaction
    for (const item of cartItems) {
      const { productId, size, quantity } = item;
      
      try {
        const result = await productModel.updateOne(
          {
            _id: productId,
            'sizes.size': size,
            'sizes.stock': { $gte: quantity },
            'sizes.reserved': { $gte: quantity }
          },
          {
            $inc: {
              'sizes.$.stock': -quantity,
              'sizes.$.reserved': -quantity
            }
          },
          { session: mongoSession }
        );

        if (result.modifiedCount === 0) {
          const product = await productModel.findById(productId).session(mongoSession);
          const sizeObj = product?.sizes?.find(s => s.size === size);
          const currentStock = sizeObj?.stock || 0;
          const currentReserved = sizeObj?.reserved || 0;
          
          console.log(`STOCK:BATCH:CONFIRM:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, stock=${currentStock}, reserved=${currentReserved}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
          
          throw new StockError(`Stock confirmation failed for ${item.name || 'product'} (${size}). Stock: ${currentStock}, Reserved: ${currentReserved}, Requested: ${quantity}`, {
            productId, size, quantity, currentStock, currentReserved, correlationId
          });
        }

        results.push({
          productId,
          size,
          quantity,
          success: true
        });
        
        successfulConfirmations.push(item);
        
        console.log(`STOCK:BATCH:CONFIRM:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

      } catch (error) {
        console.error(`STOCK:BATCH:CONFIRM:ERROR: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
        throw error;
      }
    }

    // Commit transaction if we started it
    if (shouldEndSession) {
      await mongoSession.commitTransaction();
    }

    console.log(`STOCK:BATCH:CONFIRM:COMPLETE: totalItems=${cartItems.length}, successfulItems=${successfulConfirmations.length}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

    return {
      success: true,
      confirmedItems: successfulConfirmations,
      results
    };

  } catch (error) {
    // Abort transaction if we started it
    if (shouldEndSession) {
      await mongoSession.abortTransaction();
    }
    
    console.error(`STOCK:BATCH:RESERVE:ABORTED: error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
    
  } finally {
    if (shouldEndSession) {
      await mongoSession.endSession();
    }
  }
}

/**
 * BATCH ATOMIC: Release stock reservations for multiple items in a single transaction
 * Either ALL items are released, or NONE are
 */
export async function releaseBatchStockAtomic(cartItems, options = {}) {
  const { session, correlationId } = options;
  
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    throw new ValidationError('Cart items are required for batch release', { correlationId });
  }

  console.log(`STOCK:BATCH:RELEASE:START: items=${cartItems.length}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

  // Start transaction if no session provided
  const shouldEndSession = !session;
  const mongoSession = session || await mongoose.startSession();
  
  try {
    if (shouldEndSession) {
      await mongoSession.startTransaction();
    }

    const results = [];
    const successfulReleases = [];

    // Release each item atomically within the transaction
    for (const item of cartItems) {
      const { productId, size, quantity } = item;
      
      try {
        const result = await productModel.updateOne(
          {
            _id: productId,
            'sizes.size': size,
            'sizes.reserved': { $gte: quantity }
          },
          { $inc: { 'sizes.$.reserved': -quantity } },
          { session: mongoSession }
        );

        if (result.modifiedCount === 0) {
          const product = await productModel.findById(productId).session(mongoSession);
          const sizeObj = product?.sizes?.find(s => s.size === size);
          const currentReserved = sizeObj?.reserved || 0;
          
          console.log(`STOCK:BATCH:RELEASE:FAILED: productId=${productId}, size=${size}, quantity=${quantity}, reserved=${currentReserved}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
          
          throw new StockError(`Stock release failed for ${item.name || 'product'} (${size}). Reserved: ${currentReserved}, Requested: ${quantity}`, {
            productId, size, quantity, currentReserved, correlationId
          });
        }

        results.push({
          productId,
          size,
          quantity,
          success: true
        });
        
        successfulReleases.push(item);
        
        console.log(`STOCK:BATCH:RELEASE:SUCCESS: productId=${productId}, size=${size}, quantity=${quantity}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

      } catch (error) {
        console.error(`STOCK:BATCH:RELEASE:ERROR: productId=${productId}, size=${size}, quantity=${quantity}, error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
        throw error;
      }
    }

    // Commit transaction if we started it
    if (shouldEndSession) {
      await mongoSession.commitTransaction();
    }

    console.log(`STOCK:BATCH:RELEASE:COMPLETE: totalItems=${cartItems.length}, successfulItems=${successfulReleases.length}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);

    return {
      success: true,
      releasedItems: successfulReleases,
      results
    };

  } catch (error) {
    // Abort transaction if we started it
    if (shouldEndSession) {
      await mongoSession.abortTransaction();
    }
    
    console.error(`STOCK:BATCH:RELEASE:ABORTED: error=${error.message}, correlationId=${correlationId}, timestamp=${new Date().toISOString()}`);
    throw error;
    
  } finally {
    if (shouldEndSession) {
      await mongoSession.endSession();
    }
  }
}
