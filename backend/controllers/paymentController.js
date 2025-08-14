import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import TempOrder from "../models/TempOrder.js";
import { successResponse, errorResponse } from '../utils/response.js';
import { getUniqueOrderId } from './orderController.js';
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from 'pg-sdk-node';
import { randomUUID } from 'crypto';
import { generateInvoiceBuffer, sendInvoiceEmail } from '../utils/invoiceGenerator.js';
import mongoose from 'mongoose';

// PhonePe SDK configuration
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const PHONEPE_API_KEY = process.env.PHONEPE_API_KEY;
const PHONEPE_SALT_INDEX = parseInt(process.env.PHONEPE_SALT_INDEX || '1', 10);
const PHONEPE_ENV = process.env.PHONEPE_ENV === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;

const phonepeClient = StandardCheckoutClient.getInstance(
  PHONEPE_MERCHANT_ID,
  PHONEPE_API_KEY,
  PHONEPE_SALT_INDEX,
  PHONEPE_ENV
);

// Helper function to get user email for orders
const getOrderUserEmail = (req, email) => {
    return req.user?.email || email || `guest@${process.env.BASE_URL?.replace('https://', '').replace('http://', '') || 'shithaa.in'}`;
};

// Helper function to update product stock
export const updateProductStock = async (items) => {
    for (const item of items) {
        const product = await productModel.findById(item._id);
        if (product) {
            const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
            if (sizeIndex !== -1) {
                product.sizes[sizeIndex].stock -= item.quantity;
                await product.save();
            }
        }
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
  try {
    const {
      amount,
      shipping,
      cartItems,
      userId,
      email
    } = req.body;

    if (!amount || !shipping || !cartItems || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Don't create order or deduct stock yet - wait for payment confirmation
    const userEmail = getOrderUserEmail(req, email);
    
    // Generate unique merchant order ID for PhonePe
    const merchantOrderId = randomUUID();
    
    // Store in temporary collection (we'll use a temporary collection)
    const tempOrderData = {
      userId: userId || (req.user && req.user.id),
      items: cartItems.map(item => ({
        _id: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        size: item.size
      })),
      shippingInfo: {
        fullName: shipping.fullName,
        email: shipping.email,
        phone: shipping.phone,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || '',
        city: shipping.city,
        state: shipping.state,
        postalCode: shipping.postalCode,
        country: shipping.country || 'India'
      },
      address: {
        line1: shipping.addressLine1 || shipping.street || '',
        line2: shipping.addressLine2 || '',
        city: shipping.city,
        state: shipping.state,
        pincode: shipping.postalCode || shipping.pincode || shipping.zipcode
      },
      amount: amount,
      paymentMethod: 'PhonePe',
      email: userEmail,
      userInfo: { email: userEmail },
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes expiry
    };

    // Store in temporary collection
    await TempOrder.create({
      merchantOrderId,
      orderData: tempOrderData,
      createdAt: tempOrderData.createdAt,
      expiresAt: tempOrderData.expiresAt
    });

    // Create PhonePe payment session
    const redirectUrl = `${process.env.PHONEPE_REDIRECT_URL || process.env.BASE_URL || 'https://shithaa.in'}/payment/phonepe/callback?merchantTransactionId=${merchantOrderId}`;
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount * 100) // paise
      .redirectUrl(redirectUrl)
      .build();

    const response = await phonepeClient.pay(request);
    if (response && response.redirectUrl) {
      return res.json({
        success: true,
        merchantTransactionId: merchantOrderId,
        redirectUrl: response.redirectUrl
      });
    } else {
      // Clean up temporary order data if payment session creation failed
      await TempOrder.deleteOne({ merchantOrderId });
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment session',
        phonepeError: response
      });
    }
  } catch (error) {
    console.error('PhonePe SDK Session Creation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment session creation failed',
      error: error.message
    });
  }
};

