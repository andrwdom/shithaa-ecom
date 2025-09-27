import express from 'express';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';

const router = express.Router();

// Get all raw webhooks with pagination and filtering
router.get('/webhooks', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      provider, 
      processed, 
      startDate, 
      endDate 
    } = req.query;

    const query = {};
    
    if (provider) query.provider = provider;
    if (processed !== undefined) query.processed = processed === 'true';
    if (startDate || endDate) {
      query.receivedAt = {};
      if (startDate) query.receivedAt.$gte = new Date(startDate);
      if (endDate) query.receivedAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [webhooks, total] = await Promise.all([
      RawWebhook.find(query)
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      RawWebhook.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        webhooks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webhooks'
    });
  }
});

// Get webhook details by ID
router.get('/webhooks/:id', async (req, res) => {
  try {
    const webhook = await RawWebhook.findById(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      data: webhook
    });
  } catch (error) {
    console.error('Error fetching webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webhook'
    });
  }
});

// Replay a webhook (reprocess it)
router.post('/webhooks/:id/replay', async (req, res) => {
  try {
    const webhook = await RawWebhook.findById(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    // Reset processing flags
    webhook.processed = false;
    webhook.processing = false;
    webhook.error = null;
    await webhook.save();

    res.json({
      success: true,
      message: 'Webhook queued for reprocessing'
    });
  } catch (error) {
    console.error('Error replaying webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to replay webhook'
    });
  }
});

// Get webhook statistics
router.get('/webhooks/stats', async (req, res) => {
  try {
    const stats = await RawWebhook.aggregate([
      {
        $group: {
          _id: {
            provider: '$provider',
            processed: '$processed'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.provider',
          total: { $sum: '$count' },
          processed: {
            $sum: {
              $cond: [{ $eq: ['$_id.processed', true] }, '$count', 0]
            }
          },
          unprocessed: {
            $sum: {
              $cond: [{ $eq: ['$_id.processed', false] }, '$count', 0]
            }
          }
        }
      }
    ]);

    const totalWebhooks = await RawWebhook.countDocuments();
    const recentWebhooks = await RawWebhook.countDocuments({
      receivedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      data: {
        total: totalWebhooks,
        recent24h: recentWebhooks,
        byProvider: stats
      }
    });
  } catch (error) {
    console.error('Error fetching webhook stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webhook statistics'
    });
  }
});

// Get orders created from webhooks
router.get('/webhook-orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, gatewayTxnId } = req.query;

    const query = {};
    if (gatewayTxnId) {
      query.gateway_txn_id = { $regex: gatewayTxnId, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [orders, total] = await Promise.all([
      orderModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      orderModel.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching webhook orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch webhook orders'
    });
  }
});

// Manual order creation from webhook data
router.post('/webhooks/:id/create-order', async (req, res) => {
  try {
    const webhook = await RawWebhook.findById(req.params.id);
    
    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    const event = JSON.parse(webhook.raw);
    
    // Extract transaction details based on provider
    let gatewayTxnId, amount, status;
    
    switch (webhook.provider) {
      case 'phonepe':
        gatewayTxnId = event?.transactionId || event?.data?.transactionId || event?.data?.merchantTransactionId;
        amount = event?.amount || event?.data?.amount;
        status = event?.state || event?.data?.state;
        break;
      case 'razorpay':
        gatewayTxnId = event?.payload?.payment?.entity?.id || event?.payment?.entity?.id;
        amount = event?.payload?.payment?.entity?.amount || event?.payment?.entity?.amount;
        status = event?.payload?.payment?.entity?.status || event?.payment?.entity?.status;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported provider'
        });
    }

    if (!gatewayTxnId) {
      return res.status(400).json({
        success: false,
        message: 'No transaction ID found in webhook'
      });
    }

    // Check if order already exists
    const existingOrder = await orderModel.findOne({ gateway_txn_id: gatewayTxnId });
    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: 'Order already exists',
        orderId: existingOrder._id
      });
    }

    // Create order
    const orderData = {
      gateway_txn_id: gatewayTxnId,
      phonepeTransactionId: gatewayTxnId, // Also set the existing field
      orderId: `WEBHOOK-${Date.now()}`,
      status: 'paid',
      paymentStatus: 'completed',
      total: amount ? amount / 100 : 0,
      totalAmount: amount ? amount / 100 : 0,
      meta: {
        provider: webhook.provider,
        rawWebhookId: webhook._id,
        webhookData: event,
        manuallyCreated: true
      },
      createdAt: new Date(),
      placedAt: new Date()
    };

    const order = await orderModel.create(orderData);
    
    // Mark webhook as processed
    webhook.processed = true;
    webhook.processedAt = new Date();
    await webhook.save();

    res.json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order._id,
        gatewayTxnId: order.gateway_txn_id
      }
    });
  } catch (error) {
    console.error('Error creating order from webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order from webhook'
    });
  }
});

export default router;
