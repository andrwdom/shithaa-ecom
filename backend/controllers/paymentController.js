import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import PaymentSession from "../models/paymentSessionModel.js";
import CheckoutSession from "../models/CheckoutSession.js";
import Payment from "../models/Payment.js";
import PaymentEvent from "../models/PaymentEvent.js";
import { successResponse, errorResponse } from '../utils/response.js';
import { getUniqueOrderId } from './orderController.js';
import { trackPayment } from '../utils/monitoring.js';
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from 'pg-sdk-node';
import { randomUUID } from 'crypto';
import { generateInvoiceBuffer, sendInvoiceEmail } from '../utils/invoiceGenerator.js';
import { releaseStockReservation } from '../utils/stock.js';
import { config } from '../config.js';
import mongoose from 'mongoose';

// Helper function to get user email for orders
const getOrderUserEmail = (req, email) => {
    return req.user?.email || email || `guest@${process.env.BASE_URL?.replace('https://', '').replace('http://', '') || 'shithaa.in'}`;
};

// Helper function to release stock on payment failure
const releaseStockOnPaymentFailure = async (paymentSession, correlationId) => {
  // PaymentSession stores checkout session ID in sessionId field
  const checkoutSessionId = paymentSession.sessionId;
  
  if (!checkoutSessionId) {
    console.log(`[${correlationId}] No checkout session ID found, skipping stock release`);
    return;
  }

  try {
    console.log(`[${correlationId}] Releasing reserved stock for failed payment session: ${checkoutSessionId}`);
    
    // Find the checkout session
    const checkoutSession = await CheckoutSession.findOne({ sessionId: checkoutSessionId });
    
    if (!checkoutSession) {
      console.log(`[${correlationId}] Checkout session not found: ${checkoutSessionId}`);
      return;
    }
    
    if (!checkoutSession.stockReserved) {
      console.log(`[${correlationId}] No stock reserved for session: ${checkoutSessionId}`);
      return;
    }
    
    // Release stock for all items in the session
    const stockOperations = [];
    for (const item of checkoutSession.items) {
      try {
        await releaseStockReservation(item.productId, item.size, item.quantity);
        stockOperations.push({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          success: true
        });
        console.log(`[${correlationId}] Released stock for ${item.name} (${item.size}) x${item.quantity}`);
      } catch (error) {
        stockOperations.push({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          success: false,
          error: error.message
        });
        console.error(`[${correlationId}] Failed to release stock for ${item.name}:`, error);
      }
    }
    
    // Mark session as no longer having reserved stock
    checkoutSession.stockReserved = false;
    checkoutSession.status = 'failed';
    await checkoutSession.save();
    
    console.log(`[${correlationId}] ✅ Reserved stock released for failed payment. Success: ${stockOperations.filter(op => op.success).length}, Failed: ${stockOperations.filter(op => !op.success).length}`);
    
  } catch (error) {
    console.error(`[${correlationId}] ❌ Failed to release stock for failed payment:`, error);
    // Don't throw - we don't want to fail the entire payment callback
  }
};

// Fallback function for non-transactional payment processing
const processPaymentWithoutTransaction = async (paymentSession, merchantTransactionId, correlationId, phonepeResponse) => {
  console.log(`[${correlationId}] Processing payment without transaction (fallback mode)`);
  
  try {
    // 1. Check if order already exists (idempotency check)
    const existingOrder = await orderModel.findOne({
      phonepeTransactionId: merchantTransactionId
    });
    
    if (existingOrder) {
      console.log(`[${correlationId}] Order already exists for transaction ${merchantTransactionId}, skipping creation`);
      return existingOrder;
    }

    // 2. Validate payment session data
    const orderPayload = paymentSession.orderPayload;
    if (!orderPayload) {
      throw new Error('Order payload is missing from payment session');
    }

    // 3. Prepare order data
    orderPayload.paymentStatus = 'paid';
    orderPayload.orderStatus = 'Pending';
    orderPayload.status = 'Pending';
    orderPayload.paidAt = new Date();
    orderPayload.phonepeResponse = phonepeResponse;
    orderPayload.stockConfirmed = false;

    // 4. Create order
    const order = await orderModel.create(orderPayload);
    const createdOrder = order;
    console.log(`[${correlationId}] Order created (non-transactional):`, createdOrder.orderId);

    // 5. Confirm stock reservation (deduct stock)
    const { confirmStockReservation } = await import('../utils/stock.js');
    const itemsToProcess = createdOrder.cartItems && createdOrder.cartItems.length > 0 
      ? createdOrder.cartItems 
      : createdOrder.items;

    if (!itemsToProcess || itemsToProcess.length === 0) {
      throw new Error('Order has no items to process');
    }

    // Process each item
    for (const item of itemsToProcess) {
      const productId = item.productId || item._id || item.id || item.product;
      
      if (!productId || !item.size || !item.quantity) {
        throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
      }

      console.log(`[${correlationId}] Confirming stock for:`, item.name, 'Product:', productId, 'Size:', item.size, 'Qty:', item.quantity);
      
      const stockConfirmed = await confirmStockReservation(
        productId, 
        item.size, 
        item.quantity
      );
      
      if (!stockConfirmed) {
        throw new Error(`Stock confirmation failed for ${item.name} (${item.size}) - insufficient stock or reservation`);
      }
    }

    // 6. Mark order as stock confirmed
    await orderModel.findByIdAndUpdate(
      createdOrder._id, 
      { 
        stockConfirmed: true,
        stockConfirmedAt: new Date(),
        updatedAt: new Date()
      }
    );

    // 7. Update payment session status
    await PaymentSession.findByIdAndUpdate(
      paymentSession._id,
      {
        status: 'success',
        orderId: createdOrder._id,
        phonepeResponse: phonepeResponse
      }
    );

    console.log(`[${correlationId}] Non-transactional payment processing completed successfully for order:`, createdOrder.orderId);
    return createdOrder;

  } catch (error) {
    console.error(`[${correlationId}] Non-transactional payment processing failed:`, error);
    
    // Try to rollback by releasing stock
    try {
      await releaseStockOnPaymentFailure(paymentSession, correlationId);
    } catch (rollbackError) {
      console.error(`[${correlationId}] Rollback failed:`, rollbackError);
    }
    
    throw error;
  }
};

