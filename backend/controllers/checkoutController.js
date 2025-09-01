import { randomUUID } from 'crypto';
import CheckoutSession from '../models/CheckoutSession.js';
import PaymentEvent from '../models/PaymentEvent.js';
import Reservation from '../models/Reservation.js';
import productModel from '../models/productModel.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { checkStockAvailability, reserveStock, releaseStockReservation } from '../utils/stock.js';

/**
 * Create a checkout session for cart or buy-now items
 */
export const createCheckoutSession = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${correlationId}] Creating checkout session`);
    
    const { source, items, couponCode } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email || req.body.email;
    
    // Validate request
    if (!source || !['cart', 'buynow', 'buy-now'].includes(source)) {
      return errorResponse(res, 400, 'Invalid source. Must be "cart" or "buy-now"');
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, 'Items array is required and must not be empty');
    }
    
    if (!userEmail) {
      return errorResponse(res, 400, 'User email is required');
    }
    
    // Validate buy-now constraint
    if (source === 'buynow' && items.length !== 1) {
      return errorResponse(res, 400, 'Buy-now checkout can only have one item');
    }
    
    // Create payment event
    await PaymentEvent.createEvent({
      correlationId,
      eventType: 'session_created',
      source: 'backend',
      userId,
      userEmail,
      data: { source, itemCount: items.length }
    });
    
    // Fetch authoritative product data and validate stock availability
    const validatedItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      const productId = item.productId || item._id;
      if (!productId) {
        return errorResponse(res, 400, `Missing product ID for item: ${item.name}`);
      }
      
      const product = await productModel.findById(productId);
      if (!product) {
        return errorResponse(res, 404, `Product not found: ${item.name}`);
      }
      
      // Validate stock availability (but don't reserve yet)
      const stockCheck = await checkStockAvailability(productId, item.size, item.quantity);
      if (!stockCheck.available) {
        return errorResponse(res, 409, `Insufficient stock for ${product.name} (${item.size}): ${stockCheck.error}`);
      }
      
      // Use server-verified data
      validatedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        size: item.size,
        image: product.images?.[0] || '',
        categorySlug: product.categorySlug,
        category: product.category
      });
      
      subtotal += product.price * item.quantity;
    }
    
    // Calculate totals
    const shippingCost = req.body.orderSummary?.shipping || req.body.shippingCost || 0;
    const total = subtotal + shippingCost;
    
    console.log('📦 [Checkout Session] Creating session with:', {
      subtotal,
      shippingCost,
      total,
      source,
      itemCount: items.length
    });
    
    // Generate session ID
    const sessionId = randomUUID();
    
    // Create checkout session
    const checkoutSession = new CheckoutSession({
      sessionId,
      shippingCost,
      source,
      userId,
      userEmail,
      guestToken: !userId ? randomUUID() : undefined,
      items: validatedItems,
      subtotal,
      total,
      currency: 'INR',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        correlationId,
        checkoutFlow: source
      }
    });
    
    // Save session first to get the ID
    await checkoutSession.save();
    
    // 🔑 NEW: Create stock reservation (increment reserved field, don't decrement stock)
    try {
      console.log(`[${correlationId}] Creating stock reservation for session: ${sessionId}`);
      
      // 🔑 CRITICAL: Clean up any existing expired reservations first
      try {
        const expiredReservations = await Reservation.find({
          status: 'active',
          expiresAt: { $lt: new Date() }
        }).lean();
        
        if (expiredReservations.length > 0) {
          console.log(`[${correlationId}] Cleaning up ${expiredReservations.length} expired reservations`);
          for (const expired of expiredReservations) {
            try {
              // Release stock for expired reservations
              for (const item of expired.items) {
                await releaseStockReservation(item.productId, item.size, item.quantity);
              }
              // Mark reservation as expired
              await Reservation.findByIdAndUpdate(expired._id, { status: 'expired' });
            } catch (cleanupError) {
              console.warn(`[${correlationId}] Failed to cleanup expired reservation ${expired.reservationId}:`, cleanupError);
            }
          }
        }
      } catch (cleanupError) {
        console.warn(`[${correlationId}] Failed to cleanup expired reservations:`, cleanupError);
      }
      
      // Create reservation document
      const reservation = await Reservation.createReservation({
        reservationId: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userEmail,
        checkoutSessionId: sessionId,
        items: validatedItems.map(item => ({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          productName: item.name
        })),
        source: source === 'buy-now' ? 'buynow' : 'cart',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        status: 'active'
      });
      
      // Reserve stock for all items (increment reserved field)
      const reservationPromises = validatedItems.map(item =>
        reserveStock(item.productId, item.size, item.quantity)
      );
      await Promise.all(reservationPromises);
      
      console.log(`[${correlationId}] Stock reserved successfully for session items`);
      
      // Mark session as having reserved stock
      checkoutSession.stockReserved = true;
      checkoutSession.status = 'awaiting_payment';
      await checkoutSession.save();
      
    } catch (err) {
      console.error(`[${correlationId}] Stock reservation failed – releasing any partial reservations`, err);
      
      // Best-effort release of any partial reservations
      try {
        const releasePromises = validatedItems.map(item =>
          releaseStockReservation(item.productId, item.size, item.quantity).catch(() => {})
        );
        await Promise.all(releasePromises);
      } catch (_) {/* ignored */}
      
      // Delete the checkout session since reservation failed
      await CheckoutSession.findByIdAndDelete(checkoutSession._id);
      
      return errorResponse(
        res,
        409,
        'Stock reservation failed',
        err.message
      );
    }
    
    console.log(`[${correlationId}] Checkout session created and stock reserved: ${sessionId}`);
    
    // Return session data (without sensitive info)
    return successResponse(res, {
      sessionId,
      source,
      items: validatedItems,
      subtotal,
      total,
      currency: 'INR',
      expiresAt: checkoutSession.expiresAt,
      message: 'Checkout session created successfully with stock reserved'
    });
    
  } catch (error) {
    console.error(`[${correlationId}] Error creating checkout session:`, error);
    
    // Log failed event
    await PaymentEvent.createEvent({
      correlationId,
      eventType: 'session_created',
      source: 'backend',
      userId: req.user?.id,
      userEmail: req.user?.email || req.body.email,
      status: 'failed',
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN',
        stack: error.stack
      }
    });
    
    return errorResponse(res, 500, 'Failed to create checkout session', error.message);
  }
};

/**
 * Get checkout session by ID
 */
export const getCheckoutSession = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }
    
    const session = await CheckoutSession.findOne({ sessionId });
    if (!session) {
      return errorResponse(res, 404, 'Checkout session not found');
    }
    
    if (session.isExpired()) {
      return errorResponse(res, 410, 'Checkout session has expired');
    }
    
    return successResponse(res, {
      sessionId: session.sessionId,
      source: session.source,
      items: session.items,
      subtotal: session.subtotal,
      total: session.total,
      currency: session.currency,
      status: session.status,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt
    });
    
  } catch (error) {
    console.error(`[${correlationId}] Error retrieving checkout session:`, error);
    return errorResponse(res, 500, 'Failed to retrieve checkout session', error.message);
  }
};

/**
 * Reserve stock for checkout session
 */
export const reserveStockForSession = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }
    
    const session = await CheckoutSession.findOne({ sessionId });
    if (!session) {
      return errorResponse(res, 404, 'Checkout session not found');
    }
    
    if (session.isExpired()) {
      return errorResponse(res, 410, 'Checkout session has expired');
    }
    
    if (session.stockReserved) {
      return successResponse(res, { message: 'Stock already reserved for this session' });
    }
    
    // Validate stock availability for all items
    const stockValidations = [];
    for (const item of session.items) {
      const validation = await checkStockAvailability(item.productId, item.size, item.quantity);
      stockValidations.push({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        ...validation
      });
      
      if (!validation.available) {
        return errorResponse(res, 409, 'Stock not available', validation.error);
      }
    }
    
    // Reserve stock for all items
    const reservationPromises = session.items.map(item =>
      reserveStock(item.productId, item.size, item.quantity)
    );
    await Promise.all(reservationPromises);
    
    // Mark session as having reserved stock
    session.stockReserved = true;
    session.status = 'awaiting_payment';
    await session.save();
    
    // Log stock reservation
    await PaymentEvent.createEvent({
      correlationId,
      eventType: 'stock_reserved',
      source: 'backend',
      checkoutSessionId: sessionId,
      userId: session.userId,
      userEmail: session.userEmail,
      status: 'success',
      data: { stockValidations }
    });
    
    console.log(`[${correlationId}] Stock reserved for session: ${sessionId}`);
    
    return successResponse(res, {
      message: 'Stock reserved successfully',
      stockReserved: true,
      expiresAt: session.expiresAt
    });
    
  } catch (error) {
    console.error(`[${correlationId}] Error reserving stock:`, error);
    
    // Log failed event
    await PaymentEvent.createEvent({
      correlationId,
      eventType: 'stock_reserved',
      source: 'backend',
      checkoutSessionId: req.params.sessionId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      status: 'failed',
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN',
        stack: error.stack
      }
    });
    
    return errorResponse(res, 500, 'Failed to reserve stock', error.message);
  }
};

/**
 * Release stock reservation for checkout session
 */
export const releaseStockForSession = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }
    
    const session = await CheckoutSession.findOne({ sessionId });
    if (!session) {
      return errorResponse(res, 404, 'Checkout session not found');
    }
    
    if (!session.stockReserved) {
      return successResponse(res, { message: 'No stock reserved for this session' });
    }
    
    // Find and update the reservation
    const reservation = await Reservation.findOne({ checkoutSessionId: sessionId });
    if (reservation && reservation.status === 'active') {
      await reservation.expire();
    }
    
    // Release stock for all items (decrement reserved field only)
    const stockOperations = [];
    for (const item of session.items) {
      try {
        await releaseStockReservation(item.productId, item.size, item.quantity);
        stockOperations.push({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          success: true
        });
      } catch (error) {
        stockOperations.push({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          success: false,
          error: error.message
        });
      }
    }
    
    // Mark session as no longer having reserved stock
    session.stockReserved = false;
    await session.save();
    
    // Log stock release
    await PaymentEvent.createEvent({
      correlationId,
      eventType: 'stock_released',
      source: 'backend',
      checkoutSessionId: sessionId,
      userId: session.userId,
      userEmail: session.userEmail,
      status: 'success',
      data: { stockOperations }
    });
    
    console.log(`[${correlationId}] Stock released for session: ${sessionId}`);
    
    return successResponse(res, {
      message: 'Stock released successfully',
      stockReserved: false
    });
    
  } catch (error) {
    console.error(`[${correlationId}] Error releasing stock:`, error);
    
    // Log failed event
    await PaymentEvent.createEvent({
      correlationId,
      eventType: 'stock_released',
      source: 'backend',
      checkoutSessionId: req.params.sessionId,
      userId: req.user?.id,
      userEmail: req.user?.email,
      status: 'failed',
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN',
        stack: error.stack
      }
    });
    
    return errorResponse(res, 500, 'Failed to release stock', error.message);
  }
};

/**
 * Cancel checkout session
 */
export const cancelCheckoutSession = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }
    
    const session = await CheckoutSession.findOne({ sessionId });
    if (!session) {
      return errorResponse(res, 404, 'Checkout session not found');
    }
    
    // Release stock if reserved
    if (session.stockReserved) {
      try {
        // Release stock for all items
        const stockOperations = [];
        for (const item of session.items) {
          try {
            await releaseStockReservation(item.productId, item.size, item.quantity);
            stockOperations.push({
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
              success: true
            });
          } catch (error) {
            stockOperations.push({
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
              success: false,
              error: error.message
            });
          }
        }
        
        // Mark session as no longer having reserved stock
        session.stockReserved = false;
        await session.save();
        
        console.log(`Stock released for cancelled session: ${sessionId}`);
      } catch (error) {
        console.error(`Error releasing stock for cancelled session:`, error);
      }
    }
    
    // Mark session as cancelled
    session.status = 'cancelled';
    await session.save();
    
    console.log(`[${correlationId}] Checkout session cancelled: ${sessionId}`);
    
    return successResponse(res, {
      message: 'Checkout session cancelled successfully',
      status: session.status
    });
    
  } catch (error) {
    console.error(`[${correlationId}] Error cancelling checkout session:`, error);
    return errorResponse(res, 500, 'Failed to cancel checkout session', error.message);
  }
};
