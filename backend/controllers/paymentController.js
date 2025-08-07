import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import { successResponse, errorResponse } from '../utils/response.js';
import { getUniqueOrderId } from './orderController.js';
import { StandardCheckoutClient, Env, StandardCheckoutPayRequest } from 'pg-sdk-node';
import { randomUUID } from 'crypto';
import { generateInvoiceBuffer, sendInvoiceEmail } from '../utils/invoiceGenerator.js';

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
const updateProductStock = async (items) => {
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

    await updateProductStock(cartItems);
    const userEmail = getOrderUserEmail(req, email);
    const orderId = await getUniqueOrderId();

    // Create order in database
    const orderData = {
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
      payment: false,
      date: Date.now(),
      email: userEmail,
      userInfo: { email: userEmail },
      status: 'Pending',
      orderStatus: 'Pending',
      paymentStatus: 'pending',
      orderId
    };
    const newOrder = await orderModel.create(orderData);

    // Use SDK to create payment session
    const merchantOrderId = randomUUID();
    const redirectUrl = `${process.env.PHONEPE_REDIRECT_URL || process.env.BASE_URL || 'https://shithaa.in'}/payment/phonepe/callback`;
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount * 100) // paise
      .redirectUrl(redirectUrl)
      .build();

    const response = await phonepeClient.pay(request);
    if (response && response.redirectUrl) {
      // Save merchantOrderId to order for later status/callback
      await orderModel.findByIdAndUpdate(newOrder._id, {
        phonepeTransactionId: merchantOrderId
      });
      return res.json({
        success: true,
        orderId: newOrder._id,
        phonepeTransactionId: merchantOrderId,
        redirectUrl: response.redirectUrl
      });
    } else {
      // Restore stock and delete order if payment session creation failed
      await updateProductStock(cartItems.map(item => ({ ...item, quantity: -item.quantity })));
      await orderModel.findByIdAndDelete(newOrder._id);
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
    try {
      callbackResponse = phonepeClient.validateCallback(
        usernameConfigured,
        passwordConfigured,
        authorizationHeaderData,
        phonepeS2SCallbackResponseBodyString
      );
      console.log('PhonePe callback validation successful:', callbackResponse);
    } catch (err) {
      console.error('PhonePe callback validation failed:', err);
      return res.status(400).json({
        success: false,
        message: 'Invalid callback signature',
        error: err.message
      });
    }

    // Find order by merchantOrderId (orderId in callback payload)
    const merchantOrderId = callbackResponse.payload.orderId;
    const state = callbackResponse.payload.state;
    console.log('Looking for order with phonepeTransactionId:', merchantOrderId);
    
    const order = await orderModel.findOne({ phonepeTransactionId: merchantOrderId });
    if (!order) {
      console.error('Order not found for phonepeTransactionId:', merchantOrderId);
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('Found order:', order._id, 'Current state:', state);

    // Always save the full callback payload as paymentLog
    const paymentLog = req.body;
    let update = {
      paymentLog,
      phonepeTransactionId: merchantOrderId,
      updatedAt: new Date()
    };

    // Handle different success states
    const isSuccess = (
      state === 'checkout.order.completed' ||
      state === 'COMPLETED' ||
      state === 'SUCCESS'
    );

    if (isSuccess) {
      console.log('Payment successful, updating order status');
      update = {
        ...update,
        payment: true,
        paymentStatus: 'paid',
        orderStatus: 'Confirmed',
        status: 'Order Placed',
      };
      
      if (order.userId) {
        await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
      }
      
      // Generate and send invoice PDF via email (non-blocking)
      try {
        const freshOrder = await orderModel.findById(order._id); // get latest
        const pdfBuffer = await generateInvoiceBuffer(freshOrder);
        await sendInvoiceEmail(freshOrder, pdfBuffer);
      } catch (err) {
        console.error('Invoice email error:', err);
      }
    } else {
      console.log('Payment failed, updating order status');
      update = {
        ...update,
        paymentStatus: 'failed',
        orderStatus: 'Failed',
        status: 'Payment Failed',
      };
      
      // Restore product stock
      for (const item of order.items) {
        const product = await productModel.findById(item._id);
        if (product) {
          const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
          if (sizeIndex !== -1) {
            product.sizes[sizeIndex].stock += item.quantity;
            await product.save();
          }
        }
      }
    }

    await orderModel.findByIdAndUpdate(order._id, update);
    console.log('Order updated successfully:', order._id);

    res.json({
      success: isSuccess,
      message: isSuccess ? 'Payment successful' : 'Payment failed',
      orderId: order._id
    });
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
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    // First check if we have the order in our database
    const order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found for this transaction'
      });
    }

    // Try to get status from PhonePe SDK
    let phonepeResponse;
    try {
      phonepeResponse = await phonepeClient.getOrderStatus(merchantTransactionId);
    } catch (sdkError) {
      console.error('PhonePe SDK Error:', sdkError);
      
      // If SDK fails, check our database status
      if (order.paymentStatus === 'paid' && order.orderStatus === 'Confirmed') {
        return res.json({
          success: true,
          data: {
            code: 'PAYMENT_SUCCESS',
            paymentState: 'COMPLETED',
            merchantTransactionId: merchantTransactionId,
            state: 'COMPLETED'
          }
        });
      } else if (order.paymentStatus === 'failed') {
        return res.json({
          success: true,
          data: {
            code: 'PAYMENT_FAILED',
            paymentState: 'FAILED',
            merchantTransactionId: merchantTransactionId,
            state: 'FAILED'
          }
        });
      } else {
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
    }

    // If we got response from PhonePe, use it
    if (phonepeResponse) {
      return res.json({
        success: true,
        data: phonepeResponse
      });
    }

    // Fallback to database status
    return res.json({
      success: true,
      data: {
        code: order.paymentStatus === 'paid' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        paymentState: order.paymentStatus === 'paid' ? 'COMPLETED' : 'FAILED',
        merchantTransactionId: merchantTransactionId,
        state: order.paymentStatus === 'paid' ? 'COMPLETED' : 'FAILED'
      }
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