// Helper function to initialize PhonePe client
const initializePhonePeClient = () => {
    const { phonepe } = config;

    if (!phonepe.merchant_id || !phonepe.api_key) {
        console.error('PhonePe credentials missing, cannot initialize client');
        console.error('Available config:', {
            merchant_id: phonepe.merchant_id ? 'SET' : 'MISSING',
            api_key: phonepe.api_key ? 'SET' : 'MISSING',
            salt_index: phonepe.salt_index,
            env: phonepe.env
        });
        return null;
    }

    try {
        const client = StandardCheckoutClient.getInstance(
            phonepe.merchant_id,
            phonepe.api_key,
            phonepe.salt_index,
            phonepe.env === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX
        );
        
        // 🔧 CRITICAL FIX: Validate client structure - check for both method names
        const hasGetOrderStatus = client && typeof client.getOrderStatus === 'function';
        const hasGetStatus = client && typeof client.getStatus === 'function';
        
        if (!client || (!hasGetOrderStatus && !hasGetStatus)) {
            console.error('PhonePe client initialized but missing required methods:', {
                clientExists: !!client,
                hasGetOrderStatus,
                hasGetStatus,
                clientKeys: client ? Object.keys(client) : 'NO_CLIENT'
            });
            return null;
        }
        
        console.log('PhonePe client initialized successfully with required methods');
        return client;
    } catch (initError) {
        console.error('PhonePe client initialization failed:', initError);
        console.error('Initialization error details:', {
            message: initError.message,
            stack: initError.stack,
            config: {
                merchant_id: phonepe.merchant_id ? 'SET' : 'MISSING',
                api_key: phonepe.api_key ? 'SET' : 'MISSING',
                salt_index: phonepe.salt_index,
                env: phonepe.env
            }
        });
        return null;
    }
};

// Helper function to update product stock (reserve or restore)
const updateProductStock = async (items) => {
    const { batchChangeStock } = await import('../utils/stock.js');
    
    try {
        const operations = items.map(item => ({
            productId: item._id,
            size: item.size,
            quantityChange: -item.quantity
        }));
        
        const results = await batchChangeStock(operations);
        console.log('Stock updated successfully for payment session:', results);
        return results;
    } catch (error) {
        console.error('Stock update failed for payment session:', error);
        throw new Error(`Stock update failed: ${error.message}`);
    }
};

// Helper function to restore product stock (for failed payments)
const restoreProductStock = async (items) => {
    const { batchChangeStock, validateStockForItems } = await import('../utils/stock.js');
    
    try {
        // First validate the items to ensure they exist
        console.log('Validating items before stock restoration:', items);
        const validations = await validateStockForItems(items);
        const invalidItems = validations.filter(v => !v.available);
        
        if (invalidItems.length > 0) {
            console.error('Some items failed validation for stock restoration:', invalidItems);
            throw new Error(`Invalid items for stock restoration: ${invalidItems.map(i => i.error).join(', ')}`);
        }

        // Map items to stock operations
        const operations = items.map(item => {
            const productId = item.productId || item._id; // Handle both formats
            if (!productId) {
                throw new Error(`Missing product ID for item: ${JSON.stringify(item)}`);
            }
            return {
                productId,
                size: item.size,
                quantityChange: item.quantity // Positive for restoration
            };
        });
        
        console.log('Attempting stock restoration with operations:', operations);
        
        const results = await batchChangeStock(operations);
        console.log('Stock restored successfully:', {
            operations,
            results,
            itemCount: items.length,
            totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
        });
        
        return results;
    } catch (error) {
        console.error('Stock restoration failed:', {
            error: error.message,
            stack: error.stack,
            items: items.map(item => ({
                productId: item.productId || item._id,
                size: item.size,
                quantity: item.quantity
            }))
        });
        throw new Error(`Stock restoration failed: ${error.message}`);
    }
};

// Helper to clean mobile number for PhonePe (10 digits, no country code)
function cleanMobileNumber(number) {
  if (!number) return '';
  const digits = number.replace(/\D/g, '');
  return digits.slice(-10);
}

