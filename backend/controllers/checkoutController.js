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
    console.log(`[${correlationId}] Request body:`, JSON.stringify(req.body, null, 2));
    console.log(`[${correlationId}] Request body type:`, typeof req.body);
    console.log(`[${correlationId}] Request body keys:`, Object.keys(req.body || {}));
    console.log(`[${correlationId}] Request headers:`, req.headers);
    console.log(`[${correlationId}] User:`, req.user);
    console.log(`[${correlationId}] Content-Type header:`, req.headers['content-type']);
    
    const { source, items, couponCode, email } = req.body;
    const userId = req.user?.id;
    
    // Enhanced user email handling
    let userEmail = null;
    if (req.user?.email) {
      userEmail = req.user.email;
      console.log(`[${correlationId}] ✅ Using authenticated user email:`, userEmail);
    } else if (email) {
      userEmail = email;
      console.log(`[${correlationId}] ✅ Using provided email:`, userEmail);
    } else {
      console.log(`[${correlationId}] ❌ No user email found in request or user object`);
      return errorResponse(res, 400, 'User email is required for checkout. Please provide an email address.');
    }
    
    console.log(`[${correlationId}] Parsed data:`, { source, items, userId, userEmail });
    console.log(`[${correlationId}] Source value received:`, source);
    console.log(`[${correlationId}] Source value type:`, typeof source);
    console.log(`[${correlationId}] Source value length:`, source ? source.length : 'undefined');
    console.log(`[${correlationId}] Source === "buynow":`, source === 'buynow');
    console.log(`[${correlationId}] Source === "cart":`, source === 'cart');
    
    // Enhanced validation with detailed error messages
    if (!source) {
      console.log(`[${correlationId}] ❌ Missing source field`);
      return errorResponse(res, 400, 'Source field is required. Must be "cart" or "buynow"');
    }
    
    if (!['cart', 'buynow'].includes(source)) {
      console.log(`[${correlationId}] ❌ Invalid source: ${source}`);
      return errorResponse(res, 400, `Invalid source: "${source}". Must be "cart" or "buynow"`);
    }
    
    if (!items) {
      console.log(`[${correlationId}] ❌ Missing items field`);
      return errorResponse(res, 400, 'Items field is required');
    }
    
    if (!Array.isArray(items)) {
      console.log(`[${correlationId}] ❌ Items is not an array:`, typeof items);
      return errorResponse(res, 400, 'Items must be an array');
    }
    
    if (items.length === 0) {
      console.log(`[${correlationId}] ❌ Items array is empty`);
      return errorResponse(res, 400, 'Items array cannot be empty');
    }
    
    // Validate buy-now constraint
    if (source === 'buynow' && items.length !== 1) {
      console.log(`[${correlationId}] ❌ Buy-now checkout has ${items.length} items, expected 1`);
      return errorResponse(res, 400, 'Buy-now checkout can only have one item');
    }
    
    // Validate each item structure
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        console.log(`[${correlationId}] ❌ Item ${i} missing productId:`, item);
        return errorResponse(res, 400, `Item ${i + 1} is missing product ID`);
      }
      if (!item.size) {
        console.log(`[${correlationId}] ❌ Item ${i} missing size:`, item);
        return errorResponse(res, 400, `Item ${i + 1} is missing size`);
      }
      if (!item.quantity || item.quantity <= 0) {
        console.log(`[${correlationId}] ❌ Item ${i} has invalid quantity:`, item.quantity);
        return errorResponse(res, 400, `Item ${i + 1} must have a valid quantity greater than 0`);
      }
    }
    
    console.log(`[${correlationId}] ✅ Basic validation passed, proceeding with checkout session creation`);
    
    // Create payment event
    try {
      await PaymentEvent.createEvent({
        correlationId,
        eventType: 'session_created',
        source: 'backend',
        userId,
        userEmail,
        data: { source, itemCount: items.length }
      });
    } catch (eventError) {
      console.warn(`[${correlationId}] ⚠️ Failed to create payment event (non-critical):`, eventError);
      // Continue with checkout session creation even if event creation fails
    }
    
    // Fetch authoritative product data and validate stock
    const validatedItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      try {
        const product = await productModel.findById(item.productId);
        if (!product) {
          console.log(`[${correlationId}] ❌ Product not found: ${item.productId}`);
          return errorResponse(res, 400, `Product not found: ${item.productId}`);
        }
        
        const sizeObj = product.sizes.find(s => s.size === item.size);
        if (!sizeObj) {
          console.log(`[${correlationId}] ❌ Size ${item.size} not available for ${product.name}`);
          return errorResponse(res, 400, `Size ${item.size} not available for ${product.name}`);
        }
        
        // Validate stock availability
        if (sizeObj.stock < item.quantity) {
          console.log(`[${correlationId}] ❌ Insufficient stock for ${product.name} size ${item.size}. Available: ${sizeObj.stock}, Requested: ${item.quantity}`);
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
        
        console.log(`[${correlationId}] ✅ Validated item: ${product.name} (${item.size}) x${item.quantity} = ₹${itemPrice}`);
      } catch (itemError) {
        console.error(`[${correlationId}] ❌ Error validating item:`, itemError);
        return errorResponse(res, 500, `Error validating item: ${itemError.message}`);
      }
    }
    
    // Calculate totals (simplified for now, can be enhanced with shipping/coupons)
    const total = subtotal;
    
    console.log(`[${correlationId}] ✅ Items validation complete. Subtotal: ₹${subtotal}, Total: ₹${total}`);
    
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
    
    // Save session
    try {
      await checkoutSession.save();
      console.log(`[${correlationId}] ✅ Checkout session saved to database: ${sessionId}`);
    } catch (saveError) {
      console.error(`[${correlationId}] ❌ Failed to save checkout session:`, saveError);
      return errorResponse(res, 500, 'Failed to save checkout session', saveError.message);
    }
    
    console.log(`[${correlationId}] ✅ Checkout session created successfully: ${sessionId}`);
    
    // Return session data (without sensitive info)
    const responseData = {
      sessionId,
      source,
      items: validatedItems,
      subtotal,
      total,
      currency: 'INR',
      expiresAt: checkoutSession.expiresAt,
      message: 'Checkout session created successfully'
    };
    
    console.log(`[${correlationId}] 📤 Sending success response:`, responseData);
    return successResponse(res, responseData);
    
  } catch (error) {
    console.error(`[${correlationId}] ❌ Error creating checkout session:`, error);
    console.error(`[${correlationId}] ❌ Error stack:`, error.stack);
    
    // Log failed event
    try {
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
    } catch (eventError) {
      console.warn(`[${correlationId}] ⚠️ Failed to create failed payment event:`, eventError);
    }
    
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

/**
 * Get server-authoritative checkout summary by session ID
 * GET /api/checkout/session/:sessionId/summary
 */
export const getCheckoutSummary = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }

    const s = await CheckoutSession.findOne({ sessionId });
    if (!s) {
      return errorResponse(res, 404, 'Checkout session not found');
    }

    return successResponse(res, {
      sessionId: s.sessionId,
      source: s.source,
      items: s.items,
      subtotal: s.subtotal,
      shippingCost: s.shippingCost,
      discount: s.discount,
      total: s.total,
      status: s.status,
      userEmail: s.userEmail,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    });
  } catch (error) {
    return errorResponse(res, 500, 'Failed to get checkout summary', error.message);
  }
};

