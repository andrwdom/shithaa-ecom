import EnhancedLogger from '../utils/enhancedLogger.js';
import PaymentMonitor from '../utils/paymentMonitor.js';
import PaymentSession from '../models/paymentSessionModel.js';
import orderModel from '../models/orderModel.js';
import CheckoutSession from '../models/CheckoutSession.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getSystemHealth = async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Get recent data
    const recentSessions = await PaymentSession.find({
      createdAt: { $gte: oneHourAgo }
    });
    
    const recentOrders = await orderModel.find({
      createdAt: { $gte: oneHourAgo }
    });
    
    const recentCheckoutSessions = await CheckoutSession.find({
      createdAt: { $gte: oneHourAgo }
    });
    
    // Check for missing orders
    const missingOrders = [];
    for (const session of recentSessions) {
      if (session.status === 'success') {
        const order = await orderModel.findOne({
          phonepeTransactionId: session.phonepeTransactionId
        });
        if (!order) {
          missingOrders.push(session);
        }
      }
    }
    
    // Get system metrics
    const totalSessions = await PaymentSession.countDocuments();
    const totalOrders = await orderModel.countDocuments();
    const totalCheckoutSessions = await CheckoutSession.countDocuments();
    
    // Get failed sessions
    const failedSessions = await PaymentSession.find({
      status: 'failed',
      createdAt: { $gte: oneDayAgo }
    });
    
    // Get pending sessions
    const pendingSessions = await PaymentSession.find({
      status: 'pending',
      createdAt: { $gte: oneDayAgo }
    });
    
    const healthData = {
      timestamp: now,
      recent: {
        sessions: recentSessions.length,
        orders: recentOrders.length,
        checkoutSessions: recentCheckoutSessions.length,
        missingOrders: missingOrders.length,
        failedSessions: failedSessions.length,
        pendingSessions: pendingSessions.length
      },
      total: {
        sessions: totalSessions,
        orders: totalOrders,
        checkoutSessions: totalCheckoutSessions
      },
      alerts: {
        missingOrders: missingOrders.map(session => ({
          id: session._id,
          phonepeTransactionId: session.phonepeTransactionId,
          userEmail: session.userEmail,
          createdAt: session.createdAt,
          hasOrderPayload: !!session.orderPayload,
          hasOrderData: !!session.orderData
        })),
        failedSessions: failedSessions.map(session => ({
          id: session._id,
          phonepeTransactionId: session.phonepeTransactionId,
          userEmail: session.userEmail,
          createdAt: session.createdAt,
          status: session.status
        }))
      },
      status: missingOrders.length > 0 ? 'CRITICAL' : 'HEALTHY'
    };
    
    return successResponse(res, healthData);
    
  } catch (error) {
    EnhancedLogger.error('Failed to get system health', error);
    return errorResponse(res, 500, 'Failed to get system health');
  }
};

export const getPaymentFlowStatus = async (req, res) => {
  try {
    const flowStatus = await PaymentMonitor.monitorPaymentFlowHealth();
    return successResponse(res, flowStatus);
  } catch (error) {
    EnhancedLogger.error('Failed to get payment flow status', error);
    return errorResponse(res, 500, 'Failed to get payment flow status');
  }
};

export const getMissingOrders = async (req, res) => {
  try {
    const missingOrders = await PaymentMonitor.checkForMissingOrders();
    return successResponse(res, { missingOrders });
  } catch (error) {
    EnhancedLogger.error('Failed to get missing orders', error);
    return errorResponse(res, 500, 'Failed to get missing orders');
  }
};

export const getSystemMetrics = async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get metrics for different time periods
    const metrics = {
      lastHour: {
        sessions: await PaymentSession.countDocuments({ createdAt: { $gte: oneHourAgo } }),
        orders: await orderModel.countDocuments({ createdAt: { $gte: oneHourAgo } }),
        checkoutSessions: await CheckoutSession.countDocuments({ createdAt: { $gte: oneHourAgo } })
      },
      lastDay: {
        sessions: await PaymentSession.countDocuments({ createdAt: { $gte: oneDayAgo } }),
        orders: await orderModel.countDocuments({ createdAt: { $gte: oneDayAgo } }),
        checkoutSessions: await CheckoutSession.countDocuments({ createdAt: { $gte: oneDayAgo } })
      },
      lastWeek: {
        sessions: await PaymentSession.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        orders: await orderModel.countDocuments({ createdAt: { $gte: oneWeekAgo } }),
        checkoutSessions: await CheckoutSession.countDocuments({ createdAt: { $gte: oneWeekAgo } })
      },
      total: {
        sessions: await PaymentSession.countDocuments(),
        orders: await orderModel.countDocuments(),
        checkoutSessions: await CheckoutSession.countDocuments()
      }
    };
    
    return successResponse(res, metrics);
    
  } catch (error) {
    EnhancedLogger.error('Failed to get system metrics', error);
    return errorResponse(res, 500, 'Failed to get system metrics');
  }
};

export const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // Get recent orders
    const recentOrders = await orderModel.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('orderId phonepeTransactionId userInfo total orderStatus paymentStatus createdAt');
    
    // Get recent payment sessions
    const recentSessions = await PaymentSession.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('phonepeTransactionId userEmail status createdAt orderId');
    
    // Get recent checkout sessions
    const recentCheckoutSessions = await CheckoutSession.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('sessionId userEmail status total createdAt');
    
    return successResponse(res, {
      orders: recentOrders,
      paymentSessions: recentSessions,
      checkoutSessions: recentCheckoutSessions
    });
    
  } catch (error) {
    EnhancedLogger.error('Failed to get recent activity', error);
    return errorResponse(res, 500, 'Failed to get recent activity');
  }
};
