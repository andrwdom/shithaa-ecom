import { randomUUID } from 'crypto';
import CheckoutSession from '../models/CheckoutSession.js';
import PaymentEvent from '../models/PaymentEvent.js';
import Reservation from '../models/Reservation.js';
import productModel from '../models/productModel.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { checkStockAvailability, reserveStock, releaseStockReservation } from '../utils/stock.js';

// Helper function to calculate loungewear category offer
function calculateLoungewearCategoryOffer(loungewearCategoryItems) {
    console.log(`🔧 CRITICAL DEBUG: calculateLoungewearCategoryOffer called with ${loungewearCategoryItems.length} items`);
    console.log(`🔧 CRITICAL DEBUG: Items:`, loungewearCategoryItems.map(item => `${item.name} (${item.size}) - ₹${item.originalPrice}`));
    
    // 🔧 CRITICAL FIX: Offer ONLY applies when there are 3 or more loungewear items
    if (loungewearCategoryItems.length < 3) {
        console.log(`🔧 CRITICAL: No loungewear offer applied: Only ${loungewearCategoryItems.length} item(s), need 3+ for offer`);
        const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
        console.log(`🔧 CRITICAL DEBUG: Returning no offer, originalTotal: ₹${originalTotal}, discount: ₹0`);
        
        // 🔧 TRIPLE CHECK: Ensure discount is absolutely zero
        const result = {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
        
        console.log(`🔧 FINAL RESULT FOR < 3 ITEMS:`, result);
        return result;
    }

    // 🔧 NEW FIX: Check if items are priced appropriately for the offer
    // The offer is designed for items priced at ₹450+ each, not ₹1 test items
    const minPriceForOffer = 400; // Minimum price per item to qualify for offer
    const itemsBelowMinPrice = loungewearCategoryItems.filter(item => item.originalPrice < minPriceForOffer);
    
    if (itemsBelowMinPrice.length > 0) {
        console.log(`🔧 CRITICAL: No loungewear offer applied: Items below minimum price (₹${minPriceForOffer}):`, 
                   itemsBelowMinPrice.map(item => `${item.name} - ₹${item.originalPrice}`));
        const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
        
        const result = {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
        
        console.log(`🔧 FINAL RESULT FOR LOW-PRICED ITEMS:`, result);
        return result;
    }

    // Calculate how many complete sets of 3
    const completeSets = Math.floor(loungewearCategoryItems.length / 3);
    const remainingItems = loungewearCategoryItems.length % 3;
    
    console.log(`🔧 Loungewear offer calculation: ${loungewearCategoryItems.length} items = ${completeSets} complete sets + ${remainingItems} remaining`);
    
    // Calculate totals
    const originalTotal = loungewearCategoryItems.reduce((sum, item) => sum + item.originalPrice, 0);
    
    // 🔧 FIX: The offer is: "3 for ₹1299" + remaining items at ₹450 each
    // This should only apply when we have 3+ items, which we already checked above
    
    // Calculate offer total based on the rule:
    // - Complete sets of 3: ₹1299 each
    // - Remaining items: ₹450 each
    const offerTotal = (completeSets * 1299) + (remainingItems * 450);
    
    console.log(`🔧 Offer calculation: ${completeSets} × ₹1299 + ${remainingItems} × ₹450 = ₹${offerTotal}`);
    console.log(`🔧 Original total: ₹${originalTotal}, Offer total: ₹${offerTotal}`);
    
    // 🔧 FIX: Ensure offer total is never higher than original total
    if (offerTotal >= originalTotal) {
        console.log(`🔧 Offer validation failed: Offer total ₹${offerTotal} >= Original total ₹${originalTotal}`);
        return {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
    }
    
    const discount = originalTotal - offerTotal;
    
    console.log(`🔧 Final discount: ₹${originalTotal} - ₹${offerTotal} = ₹${discount}`);
    
    // 🔧 FIX: Additional safety check - discount should be positive
    if (discount <= 0) {
        console.log(`🔧 Offer validation failed: Invalid discount ₹${discount}`);
        return {
            originalTotal,
            discount: 0,
            offerApplied: false,
            offerDetails: null
        };
    }
    
    const offerDetails = {     
        completeSets,
        remainingItems,
        offerPrice: offerTotal,
        originalPrice: originalTotal,
        savings: discount
    };

    return {    
        originalTotal,
        discount,
        offerApplied: true,
        offerDetails
    };
}

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
    
    // Calculate totals with offer discounts
    const shippingCost = req.body.orderSummary?.shipping || req.body.shippingCost || 0;
    
    // 🔧 CRITICAL FIX: Calculate offer discount using the same logic as cart calculation
    const loungewearCategoryItems = [];
    const otherItems = [];
    
    validatedItems.forEach(item => {
      if (item.categorySlug === 'zipless-feeding-lounge-wear' || 
          item.categorySlug === 'non-feeding-lounge-wear') {
        // Add item multiple times based on quantity for offer calculation
        for (let i = 0; i < item.quantity; i++) {
          loungewearCategoryItems.push({
            ...item,
            quantity: 1,
            originalPrice: item.price
          });
        }
      } else {
        otherItems.push(item);
      }
    });
    
    // Calculate loungewear offer
    const loungewearCategoryOffer = calculateLoungewearCategoryOffer(loungewearCategoryItems);
    
    // Calculate other items total
    const otherItemsTotal = otherItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Calculate totals with offer discount
    const rawSubtotal = loungewearCategoryOffer.originalTotal + otherItemsTotal;
    const offerDiscount = Math.min(loungewearCategoryOffer.discount, rawSubtotal);
    const total = Math.max(0, rawSubtotal - offerDiscount) + shippingCost;
    
    console.log('📦 [Checkout Session] Creating session with offer calculation:', {
      rawSubtotal,
      offerDiscount,
      shippingCost,
      total,
      source,
      itemCount: items.length,
      loungewearItemsCount: loungewearCategoryItems.length
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
      subtotal: rawSubtotal, // Store the raw subtotal before discount
      discount: {
        type: 'fixed',
        value: offerDiscount,
        appliedCouponCode: null
      },
      // 🔧 FIX: Store offer details for invoice generation
      offerDetails: {
        offerApplied: loungewearCategoryOffer.offerApplied,
        offerType: loungewearCategoryOffer.offerApplied ? 'loungewear_buy3_1299' : null,
        offerDiscount: loungewearCategoryOffer.discount,
        offerDescription: loungewearCategoryOffer.offerApplied ? 'Buy 3 @ ₹1299' : null,
        offerCalculation: loungewearCategoryOffer.offerDetails || {
          completeSets: 0,
          remainingItems: 0,
          originalPrice: 0,
          offerPrice: 0,
          savings: 0
        }
      },
      total,
      currency: 'INR',
      status: 'pending',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes - optimal for e-commerce
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        correlationId,
        checkoutFlow: source
      }
    });
    
    // Save session first to get the ID
    await checkoutSession.save();
    
    // 🔑 FIXED: Don't reserve stock here - only reserve when payment starts
    // Stock will be reserved in the reserveStockForSession endpoint when user actually starts payment
    console.log(`[${correlationId}] Checkout session created without stock reservation: ${sessionId}`);
    
    // Stock reservation will be done when payment starts, not at checkout session creation
    
    console.log(`[${correlationId}] Checkout session created successfully: ${sessionId}`);
    
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

// 🚀 NEW: Stock validation endpoint for frontend
export const validateStock = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, 'Items array is required');
    }

    console.log(`[ValidateStock:${correlationId}] Validating stock for ${items.length} items`);

    const unavailableItems = [];
    
    for (const item of items) {
      try {
        const stockCheck = await checkStockAvailability(
          item.productId, 
          item.size, 
          item.quantity
        );
        
        if (!stockCheck.available) {
          // Use the stock check data directly for better error message
          unavailableItems.push({
            productId: item.productId,
            name: item.name || stockCheck.productName,
            size: item.size,
            requestedQuantity: item.quantity,
            availableQuantity: stockCheck.availableStock,
            reason: `Insufficient stock. Available: ${stockCheck.availableStock}, Requested: ${item.quantity}`
          });
        }
      } catch (error) {
        console.error(`[ValidateStock:${correlationId}] Error checking stock for ${item.productId}:`, error);
        unavailableItems.push({
          productId: item.productId,
          name: item.name || 'Unknown Product',
          size: item.size,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          reason: 'Error checking stock'
        });
      }
    }

    const isValid = unavailableItems.length === 0;
    
    console.log(`[ValidateStock:${correlationId}] Validation result: ${isValid ? 'valid' : 'invalid'}, ${unavailableItems.length} unavailable items`);
    
    return successResponse(res, {
      isValid,
      unavailableItems,
      message: isValid 
        ? 'All items are available' 
        : `${unavailableItems.length} item(s) are not available`
    });
  } catch (error) {
    console.error(`[ValidateStock:${correlationId}] Error:`, error);
    return errorResponse(res, 500, 'Failed to validate stock', error.message);
  }
};