/**
 * Retry checkout session - reset status and return fresh session
 * POST /api/checkout/session/:sessionId/retry
 */
export const retryCheckoutSession = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }
    
    console.log(`[${correlationId}] 🔄 Retrying checkout session: ${sessionId}`);
    
    const session = await CheckoutSession.findOne({ sessionId });
    if (!session) {
      console.log(`[${correlationId}] ❌ Checkout session not found: ${sessionId}`);
      return errorResponse(res, 404, 'Checkout session not found');
    }
    
    console.log(`[${correlationId}] 📊 Current session status: ${session.status}, source: ${session.source}`);
    
    // Reset session status to pending and clear any PhonePe transaction ID
    const updateData = {
      status: 'pending',
      updatedAt: new Date(),
      phonepeTransactionId: undefined // Clear any existing transaction ID
    };
    
    const updatedSession = await CheckoutSession.findOneAndUpdate(
      { sessionId },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedSession) {
      console.log(`[${correlationId}] ❌ Failed to update session: ${sessionId}`);
      return errorResponse(res, 500, 'Failed to update checkout session');
    }
    
    console.log(`[${correlationId}] ✅ Checkout session reset to pending: ${sessionId}`);
    
    // Try to log retry event (but don't fail if it errors)
    try {
      await PaymentEvent.createEvent({
        correlationId,
        eventType: 'session_retry',
        source: 'backend',
        checkoutSessionId: sessionId,
        userId: req.user?.id,
        userEmail: req.user?.email,
        data: { 
          previousStatus: session.status,
          newStatus: 'pending',
          source: session.source 
        }
      });
      console.log(`[${correlationId}] 📝 Retry event logged successfully`);
    } catch (eventError) {
      console.warn(`[${correlationId}] ⚠️ Failed to log retry event (non-critical):`, eventError.message);
    }
    
    return successResponse(res, {
      message: 'Checkout session reset successfully',
      session: {
        sessionId: updatedSession.sessionId,
        source: updatedSession.source,
        items: updatedSession.items,
        subtotal: updatedSession.subtotal,
        total: updatedSession.total,
        status: updatedSession.status,
        userEmail: updatedSession.userEmail,
        createdAt: updatedSession.createdAt,
        updatedAt: updatedSession.updatedAt
      }
    });
    
  } catch (error) {
    console.error(`[${correlationId}] ❌ Error retrying checkout session:`, error);
    return errorResponse(res, 500, 'Failed to retry checkout session', error.message);
  }
};