// Create PhonePe payment session using SDK
export const createPhonePeSession = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${correlationId}] Creating PhonePe payment session`);
    
    const { checkoutSessionId, shipping, cartItems, orderSummary, userId, email, checkoutMode } = req.body;
    
    if (!checkoutSessionId) {
      return res.status(400).json({
        success: false,
        message: 'Checkout session ID is required'
      });
    }
    
    // Get checkout session
    const checkoutSession = await CheckoutSession.findOne({ sessionId: checkoutSessionId });
    if (!checkoutSession) {
      return res.status(404).json({
        success: false,
        message: 'Checkout session not found'
      });
    }
    
    if (checkoutSession.isExpired()) {
      return res.status(410).json({
        success: false,
        message: 'Checkout session has expired'
      });
    }
    
    // 🔧 CRITICAL FIX: Reserve stock when creating payment session
    if (!checkoutSession.stockReserved) {
      console.log(`[${correlationId}] Reserving stock for session ${checkoutSessionId}`);
      
      try {
        // Import stock utils
        const { reserveStock, checkStockAvailability } = await import('../utils/stock.js');
        
        // First check if stock is available
        for (const item of checkoutSession.items) {
          const availability = await checkStockAvailability(item.productId, item.size, item.quantity);
          if (!availability.available) {
            console.error(`[${correlationId}] Stock not available for ${item.name}:`, availability);
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${item.name} (${item.size}). Available: ${availability.availableStock}, Requested: ${item.quantity}`
            });
          }
        }
        
        // Now reserve stock for each item
        
        // Reserve stock for each item
        for (const item of checkoutSession.items) {
          console.log(`[${correlationId}] Reserving stock for ${item.name} (${item.size}) x${item.quantity}`);
          const reserved = await reserveStock(item.productId, item.size, item.quantity);
          if (!reserved) {
            console.error(`[${correlationId}] Failed to reserve stock for ${item.name}`);
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${item.name} (${item.size})`
            });
          }
        }
        
        // Mark session as having reserved stock
        checkoutSession.stockReserved = true;
        await checkoutSession.save();
        console.log(`[${correlationId}] Stock reserved successfully`);
      } catch (error) {
        console.error(`[${correlationId}] Error reserving stock:`, error);
        return res.status(500).json({
          success: false,
          message: 'Failed to reserve stock',
          error: error.message
        });
      }
    }
    
    const userEmail = email || checkoutSession.userEmail;
    console.log(`[${correlationId}] User email:`, userEmail);
    
    // 🔑 NEW: Stock is already reserved, so we don't need to validate again
    // The reservation system ensures stock availability
    console.log(`[${correlationId}] Stock already reserved for session, proceeding with payment`);
    
    // Generate unique transaction ID and prepare data
    const phonepeTransactionId = randomUUID();
    const orderId = await getUniqueOrderId();
    
    // 🔑 CRITICAL FIX: Only create payment session, NOT the order yet
    // Order will be created only after successful payment verification
    let paymentSession;

    // Prepare payment session data (order data will be created later on payment success)
    const paymentSessionData = {
      sessionId: checkoutSessionId,
      phonepeTransactionId,
      userId: checkoutSession.userId,
      userEmail,
      orderData: {
        amount: checkoutSession.total,
        shipping: {
          ...shipping,
          addressLine2: shipping.addressLine2 || '',
          country: shipping.country || 'India'
        },
        cartItems: checkoutSession.items
      },
      status: 'pending',
      stockReserved: true, // Stock is already reserved
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        checkoutSource: checkoutSession.source,
        correlationId
      }
    };

    // 🔍 DEBUG: Log checkout session items to see if size is present
    console.log(`[${correlationId}] Checkout session items:`, JSON.stringify(checkoutSession.items, null, 2));
    
    // Prepare order data for later creation (only on payment success)
    const orderPayload = {
      orderId,
      userInfo: {
        userId: checkoutSession.userId,
        email: userEmail,
        name: shipping.fullName,
        phone: shipping.phone
      },
      shippingInfo: {
        fullName: shipping.fullName,
        email: userEmail,
        phone: shipping.phone,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || '',
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.postalCode,
        country: shipping.country || 'India'
      },
      // 🔧 CRITICAL FIX: Set multiple amount fields for frontend compatibility
      cartItems: checkoutSession.items,
      items: checkoutSession.items, // Legacy compatibility
      totalAmount: checkoutSession.total,
      total: checkoutSession.total, // Additional field
      totalPrice: checkoutSession.total, // Legacy compatibility
      amount: checkoutSession.total, // Legacy compatibility
      subtotal: checkoutSession.subtotal,
      shippingCost: checkoutSession.shippingCost || 0,
      // 🔧 FIX: Pass offer details from checkout session to order
      offerDetails: checkoutSession.offerDetails || {
        offerApplied: false,
        offerType: null,
        offerDiscount: 0,
        offerDescription: null,
        offerCalculation: {
          completeSets: 0,
          remainingItems: 0,
          originalPrice: 0,
          offerPrice: 0,
          savings: 0
        }
      },
      status: 'Pending',
      orderStatus: 'Pending',
      paymentStatus: 'Pending',
      paymentMethod: 'PhonePe',
      phonepeTransactionId,
      stockConfirmed: false, // Stock will be confirmed on payment success
      metadata: {
        checkoutSessionId,
        correlationId,
        source: checkoutSession.source
      }
    };

    // Store order payload in payment session for later creation
    paymentSessionData.orderPayload = orderPayload;

    // 🔍 DEBUG: Log order payload that will be created on payment success
    console.log(`[${correlationId}] Order payload prepared for payment success:`, JSON.stringify(orderPayload, null, 2));

    // Execute database operations (NO ORDER CREATION YET)
    try {
      paymentSession = await PaymentSession.create(paymentSessionData);
      
      // Update checkout session with transaction ID
      await CheckoutSession.findByIdAndUpdate(checkoutSession._id, {
        orderId,
        phonepeTransactionId,
        status: 'awaiting_payment'
      });

      if (!paymentSession) {
        throw new Error('Failed to create payment session');
      }

      console.log(`[${correlationId}] Payment session created successfully, order will be created on payment success`);

    } catch (error) {
      console.error(`[${correlationId}] Database operations failed:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment session',
        error: error.message
      });
    }

    // Initialize PhonePe client and create payment request in parallel
    // 🔑 CRITICAL FIX: The redirect URL MUST contain the transaction ID for the frontend to verify the payment.
    const redirectUrl = `${process.env.FRONTEND_URL || 'https://shithaa.in'}/payment/phonepe/callback?merchantTransactionId=${phonepeTransactionId}`;
    const callbackUrl = `${process.env.VPS_BASE_URL || 'https://shithaa.in'}/api/payment/phonepe/webhook`;
    
    // Calculate final amount including shipping
    const finalAmount = checkoutSession.total; // total already includes shipping from checkout session
    console.log('🔍 DEBUG: Payment amount calculation:', {
      subtotal: checkoutSession.subtotal,
      shipping: checkoutSession.shippingCost,
      total: checkoutSession.total,
      finalAmount: finalAmount,
      offerDetails: checkoutSession.offerDetails,
      discount: checkoutSession.discount
    });

    // Convert amount to paise (1 rupee = 100 paise)
    const amountInPaise = Math.round(finalAmount * 100);
    
    console.log('🔍 DEBUG: Converting amount to paise:', {
      finalAmountRupees: finalAmount,
      amountInPaise: amountInPaise
    });

    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(phonepeTransactionId)
      .amount(amountInPaise)
      .redirectUrl(redirectUrl)
      // .callbackUrl(callbackUrl) // 🔑 FIX: This method does not exist in the SDK and was causing the crash. The callback is set in the PhonePe dashboard.
      .build();

    // Get PhonePe client instance (cached singleton)
    const phonepeClient = initializePhonePeClient();
    if (!phonepeClient) {
      return res.status(500).json({
        success: false,
        message: 'Payment service not available',
        error: 'PhonePe client initialization failed - check environment variables'
      });
    }

    try {
      const response = await phonepeClient.pay(request);
      
      if (response && response.redirectUrl) {
        // Update payment session with PhonePe response
        await PaymentSession.findByIdAndUpdate(paymentSession._id, {
          'phonepeResponse.redirectUrl': response.redirectUrl,
          'phonepeResponse.merchantOrderId': phonepeTransactionId,
          'phonepeResponse.responseCode': response.code || 'SUCCESS',
          'phonepeResponse.responseMessage': response.message || 'Payment session created'
        });

        return res.json({
          success: true,
          sessionId: checkoutSessionId,
          phonepeTransactionId: phonepeTransactionId,
          redirectUrl: response.redirectUrl
        });
      } else {
        await PaymentSession.findByIdAndUpdate(paymentSession._id, {
          'phonepeResponse.responseCode': 'FAILED',
          'phonepeResponse.responseMessage': 'PhonePe response missing redirectUrl'
        });
        
        return res.status(400).json({
          success: false,
          message: 'Failed to create payment session',
          phonepeError: response
        });
      }
    } catch (error) {
      console.error(`[${correlationId}] PhonePe payment creation failed:`, error);
      
      // 롤백: Release the stock reservation on PhonePe API failure
      if (paymentSession) {
        console.log(`[${correlationId}] Releasing stock due to PhonePe API failure.`);
        await releaseStockOnPaymentFailure(paymentSession, correlationId);
      }

      console.error('Amount details:', {
        finalAmount,
        amountInPaise,
        checkoutSession: {
          subtotal: checkoutSession.subtotal,
          shipping: checkoutSession.shippingCost,
          total: checkoutSession.total
        }
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment',
        error: error.message
      });
    }
  } catch (error) {
    console.error(`[${correlationId}] === PhonePe SDK Session Creation Error ===`);
    console.error(`[${correlationId}] Error details:`, error);
    console.error(`[${correlationId}] Error stack:`, error.stack);
    console.error(`[${correlationId}] Error message:`, error.message);
    
    res.status(500).json({
      success: false,
      message: 'Payment session creation failed',
      error: error.message
    });
  }
};