// PhonePe payment callback using SDK
export const phonePeCallback = async (req, res) => {
  try {
    console.log('PhonePe Callback received:', {
      headers: req.headers,
      body: req.body
    });

    // PhonePe sends callback with headers and body
    const authorizationHeaderData = req.headers['authorization'];
    const phonepeS2SCallbackResponseBodyString = JSON.stringify(req.body);
    // You may need to configure these in PhonePe dashboard
    const usernameConfigured = process.env.PHONEPE_CALLBACK_USERNAME || '';
    const passwordConfigured = process.env.PHONEPE_CALLBACK_PASSWORD || '';

    let callbackResponse;
    let merchantOrderId;
    let state;

    try {
      callbackResponse = phonepeClient.validateCallback(
        usernameConfigured,
        passwordConfigured,
        authorizationHeaderData,
        phonepeS2SCallbackResponseBodyString
      );
      console.log('PhonePe callback validation successful:', callbackResponse);
      merchantOrderId = callbackResponse.payload.orderId;
      state = callbackResponse.payload.state;
    } catch (err) {
      console.error('PhonePe callback validation failed:', err);
      
      // Try to extract orderId and state from raw body as fallback
      try {
        const rawBody = req.body;
        console.log('Trying to extract from raw body:', rawBody);
        
        if (rawBody && rawBody.payload) {
          merchantOrderId = rawBody.payload.orderId;
          state = rawBody.payload.state;
          console.log('Extracted from raw body - orderId:', merchantOrderId, 'state:', state);
        } else if (rawBody && rawBody.merchantOrderId) {
          merchantOrderId = rawBody.merchantOrderId;
          state = rawBody.state || 'COMPLETED'; // Assume success if no state
          console.log('Extracted from raw body (alt format) - orderId:', merchantOrderId, 'state:', state);
        } else if (rawBody && rawBody.merchantTransactionId) {
          merchantOrderId = rawBody.merchantTransactionId;
          state = rawBody.state || 'COMPLETED'; // Assume success if no state
          console.log('Extracted from raw body (transaction format) - orderId:', merchantOrderId, 'state:', state);
        }
      } catch (fallbackErr) {
        console.error('Fallback extraction failed:', fallbackErr);
        return res.status(400).json({
          success: false,
          message: 'Invalid callback signature and fallback failed',
          error: err.message
        });
      }
    }

    // Find temporary order data by merchantOrderId
    console.log('Looking for temporary order with merchantOrderId:', merchantOrderId);
    
    const tempOrder = await TempOrder.findOne({ merchantOrderId });
    if (!tempOrder) {
      console.error('Temporary order not found for merchantOrderId:', merchantOrderId);
      return res.status(404).json({
        success: false,
        message: 'Temporary order not found'
      });
    }

    // Check if temporary order has expired
    if (tempOrder.expiresAt < Date.now()) {
      console.log('Temporary order expired, cleaning up');
      await TempOrder.deleteOne({ merchantOrderId });
      return res.status(400).json({
        success: false,
        message: 'Order session expired'
      });
    }

    console.log('Found temporary order data, processing payment state:', state);

    // Handle different success states
    const isSuccess = (
      state === 'checkout.order.completed' ||
      state === 'COMPLETED' ||
      state === 'SUCCESS' ||
      state === 'PAYMENT_SUCCESS' ||
      state === 'SUCCESSFUL' ||
      state === 'PAID'
    );

    if (isSuccess) {
      console.log('Payment successful, creating actual order');
      
      // Deduct stock and create actual order
      await updateProductStock(tempOrder.orderData.items);
      const orderId = await getUniqueOrderId();
      
      const orderData = {
        ...tempOrder.orderData,
        phonepeTransactionId: merchantOrderId,
        payment: true,
        paymentStatus: 'paid',
        orderStatus: 'Confirmed',
        status: 'Order Placed',
        date: Date.now(),
        orderId
      };
      
      const newOrder = await orderModel.create(orderData);
      
      // Clear user's cart
      if (newOrder.userId) {
        await userModel.findByIdAndUpdate(newOrder.userId, { cartData: {} });
      }
      
      // Generate and send invoice PDF via email (non-blocking)
      try {
        const pdfBuffer = await generateInvoiceBuffer(newOrder);
        await sendInvoiceEmail(newOrder, pdfBuffer);
      } catch (err) {
        console.error('Invoice email error:', err);
      }
      
      // Clean up temporary order data
      await TempOrder.deleteOne({ merchantOrderId });
      
      console.log('Order created successfully:', newOrder._id);
      
      res.json({
        success: true,
        message: 'Payment successful',
        orderId: newOrder._id
      });
    } else {
      console.log('Payment failed, cleaning up temporary data');
      
      // Clean up temporary order data - no order created, no stock deducted
      await TempOrder.deleteOne({ merchantOrderId });
      
      res.json({
        success: false,
        message: 'Payment failed',
        orderId: null
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

// Verify PhonePe payment status using SDK
export const verifyPhonePePayment = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    console.log('Verification request for transaction:', merchantTransactionId);
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    // First check if we have a confirmed order in our database
    const order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });
    console.log('Confirmed order found:', order ? order._id : 'Not found');
    
    if (order) {
      console.log('Order payment status:', order.paymentStatus);
      console.log('Order order status:', order.orderStatus);

      // Try to get status from PhonePe SDK
      let phonepeResponse;
      try {
        console.log('Attempting PhonePe SDK verification...');
        phonepeResponse = await phonepeClient.getOrderStatus(merchantTransactionId);
        console.log('PhonePe SDK response:', phonepeResponse);
      } catch (sdkError) {
        console.error('PhonePe SDK Error:', sdkError);
      }

      // If we got response from PhonePe, use it
      if (phonepeResponse) {
        console.log('Using PhonePe SDK response');
        return res.json({
          success: true,
          data: phonepeResponse
        });
      }

      // Fallback to database status
      console.log('Using database fallback');
      return res.json({
        success: true,
        data: {
          code: order.paymentStatus === 'paid' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
          paymentState: order.paymentStatus === 'paid' ? 'COMPLETED' : 'FAILED',
          merchantTransactionId: merchantTransactionId,
          state: order.paymentStatus === 'paid' ? 'COMPLETED' : 'FAILED'
        }
      });
    }

    // If no confirmed order found, check for temporary order
    console.log('No confirmed order found, checking for temporary order...');
    const tempOrder = await TempOrder.findOne({ merchantOrderId: merchantTransactionId });
    
    if (tempOrder) {
      console.log('Temporary order found, payment still pending');
      
      // Check if temporary order has expired
      if (tempOrder.expiresAt < Date.now()) {
        console.log('Temporary order expired');
        await TempOrder.deleteOne({ merchantOrderId: merchantTransactionId });
        return res.json({
          success: true,
          data: {
            code: 'PAYMENT_EXPIRED',
            paymentState: 'EXPIRED',
            merchantTransactionId: merchantTransactionId,
            state: 'EXPIRED'
          }
        });
      }
      
      // Try to get status from PhonePe SDK
      try {
        console.log('Attempting PhonePe SDK verification for temporary order...');
        const phonepeResponse = await phonepeClient.getOrderStatus(merchantTransactionId);
        console.log('PhonePe SDK response for temp order:', phonepeResponse);
        
        if (phonepeResponse && phonepeResponse.state) {
          return res.json({
            success: true,
            data: phonepeResponse
          });
        }
      } catch (sdkError) {
        console.error('PhonePe SDK Error for temp order:', sdkError);
      }
      
      return res.json({
        success: true,
        data: {
          code: 'PAYMENT_PENDING',
          paymentState: 'PENDING',
          merchantTransactionId: merchantTransactionId,
          state: 'PENDING'
        }
      });
    }

    // No order found at all
    console.log('No order found for transaction:', merchantTransactionId);
    return res.status(404).json({
      success: false,
      message: 'Order not found for this transaction'
    });

  } catch (error) {
    console.error('PhonePe Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

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
    order.orderStatus = 'Confirmed';
    order.status = 'Order Placed';
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