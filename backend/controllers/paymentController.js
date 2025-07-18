import crypto from 'crypto';
import axios from 'axios';
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import { successResponse, errorResponse } from '../utils/response.js';
import { getUniqueOrderId } from './orderController.js';

// PhonePe configuration
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'TEST-M23G3HW55OYVV_25071';
const PHONEPE_SECRET_KEY = process.env.PHONEPE_SECRET_KEY || 'NWZiZjZjYjYtYjllMC00ZGFhLWI5ZTEtMmVlMjE1Mjc4Mjkx';
const PHONEPE_ENV = process.env.PHONEPE_ENV || 'TEST'; // TEST or PROD
const PHONEPE_REDIRECT_URL = process.env.PHONEPE_REDIRECT_URL || process.env.BASE_URL || 'https://shithaa.in';

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

// Create PhonePe payment session
export const createPhonePeSession = async (req, res) => {
    try {
        const {
            amount,
            shipping,
            billing,
            cartItems,
            coupon,
            userId,
            email
        } = req.body;

        if (!amount || !shipping || !cartItems || cartItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Update product stock
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
            // Store shipping information in the new shippingInfo structure
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
            // Legacy address field for backward compatibility
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

        // Prepare PhonePe payload
        const merchantTransactionId = `ORDER_${newOrder._id}_${Date.now()}`;
        const merchantUserId = (userId ? String(userId).slice(0, 50) : 'GUEST');
        const mobileNumber = cleanMobileNumber(shipping.phone);
        const payload = {
            merchantId: PHONEPE_MERCHANT_ID,
            merchantTransactionId: merchantTransactionId,
            amount: amount * 100, // Convert to paise
            redirectUrl: `${PHONEPE_REDIRECT_URL}/payment/phonepe/callback`,
            redirectMode: 'POST',
            callbackUrl: `${PHONEPE_REDIRECT_URL}/api/payment/phonepe/callback`,
            merchantUserId,
            mobileNumber,
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };

        // LOGGING: Print payload and headers
        console.log('PhonePe payload:', JSON.stringify(payload, null, 2));

        // Create base64 encoded payload
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

        // Create checksum
        const checksum = crypto
            .createHmac('sha256', PHONEPE_SECRET_KEY)
            .update(base64Payload + '/pg/v1/pay' + PHONEPE_SECRET_KEY)
            .digest('hex');

        // LOGGING: Print headers
        console.log('PhonePe request headers:', {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum
        });

        // PhonePe API endpoint
        const phonepeUrl = PHONEPE_ENV === 'PROD'
            ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

        // Make request to PhonePe
        let response;
        try {
          response = await axios.post(phonepeUrl, {
              request: base64Payload
          }, {
              headers: {
                  'Content-Type': 'application/json',
                  'X-VERIFY': checksum
              }
          });
        } catch (error) {
          // LOGGING: Print error response
          console.error('PhonePe error:', error.response ? error.response.data : error.message);
          return res.status(500).json({
            success: false,
            message: 'Payment session creation failed',
            phonepeError: error.response ? error.response.data : error.message
          });
        }

        // LOGGING: Print PhonePe response
        console.log('PhonePe response:', response.data);

        if (response.data.success) {
            // Update order with PhonePe transaction ID
            await orderModel.findByIdAndUpdate(newOrder._id, {
                phonepeTransactionId: merchantTransactionId
            });

            res.json({
                success: true,
                orderId: newOrder._id,
                phonepeTransactionId: merchantTransactionId,
                redirectUrl: response.data.data.instrumentResponse.redirectInfo.url
            });
        } else {
            // If PhonePe request failed, restore stock and delete order
            await updateProductStock(cartItems.map(item => ({ ...item, quantity: -item.quantity })));
            await orderModel.findByIdAndDelete(newOrder._id);
            res.status(400).json({
                success: false,
                message: 'Failed to create payment session',
                phonepeError: response.data
            });
        }

    } catch (error) {
        console.error('Request body:', req.body);
        console.error('PhonePe Session Creation Error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment session creation failed',
            error: error.message
        });
    }
};

// PhonePe payment callback
export const phonePeCallback = async (req, res) => {
    try {
        const {
            merchantId,
            merchantTransactionId,
            transactionId,
            amount,
            paymentState,
            responseCode,
            checksum
        } = req.body;

        // Verify checksum
        const payload = `${merchantId}${merchantTransactionId}${transactionId}${amount}${paymentState}${responseCode}`;
        const expectedChecksum = crypto
            .createHmac('sha256', PHONEPE_SECRET_KEY)
            .update(payload)
            .digest('hex');

        if (checksum !== expectedChecksum) {
            return res.status(400).json({
                success: false,
                message: 'Invalid checksum'
            });
        }

        // Find order by PhonePe transaction ID
        const order = await orderModel.findOne({ phonepeTransactionId: merchantTransactionId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Always save the full callback payload as paymentLog
        const paymentLog = req.body;
        let update = {
            paymentLog,
            phonepeTransactionId: transactionId,
            amountPaid: amount / 100, // Convert paise to INR
        };

        if (paymentState === 'COMPLETED' && responseCode === 'PAYMENT_SUCCESS') {
            // Payment successful
            update = {
                ...update,
                payment: true,
                paymentStatus: 'paid',
                orderStatus: 'Confirmed',
                status: 'Order Placed',
            };
            // Clear user cart
            if (order.userId) {
                await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
            }
        } else {
            // Payment failed
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

        res.json({
            success: paymentState === 'COMPLETED' && responseCode === 'PAYMENT_SUCCESS',
            message: paymentState === 'COMPLETED' && responseCode === 'PAYMENT_SUCCESS' ? 'Payment successful' : 'Payment failed',
            orderId: order._id
        });

    } catch (error) {
        console.error('PhonePe Callback Error:', error);
        res.status(500).json({
            success: false,
            message: 'Callback processing failed'
        });
    }
};

// Verify PhonePe payment status
export const verifyPhonePePayment = async (req, res) => {
    try {
        const { merchantTransactionId } = req.params;

        if (!merchantTransactionId) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID is required'
            });
        }

        // PhonePe status check API
        const phonepeStatusUrl = PHONEPE_ENV === 'PROD'
            ? 'https://api.phonepe.com/apis/hermes/pg/v1/status'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/status';

        const payload = {
            merchantId: PHONEPE_MERCHANT_ID,
            merchantTransactionId: merchantTransactionId
        };

        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

        const checksum = crypto
            .createHmac('sha256', PHONEPE_SECRET_KEY)
            .update(base64Payload + '/pg/v1/status' + PHONEPE_SECRET_KEY)
            .digest('hex');

        const response = await axios.get(`${phonepeStatusUrl}/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': checksum,
                'X-MERCHANT-ID': PHONEPE_MERCHANT_ID
            }
        });

        res.json({
            success: true,
            data: response.data
        });

    } catch (error) {
        console.error('PhonePe Verification Error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed'
        });
    }
}; 