// PhonePe payment callback using SDK - ATOMIC VERSION
export const phonePeCallback = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${correlationId}] PhonePe callback received:`, req.body);
    
    const { merchantTransactionId, state, responseCode, responseMessage } = req.body;
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing merchant transaction ID'
      });
    }

    // Find the payment session by PhonePe transaction ID
    const paymentSession = await PaymentSession.findOne({ phonepeTransactionId: merchantTransactionId });
    
    if (!paymentSession) {
      console.error('Payment session not found for PhonePe transaction:', merchantTransactionId);
      return res.status(404).json({
        success: false,
        message: 'Payment session not found'
      });
    }

    console.log('Found payment session:', paymentSession._id, 'Status:', paymentSession.status);

    // 🔧 CRITICAL FIX: Check for both success and explicit failure states
    const isSuccess = (
      state === 'PAID' ||
      state === 'COMPLETED' ||
      responseCode === 'SUCCESS' ||
      responseCode === '000'
    );
    
    // Check for explicit failure or timeout
    const isFailedOrAbandoned = (
      state === 'FAILED' ||
      state === 'CANCELLED' ||
      state === 'TIMEOUT' ||
      responseCode === 'PAYMENT_ERROR' ||
      responseCode === 'PAYMENT_CANCELLED' ||
      responseCode === 'PAYMENT_TIMEOUT' ||
      // If we get any response and it's not success, treat it as failure
      (!isSuccess && (state || responseCode))
    );

    if (isSuccess) {
      console.log('Payment successful, processing atomic transaction');
      
      // Track successful payment
      trackPayment(true);

      // 🔑 CRITICAL FIX: ATOMIC TRANSACTION - All operations in one transaction
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          // 1. Check if order already exists (idempotency check)
          const existingOrder = await orderModel.findOne({ 
            phonepeTransactionId: merchantTransactionId 
          }).session(session);
          
          if (existingOrder) {
            console.log(`[${correlationId}] Order already exists for transaction ${merchantTransactionId}, skipping creation`);
            return existingOrder;
          }

          // 2. Validate payment session data
          const orderPayload = paymentSession.orderPayload;
        if (!orderPayload) {
          throw new Error('Order payload is missing from payment session');
        }
        
          // 3. Prepare order data
        orderPayload.paymentStatus = 'paid';
        orderPayload.orderStatus = 'Pending';
        orderPayload.status = 'Pending';
        orderPayload.paidAt = new Date();
        orderPayload.phonepeResponse = req.body;
          orderPayload.stockConfirmed = false; // Will be set to true after stock confirmation

          // 4. Create order atomically
          const order = await orderModel.create([orderPayload], { session });
          const createdOrder = order[0];
          console.log(`[${correlationId}] Order created atomically:`, createdOrder.orderId);

          // 5. Confirm stock reservation atomically (deduct stock)
          const { confirmStockReservation } = await import('../utils/stock.js');
          const itemsToProcess = createdOrder.cartItems && createdOrder.cartItems.length > 0 
            ? createdOrder.cartItems 
            : createdOrder.items;

          if (!itemsToProcess || itemsToProcess.length === 0) {
            throw new Error('Order has no items to process');
          }

          // Process each item atomically
          for (const item of itemsToProcess) {
            const productId = item.productId || item._id || item.id || item.product;
            
            if (!productId || !item.size || !item.quantity) {
              throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
            }

            console.log(`[${correlationId}] Confirming stock for:`, item.name, 'Product:', productId, 'Size:', item.size, 'Qty:', item.quantity);
            
            const stockConfirmed = await confirmStockReservation(
              productId, 
              item.size, 
              item.quantity, 
              { session }
            );
            
            if (!stockConfirmed) {
              throw new Error(`Stock confirmation failed for ${item.name} (${item.size}) - insufficient stock or reservation`);
            }
          }

          // 6. Mark order as stock confirmed
          await orderModel.findByIdAndUpdate(
            createdOrder._id, 
            { 
              stockConfirmed: true,
              stockConfirmedAt: new Date(),
              updatedAt: new Date()
            },
            { session }
          );

          // 7. Update payment session status
          await PaymentSession.findByIdAndUpdate(
            paymentSession._id,
            {
              status: 'success',
              orderId: createdOrder._id,
              phonepeResponse: req.body
            },
            { session }
          );

          console.log(`[${correlationId}] Atomic transaction completed successfully for order:`, createdOrder.orderId);
          return createdOrder;
        });

        // Get the created order for response
        const order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });
        
        // Clear user's cart (non-blocking - outside transaction)
        if (order.userId) {
          try {
            const { userModel } = await import('../models/userModel.js');
            await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
            console.log('User cart cleared successfully');
          } catch (cartError) {
            console.error('Failed to clear user cart:', cartError);
          }
        }
        
        // Generate and send invoice PDF via email (non-blocking - outside transaction)
        try {
          const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
          const pdfBuffer = await generateInvoiceBuffer(order);
          await sendInvoiceEmail(order, pdfBuffer);
          console.log('Invoice email sent successfully');
        } catch (err) {
          console.error('Invoice email error:', err);
        }

        // Determine redirect URL for successful payment
        const redirectUrl = `${process.env.FRONTEND_URL || 'https://shithaa.in'}/order-success?orderId=${order.orderId}`;

        res.json({
          success: true,
          message: 'Payment successful',
          orderId: order._id,
          redirectUrl
        });

      } catch (transactionError) {
        console.error(`[${correlationId}] Atomic transaction failed:`, transactionError);
        
        // Check if it's a replica set error
        if (transactionError.message && transactionError.message.includes('Transaction numbers are only allowed on a replica set')) {
          console.log(`[${correlationId}] MongoDB not configured as replica set, falling back to non-transactional approach`);
          await session.endSession();
          
          try {
            // Fallback: Non-transactional approach
            const order = await processPaymentWithoutTransaction(paymentSession, merchantTransactionId, correlationId, req.body);
        
        // Clear user's cart (non-blocking)
        if (order.userId) {
          try {
            const { userModel } = await import('../models/userModel.js');
            await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
            console.log('User cart cleared successfully');
          } catch (cartError) {
            console.error('Failed to clear user cart:', cartError);
          }
        }
        
        // Generate and send invoice PDF via email (non-blocking)
        try {
          const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
          const pdfBuffer = await generateInvoiceBuffer(order);
          await sendInvoiceEmail(order, pdfBuffer);
          console.log('Invoice email sent successfully');
        } catch (err) {
          console.error('Invoice email error:', err);
        }

        // Determine redirect URL for successful payment
        const redirectUrl = `${process.env.FRONTEND_URL || 'https://shithaa.in'}/order-success?orderId=${order.orderId}`;

            return res.json({
          success: true,
          message: 'Payment successful',
          orderId: order._id,
          redirectUrl
        });

          } catch (fallbackError) {
            console.error(`[${correlationId}] Fallback processing also failed:`, fallbackError);
            
            // Update payment session to failed
            await PaymentSession.findByIdAndUpdate(paymentSession._id, {
              status: 'failed',
              error: fallbackError.message,
              phonepeResponse: req.body
            });
        
        return res.status(500).json({
          success: false,
              message: 'Payment processing failed. Please contact support.',
              error: fallbackError.message
            });
          }
        } else {
          // Other transaction errors - update payment session to failed
          await PaymentSession.findByIdAndUpdate(paymentSession._id, {
            status: 'failed',
            error: transactionError.message,
            phonepeResponse: req.body
          });
          
          return res.status(500).json({
            success: false,
            message: 'Payment processing failed. Please contact support.',
            error: transactionError.message
          });
        }
      } finally {
        await session.endSession();
      }

    } else if (isFailedOrAbandoned) {
      console.log('Payment failed or abandoned, releasing stock');
      
      // Track failed payment
      trackPayment(false);
      
      // Update payment session status to failed
      paymentSession.status = 'failed';
      paymentSession.phonepeResponse = req.body;
      paymentSession.failedAt = new Date();
      await paymentSession.save();
      
      // 🔑 CRITICAL: Release reserved stock on payment failure
      await releaseStockOnPaymentFailure(paymentSession, correlationId);

      // Determine redirect URL for failed payment
      const redirectUrl = `${process.env.FRONTEND_URL || 'https://shithaa.in'}/payment-failed`;

      res.json({
        success: false,
        message: 'Payment failed',
        redirectUrl
      });
    }
  } catch (error) {
    console.error('PhonePe Callback Error:', error);
    res.status(500).json({
      success: false,
      message: 'Callback processing failed',
      error: error.message
    });
  }
};

// Verify PhonePe payment status using SDK - ATOMIC VERSION
export const verifyPhonePePayment = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { merchantTransactionId } = req.params;
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant transaction ID is required',
        data: null
      });
    }

    console.log('Verifying PhonePe payment for transaction:', merchantTransactionId);

    // Find the payment session by PhonePe transaction ID
    const paymentSession = await PaymentSession.findOne({ phonepeTransactionId: merchantTransactionId });
    
    if (!paymentSession) {
      return res.status(404).json({
        success: false,
        message: 'Payment session not found for this transaction',
        data: null
      });
    }

    // Check if order already exists (idempotency check)
    let order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });

    // Initialize PhonePe client
    const phonePeClient = await initializePhonePeClient();
    
    if (!phonePeClient) {
      console.error('PhonePe client initialization failed - cannot verify payment');
      return res.status(500).json({
        success: false,
        message: 'Payment verification service unavailable',
        error: 'PhonePe client not initialized',
        data: null
      });
    }
    
    // Check payment status
    let paymentStatus;
    try {
        if (typeof phonePeClient.getOrderStatus === 'function') {
            paymentStatus = await phonePeClient.getOrderStatus(merchantTransactionId);
        } else if (typeof phonePeClient.getStatus === 'function') {
            paymentStatus = await phonePeClient.getStatus(merchantTransactionId);
        } else {
            console.error('PhonePe client missing both getOrderStatus and getStatus methods');
            return res.status(500).json({
                success: false,
                message: 'Payment verification failed - PhonePe client method not found',
                error: 'Missing getOrderStatus/getStatus method',
                data: null
            });
        }
        
        console.log('PhonePe payment status:', paymentStatus);
        
        if (!paymentStatus) {
            console.error('PhonePe returned null/undefined payment status');
            return res.status(500).json({
                success: false,
                message: 'Payment verification failed - no status received from PhonePe',
                error: 'Null payment status',
                data: null
            });
        }
    } catch (statusError) {
        console.error('PhonePe getOrderStatus/getStatus failed:', statusError);
        return res.status(500).json({
            success: false,
            message: 'Payment verification failed - PhonePe API error',
            error: statusError.message,
            data: null
        });
    }

    const isSuccess = (
      paymentStatus.state === 'PAID' ||
      paymentStatus.state === 'COMPLETED' ||
      paymentStatus.responseCode === 'SUCCESS' ||
      paymentStatus.responseCode === '000'
    );

    // 🔑 CRITICAL FIX: If payment is successful, create order atomically if it doesn't exist
    if (isSuccess) {
      if (!order) {
        console.log(`[${correlationId}] Creating order atomically from payment session ${paymentSession._id} (webhook was slow).`);
        
        const session = await mongoose.startSession();
        
        try {
          await session.withTransaction(async () => {
            // Double-check order doesn't exist (race condition protection)
            const existingOrder = await orderModel.findOne({ 
              phonepeTransactionId: merchantTransactionId 
            }).session(session);
            
            if (existingOrder) {
              console.log(`[${correlationId}] Order already exists in transaction, skipping creation`);
              return existingOrder;
            }

          // Create order from payment session data
          const orderPayload = paymentSession.orderPayload;
          
          if (!orderPayload) {
            throw new Error('Order payload is missing from payment session');
          }
          
          orderPayload.paymentStatus = 'paid';
          orderPayload.orderStatus = 'Pending';
          orderPayload.status = 'Pending';
          orderPayload.paidAt = new Date();
          orderPayload.phonepeResponse = paymentStatus;
            orderPayload.stockConfirmed = false;

            // Create order atomically
            const orderResult = await orderModel.create([orderPayload], { session });
            const createdOrder = orderResult[0];
            console.log(`[${correlationId}] Order created atomically from verify:`, createdOrder.orderId);

            // Confirm stock reservation atomically
            const { confirmStockReservation } = await import('../utils/stock.js');
            const itemsToProcess = createdOrder.cartItems && createdOrder.cartItems.length > 0 
              ? createdOrder.cartItems 
              : createdOrder.items;

            if (!itemsToProcess || itemsToProcess.length === 0) {
              throw new Error('Order has no items to process');
            }

            // Process each item atomically
            for (const item of itemsToProcess) {
              const productId = item.productId || item._id || item.id || item.product;
              
              if (!productId || !item.size || !item.quantity) {
                throw new Error(`Invalid item data: ${JSON.stringify(item)}`);
              }

              const stockConfirmed = await confirmStockReservation(
                productId, 
                item.size, 
                item.quantity, 
                { session }
              );
              
              if (!stockConfirmed) {
                throw new Error(`Stock confirmation failed for ${item.name} (${item.size})`);
              }
            }

            // Mark order as stock confirmed
            await orderModel.findByIdAndUpdate(
              createdOrder._id, 
              { 
                stockConfirmed: true,
                stockConfirmedAt: new Date(),
                updatedAt: new Date()
              },
              { session }
            );

            // Update payment session
            await PaymentSession.findByIdAndUpdate(
              paymentSession._id,
              {
                orderId: createdOrder._id,
                status: 'success',
                phonepeResponse: paymentStatus
              },
              { session }
            );

            return createdOrder;
          });

          // Get the created order
          order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });

          // Clear user's cart (non-blocking)
          if (order.userId) {
            try {
              const { userModel } = await import('../models/userModel.js');
              await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
              console.log('User cart cleared successfully');
            } catch (cartError) {
              console.error('Failed to clear user cart:', cartError);
            }
          }

          // Send invoice email (non-blocking)
          try {
            const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
            generateInvoiceBuffer(order)
              .then(pdfBuffer => sendInvoiceEmail(order, pdfBuffer))
              .catch(err => console.error('Error sending invoice from verify endpoint:', err));
          } catch (err) {
            console.error('Error preparing invoice from verify endpoint:', err);
          }

        } catch (transactionError) {
          console.error(`[${correlationId}] Atomic transaction failed in verify:`, transactionError);
          
          // Check if it's a replica set error
          if (transactionError.message && transactionError.message.includes('Transaction numbers are only allowed on a replica set')) {
            console.log(`[${correlationId}] MongoDB not configured as replica set, falling back to non-transactional approach in verify`);
            await session.endSession();
            
            try {
              // Fallback: Non-transactional approach
              order = await processPaymentWithoutTransaction(paymentSession, merchantTransactionId, correlationId, paymentStatus);

          // Clear user's cart (non-blocking)
          if (order.userId) {
            try {
              const { userModel } = await import('../models/userModel.js');
              await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
              console.log('User cart cleared successfully');
            } catch (cartError) {
              console.error('Failed to clear user cart:', cartError);
            }
          }

          // Send invoice email (non-blocking)
          try {
            const { generateInvoiceBuffer, sendInvoiceEmail } = await import('../utils/invoiceGenerator.js');
            generateInvoiceBuffer(order)
              .then(pdfBuffer => sendInvoiceEmail(order, pdfBuffer))
              .catch(err => console.error('Error sending invoice from verify endpoint:', err));
          } catch (err) {
            console.error('Error preparing invoice from verify endpoint:', err);
          }
              
            } catch (fallbackError) {
              console.error(`[${correlationId}] Fallback processing also failed in verify:`, fallbackError);
              
              // Update payment session to failed
              await PaymentSession.findByIdAndUpdate(paymentSession._id, {
                status: 'failed',
                error: fallbackError.message,
                phonepeResponse: paymentStatus
              });
              
              return res.status(500).json({
                success: false,
                message: 'Order creation failed during verification',
                error: fallbackError.message,
                data: null
              });
        }
      } else {
            // Other transaction errors - update payment session to failed
            await PaymentSession.findByIdAndUpdate(paymentSession._id, {
              status: 'failed',
              error: transactionError.message,
              phonepeResponse: paymentStatus
            });
            
            return res.status(500).json({
              success: false,
              message: 'Order creation failed during verification',
              error: transactionError.message,
              data: null
            });
          }
        } finally {
          await session.endSession();
        }
      } else {
        console.log(`[${correlationId}] Order already exists for payment session ${paymentSession._id}`);
      }
    } else {
      // Payment failed - update payment session status and release stock
      if (paymentSession.status !== 'failed') {
        console.log(`[${correlationId}] Payment failed, updating session and releasing stock`);
        
        // Find checkout session first
        const checkoutSession = await CheckoutSession.findOne({ sessionId: paymentSession.sessionId });
        console.log(`[${correlationId}] DEBUG: Found checkout session:`, {
          exists: !!checkoutSession,
          sessionId: checkoutSession?.sessionId,
          status: checkoutSession?.status,
          stockReserved: checkoutSession?.stockReserved
        });
        
        if (checkoutSession && checkoutSession.stockReserved) {
          console.log(`[${correlationId}] Found checkout session with reserved stock, releasing...`);
          
          // Release stock for each item
          for (const item of checkoutSession.items) {
            try {
              await releaseStockReservation(item.productId, item.size, item.quantity);
              console.log(`[${correlationId}] Released stock for ${item.name} (${item.size}) x${item.quantity}`);
            } catch (error) {
              console.error(`[${correlationId}] Failed to release stock for item:`, error);
            }
          }
          
          // Mark session as failed and stock as released
          try {
            checkoutSession.status = 'failed';
            checkoutSession.stockReserved = false;
            await checkoutSession.save();
            console.log(`[${correlationId}] Checkout session marked as failed and stock released`);
          } catch (error) {
            console.error(`[${correlationId}] Failed to update checkout session:`, error);
          }
        } else {
          console.log(`[${correlationId}] No checkout session found or no stock reserved`);
          
          // Try to find by other fields
          const altCheckoutSession = await CheckoutSession.findOne({
            $or: [
              { phonepeTransactionId: merchantTransactionId },
              { 'metadata.phonepeTransactionId': merchantTransactionId }
            ]
          });
          
          console.log(`[${correlationId}] DEBUG: Alternative checkout session search:`, {
            found: !!altCheckoutSession,
            sessionId: altCheckoutSession?.sessionId,
            status: altCheckoutSession?.status,
            stockReserved: altCheckoutSession?.stockReserved
          });
          
          if (altCheckoutSession && altCheckoutSession.stockReserved) {
            console.log(`[${correlationId}] Found checkout session by transaction ID, releasing stock...`);
            try {
              for (const item of altCheckoutSession.items) {
                await releaseStockReservation(item.productId, item.size, item.quantity);
              }
              altCheckoutSession.status = 'failed';
              altCheckoutSession.stockReserved = false;
              await altCheckoutSession.save();
            } catch (error) {
              console.error(`[${correlationId}] Failed to process alternative checkout session:`, error);
            }
          }
        }
        
        // Update payment session status
        try {
          paymentSession.status = 'failed';
          paymentSession.phonepeResponse = paymentStatus;
          paymentSession.failedAt = new Date();
          await paymentSession.save();
          console.log(`[${correlationId}] Payment session marked as failed`);
        } catch (error) {
          console.error(`[${correlationId}] Failed to update payment session:`, error);
        }
      }
    }

    return res.json({
      success: true,
      data: {
        orderId: order?._id || null,
        orderStatus: order?.orderStatus || (isSuccess ? 'Pending' : 'Failed'),
        paymentStatus: order?.paymentStatus || (isSuccess ? 'paid' : 'failed'),
        state: paymentStatus?.state || paymentStatus?.status,
        code: paymentStatus?.responseCode || paymentStatus?.code,
        status: paymentStatus?.state || paymentStatus?.status,
        paymentState: paymentStatus?.state || paymentStatus?.status,
        message: paymentStatus?.responseMessage || paymentStatus?.message,
        amount: paymentStatus?.amount ? paymentStatus.amount / 100 : null,
        transactionId: paymentStatus?.transactionId || paymentStatus?.orderId,
        phonepeResponse: paymentStatus
      },
      isSuccess
    });

  } catch (error) {
    console.error('PhonePe verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
      data: null
    });
  }
};

// Function removed - Order is now created upfront in createPhonePeSession
// This ensures the order exists when the webhook arrives, fixing the data persistence issue

// Dummy payment endpoint for testing invoice email
export const dummyPaymentSuccess = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Order ID required' });
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Mark as paid
    order.payment = true;
    order.paymentStatus = 'paid';
    order.orderStatus = 'Pending';
    order.status = 'Pending';
    await order.save();
    // Generate and send invoice
    try {
      const pdfBuffer = await generateInvoiceBuffer(order);
      await sendInvoiceEmail(order, pdfBuffer);
    } catch (err) {
      console.error('Invoice email error (dummy):', err);
    }
    res.json({ success: true, message: 'Dummy payment processed and invoice sent.' });
  } catch (err) {
    console.error('Dummy payment error:', err);
    res.status(500).json({ success: false, message: 'Dummy payment failed', error: err.message });
  }
}; 

/**
 * Get payment status for a checkout session
 */
export const getPaymentStatus = async (req, res) => {
  const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }
    
    // Find checkout session
    const checkoutSession = await CheckoutSession.findOne({ sessionId });
    if (!checkoutSession) {
      return errorResponse(res, 404, 'Checkout session not found');
    }
    
    // Check if session is expired
    if (checkoutSession.isExpired()) {
      return successResponse(res, {
        status: 'expired',
        message: 'Checkout session has expired',
        sessionId
      });
    }
    
    // If we have a PhonePe transaction ID, check payment status
    if (checkoutSession.phonepeTransactionId) {
      const paymentSession = await PaymentSession.findOne({ 
        phonepeTransactionId: checkoutSession.phonepeTransactionId 
      });
      
      if (paymentSession) {
        return successResponse(res, {
          status: paymentSession.status,
          message: `Payment ${paymentSession.status}`,
          sessionId,
          phonepeTransactionId: checkoutSession.phonepeTransactionId,
          paymentDetails: {
            redirectUrl: paymentSession.phonepeResponse?.redirectUrl,
            responseCode: paymentSession.phonepeResponse?.responseCode,
            responseMessage: paymentSession.phonepeResponse?.responseMessage
          }
        });
      }
    }
    
    // Return checkout session status
    return successResponse(res, {
      status: checkoutSession.status,
      message: `Checkout ${checkoutSession.status}`,
      sessionId,
      stockReserved: checkoutSession.stockReserved,
      expiresAt: checkoutSession.expiresAt
    });
    
  } catch (error) {
    console.error(`[${correlationId}] Error getting payment status:`, error);
    return errorResponse(res, 500, 'Failed to get payment status', error.message);
  }
}; 

/**
 * Get order by transaction id / payment id (robust search across possible fields)
 * Used by routes that expect getOrderByTransactionId to exist.
 */
export const getOrderByTransactionId = async (req, res) => {
  try {
    // transactionId can come from params, query, or body
    const transactionId =
      (req.params && req.params.transactionId) ||
      req.query?.transactionId ||
      req.body?.transactionId ||
      req.body?.phonepeTransactionId ||
      req.body?.paymentId;

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'missing_transaction_id' });
    }

    // Attempt common locations where transaction id might be stored
    const order = await orderModel.findOne({
      $or: [
        { paymentId: transactionId },
        { phonepeTransactionId: transactionId },
        { 'payments.transactionId': transactionId },
        { 'payment.transactionId': transactionId },
        { transactionId: transactionId }
      ]
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, error: 'order_not_found' });
    }

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('getOrderByTransactionId error', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
}; 

// Helper function moved to webhookController.js to avoid duplication 