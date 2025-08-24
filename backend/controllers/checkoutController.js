import { randomUUID } from 'crypto';
import CheckoutSession from '../models/CheckoutSession.js';
import PaymentEvent from '../models/PaymentEvent.js';
import productModel from '../models/productModel.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { checkStockAvailability, reserveStock, releaseStock } from '../utils/stock.js';

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
    
    // Fetch authoritative product data and validate stock
    const validatedItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      const productId = item.productId || item._id; // 🔑 FIX: Use item._id as the product identifier
      if (!productId) {
        return errorResponse(res, 400, `Item is missing a product identifier.`, { item });
      }

      const product = await productModel.findById(productId);
      if (!product) {
        return errorResponse(res, 400, `Product not found: ${productId}`);
      }
      
      const sizeObj = product.sizes.find(s => s.size === item.size);
      if (!sizeObj) {
        return errorResponse(res, 400, `Size ${item.size} not available for ${product.name}`);
      }
      
      // Validate stock availability
      if (sizeObj.stock < item.quantity) {
        return errorResponse(res, 409, `Insufficient stock for ${product.name} size ${item.size}. Available: ${sizeObj.stock}, Requested: ${item.quantity}`);
      }
      
      // Use server-verified price
      const itemPrice = product.price * item.quantity;
      subtotal += itemPrice;
      
      validatedItems.push({
        productId: product._id,
        variantId: item.size,
        name: product.name,
        price: product.price, // Unit price
        quantity: item.quantity,
        size: item.size,
        image: product.images?.[0] || '',
        categorySlug: product.categorySlug,
        category: product.category
      });
    }
    
    // Calculate totals (simplified for now, can be enhanced with shipping/coupons)
    const total = subtotal;
    
    // Generate session ID
    const sessionId = randomUUID();
    
    // Create checkout session
    const checkoutSession = new CheckoutSession({
      sessionId,
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
    
    // 🔑 CRITICAL FIX: Stock reservation has been REMOVED from this controller.
    // Stock is now exclusively handled in the payment controller to prevent double-deduction.
    // The session is marked as awaiting_payment immediately.
    checkoutSession.stockReserved = false; // Explicitly set to false
    checkoutSession.status = 'awaiting_payment';
    await checkoutSession.save();
    
    console.log(`[${correlationId}] Checkout session created and ready: ${sessionId}`);
    
    // Return session data (without sensitive info)
    return successResponse(res, {
      sessionId,
      source,
      items: validatedItems,
      subtotal,
      total,
      currency: 'INR',
      expiresAt: checkoutSession.expiresAt,
      message: 'Checkout session created successfully'
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
    
    // Check if session is expired
    if (session.isExpired()) {
      return errorResponse(res, 410, 'Checkout session has expired');
    }
    
    // Return session data
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
    console.error(`[${correlationId}] Error getting checkout session:`, error);
    return errorResponse(res, 500, 'Failed to get checkout session', error.message);
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
    
    // Reserve stock for all items
    const stockOperations = [];
    for (const item of session.items) {
      try {
        await reserveStock(item.productId, item.size, item.quantity);
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
    
    // Check if all stock operations succeeded
    const failedOperations = stockOperations.filter(op => !op.success);
    if (failedOperations.length > 0) {
      // Release any successfully reserved stock
      for (const op of stockOperations) {
        if (op.success) {
          try {
            await releaseStock(op.productId, op.size, op.quantity);
          } catch (releaseError) {
            console.error(`[${correlationId}] Failed to release stock after reservation failure:`, releaseError);
          }
        }
      }
      
      return errorResponse(res, 409, 'Stock reservation failed for some items', { failedOperations });
    }
    
    // Mark session as having reserved stock
    session.stockReserved = true;
    session.status = 'awaiting_payment';
    await session.save();
    
    // Log successful stock reservation
    await PaymentEvent.createEvent({
      correlationId,
      eventType: 'stock_reserved',
      source: 'backend',
      checkoutSessionId: sessionId,
      userId: session.userId,
      userEmail: session.userEmail,
      status: 'success',
      data: { stockOperations }
    });
    
    console.log(`[${correlationId}] Stock reserved for session: ${sessionId}`);
    
    return successResponse(res, {
      message: 'Stock reserved successfully',
      stockReserved: true,
      status: session.status
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
 * Release stock for checkout session
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
    
    // Release stock for all items
    const stockOperations = [];
    for (const item of session.items) {
      try {
        await releaseStock(item.productId, item.size, item.quantity);
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
      await releaseStockForSession(req, res);
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
