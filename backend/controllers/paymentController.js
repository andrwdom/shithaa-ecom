import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import PaymentSession from "../models/paymentSessionModel.js";
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

// Helper function to update product stock (reserve or restore)
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

// Helper function to restore product stock (for failed payments)
const restoreProductStock = async (items) => {
    for (const item of items) {
        const product = await productModel.findById(item._id);
        if (product) {
            const sizeIndex = product.sizes.findIndex(s => s.size === item.size);
            if (sizeIndex !== -1) {
                product.sizes[sizeIndex].stock += item.quantity;
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

    const userEmail = getOrderUserEmail(req, email);
    
    // Generate unique session and transaction IDs
    const sessionId = randomUUID();
    const phonepeTransactionId = randomUUID();
    
    // Create payment session (temporary storage, not an order)
    const paymentSessionData = {
      sessionId,
      phonepeTransactionId,
      userId: userId || (req.user && req.user.id),
      userEmail,
      orderData: {
        amount,
        shipping: {
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
        cartItems: cartItems.map(item => ({
          _id: item._id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          size: item.size
        }))
      },
      status: 'pending',
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        checkoutSource: req.body.checkoutSource || 'cart'
      }
    };

    // Reserve stock temporarily (will be confirmed or restored based on payment result)
    await updateProductStock(cartItems);
    
    // Mark stock as reserved in payment session
    paymentSessionData.stockReserved = true;
    
    // Save payment session to database
    const paymentSession = await PaymentSession.create(paymentSessionData);

    // Use SDK to create payment session
    const redirectUrl = `${process.env.PHONEPE_REDIRECT_URL || process.env.BASE_URL || 'https://shithaa.in'}/payment/phonepe/callback?merchantTransactionId=${phonepeTransactionId}`;
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(phonepeTransactionId)
      .amount(amount * 100) // paise
      .redirectUrl(redirectUrl)
      .build();

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
        sessionId: sessionId,
        phonepeTransactionId: phonepeTransactionId,
        redirectUrl: response.redirectUrl
      });
    } else {
      // Restore stock if payment session creation failed
      await restoreProductStock(cartItems);
      
      // Delete payment session
      await PaymentSession.findByIdAndDelete(paymentSession._id);
      
      return res.status(400).json({
        success: false,
        message: 'Failed to create payment session',
        phonepeError: response
      });
    }
  } catch (error) {
    console.error('PhonePe SDK Session Creation Error:', error);
    
    // If there was an error after stock reservation, try to restore it
    if (req.body.cartItems) {
      try {
        await restoreProductStock(req.body.cartItems);
      } catch (stockError) {
        console.error('Failed to restore stock after error:', stockError);
      }
    }
    
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

    // Find order by merchantOrderId (orderId in callback payload)
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
      state === 'SUCCESS' ||
      state === 'PAYMENT_SUCCESS' ||
      state === 'SUCCESSFUL' ||
      state === 'PAID'
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
    console.log('Verification request for transaction:', merchantTransactionId);
    
    if (!merchantTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    // First check if we have the payment session in our database
    const paymentSession = await PaymentSession.findOne({ phonepeTransactionId: merchantTransactionId });
    console.log('Payment session found:', paymentSession ? paymentSession._id : 'Not found');
    
    if (!paymentSession) {
      console.log('Payment session not found for transaction:', merchantTransactionId);
      return res.status(404).json({
        success: false,
        message: 'Payment session not found for this transaction'
      });
    }

    console.log('Payment session status:', paymentSession.status);

    // Try to get status from PhonePe SDK
    let phonepeResponse;
    try {
      console.log('Attempting PhonePe SDK verification...');
      phonepeResponse = await phonepeClient.getOrderStatus(merchantTransactionId);
      console.log('PhonePe SDK response:', phonepeResponse);
    } catch (sdkError) {
      console.error('PhonePe SDK Error:', sdkError);
      
      // If SDK fails, check our database status
      console.log('Using database fallback for transaction:', merchantTransactionId);
      
      // Check if payment session was marked as successful
      if (paymentSession.status === 'success') {
        console.log('Database shows payment successful');
        return res.json({
          success: true,
          data: {
            code: 'PAYMENT_SUCCESS',
            paymentState: 'COMPLETED',
            merchantTransactionId: merchantTransactionId,
            state: 'COMPLETED'
          }
        });
      } else if (paymentSession.status === 'failed') {
        console.log('Database shows payment failed');
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
        console.log('Database shows payment pending');
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
      console.log('Using PhonePe SDK response');
      
      // Determine payment status from PhonePe response
      const isSuccess = (
        (phonepeResponse.code === 'PAYMENT_SUCCESS' && phonepeResponse.paymentState === 'COMPLETED') ||
        (phonepeResponse.code === 'PAYMENT_SUCCESS' && phonepeResponse.state === 'COMPLETED') ||
        (phonepeResponse.paymentState === 'COMPLETED') ||
        (phonepeResponse.state === 'COMPLETED')
      );
      
      const isFailed = (
        (phonepeResponse.code === 'PAYMENT_FAILED' && phonepeResponse.paymentState === 'FAILED') ||
        (phonepeResponse.code === 'PAYMENT_FAILED' && phonepeResponse.state === 'FAILED') ||
        (phonepeResponse.paymentState === 'FAILED') ||
        (phonepeResponse.state === 'FAILED')
      );
      
      const isCancelled = (
        (phonepeResponse.code === 'PAYMENT_CANCELLED' && phonepeResponse.paymentState === 'CANCELLED') ||
        (phonepeResponse.code === 'PAYMENT_CANCELLED' && phonepeResponse.state === 'CANCELLED') ||
        (phonepeResponse.paymentState === 'CANCELLED') ||
        (phonepeResponse.state === 'CANCELLED')
      );

      // Update payment session status
      let newStatus = 'pending';
      if (isSuccess) newStatus = 'success';
      else if (isFailed || isCancelled) newStatus = 'failed';

      await PaymentSession.findByIdAndUpdate(paymentSession._id, { status: newStatus });

      // If payment failed or was cancelled, restore stock
      if (isFailed || isCancelled) {
        if (paymentSession.stockReserved) {
          console.log('Restoring stock for failed/cancelled payment');
          await restoreProductStock(paymentSession.orderData.cartItems);
          
          // Mark stock as no longer reserved
          await PaymentSession.findByIdAndUpdate(paymentSession._id, { stockReserved: false });
        }
      }

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
        code: paymentSession.status === 'success' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
        paymentState: paymentSession.status === 'success' ? 'COMPLETED' : 'FAILED',
        merchantTransactionId: merchantTransactionId,
        state: paymentSession.status === 'success' ? 'COMPLETED' : 'FAILED'
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

// Create order from successful payment session
export const createOrderFromPaymentSession = async (req, res) => {
  try {
    const { phonepeTransactionId } = req.body;
    
    if (!phonepeTransactionId) {
      return res.status(400).json({
        success: false,
        message: 'PhonePe transaction ID is required'
      });
    }

    // Find the payment session
    const paymentSession = await PaymentSession.findOne({ phonepeTransactionId });
    if (!paymentSession) {
      return res.status(404).json({
        success: false,
        message: 'Payment session not found'
      });
    }

    // Verify payment status is successful
    if (paymentSession.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment session is not successful'
      });
    }

    // Generate unique order ID
    const orderId = await getUniqueOrderId();

    // Create order using the exact format expected by createStructuredOrder
    const orderPayload = {
      userInfo: {
        userId: paymentSession.userId,
        name: paymentSession.orderData.shipping.fullName,
        email: paymentSession.userEmail
      },
      shippingInfo: {
        fullName: paymentSession.orderData.shipping.fullName,
        email: paymentSession.orderData.shipping.email,
        phone: paymentSession.orderData.shipping.phone,
        addressLine1: paymentSession.orderData.shipping.addressLine1,
        addressLine2: paymentSession.orderData.shipping.addressLine2 || '',
        city: paymentSession.orderData.shipping.city,
        state: paymentSession.orderData.shipping.state,
        postalCode: paymentSession.orderData.shipping.postalCode,
        country: paymentSession.orderData.shipping.country || 'India'
      },
      items: paymentSession.orderData.cartItems.map(item => ({
        _id: item._id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        size: item.size
      })),
      totalAmount: paymentSession.orderData.amount,
      paymentStatus: 'paid',
      phonepeTransactionId: phonepeTransactionId,
      paymentMethod: 'PhonePe',
      createdAt: new Date().toISOString()
    };

    // Validate required fields
    if (!orderPayload.userInfo.email) {
      return res.status(400).json({
        success: false,
        message: 'User email is missing'
      });
    }
    if (!orderPayload.userInfo.name) {
      return res.status(400).json({
        success: false,
        message: 'User name is missing'
      });
    }
    if (!orderPayload.shippingInfo.fullName) {
      return res.status(400).json({
        success: false,
        message: 'Shipping name is missing'
      });
    }
    if (!orderPayload.items || orderPayload.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order items are missing'
      });
    }
    if (!orderPayload.totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Total amount is missing'
      });
    }

    console.log('Creating order from payment session with payload:', orderPayload);

    // Create the order using the existing createStructuredOrder logic
    const order = await orderModel.create({
      userInfo: orderPayload.userInfo,
      shippingInfo: orderPayload.shippingInfo,
      items: orderPayload.items,
      totalAmount: orderPayload.totalAmount,
      status: 'Pending',
      orderStatus: 'Pending',
      paymentStatus: 'paid',
      createdAt: new Date(),
      email: orderPayload.userInfo.email,
      userId: orderPayload.userInfo.userId,
      orderId,
      phonepeTransactionId: orderPayload.phonepeTransactionId,
      paymentMethod: orderPayload.paymentMethod
    });

    console.log('Order created successfully from payment session:', order._id);

    // Mark stock as confirmed (no longer reserved)
    await PaymentSession.findByIdAndUpdate(paymentSession._id, { stockReserved: false });

    // Delete the payment session since order is now created
    await PaymentSession.findByIdAndDelete(paymentSession._id);

    res.status(201).json({
      success: true,
      order: order
    });

  } catch (error) {
    console.error('Create Order From Payment Session Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order from payment session',
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