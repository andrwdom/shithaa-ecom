import EnhancedLogger from './enhancedLogger.js';
import PaymentSession from '../models/paymentSessionModel.js';
import orderModel from '../models/orderModel.js';

class PaymentMonitor {
  constructor() {
    this.logger = EnhancedLogger;
  }

  // Monitor payment session creation
  async monitorPaymentSessionCreation(sessionData, correlationId) {
    try {
      this.logger.paymentLog('INFO', `Creating payment session for transaction ${sessionData.phonepeTransactionId}`, {
        correlationId,
        userEmail: sessionData.userEmail,
        amount: sessionData.orderData?.amount,
        phonepeTransactionId: sessionData.phonepeTransactionId,
        hasOrderPayload: !!sessionData.orderPayload
      });

      const session = await PaymentSession.create(sessionData);
      
      this.logger.paymentLog('SUCCESS', `Payment session created successfully`, {
        correlationId,
        sessionId: session._id,
        phonepeTransactionId: session.phonepeTransactionId,
        userEmail: session.userEmail
      });

      return session;
    } catch (error) {
      this.logger.errorLog('ERROR', `Failed to create payment session`, error);
      this.logger.criticalAlert(`PAYMENT SESSION CREATION FAILED for ${sessionData.userEmail}`, {
        correlationId,
        phonepeTransactionId: sessionData.phonepeTransactionId,
        error: error.message
      });
      throw error;
    }
  }

  // Monitor order creation
  async monitorOrderCreation(orderData, correlationId) {
    try {
      this.logger.orderLog('INFO', `Creating order for transaction ${orderData.phonepeTransactionId}`, {
        correlationId,
        userEmail: orderData.userInfo?.email,
        amount: orderData.total || orderData.totalAmount,
        phonepeTransactionId: orderData.phonepeTransactionId
      });

      const order = await orderModel.create([orderData]);
      const createdOrder = order[0];
      
      this.logger.orderLog('SUCCESS', `Order created successfully`, {
        correlationId,
        orderId: createdOrder.orderId,
        phonepeTransactionId: createdOrder.phonepeTransactionId,
        userEmail: createdOrder.userInfo?.email
      });

      return createdOrder;
    } catch (error) {
      this.logger.errorLog('ERROR', `Failed to create order`, error);
      this.logger.criticalAlert(`ORDER CREATION FAILED for ${orderData.userInfo?.email}`, {
        correlationId,
        phonepeTransactionId: orderData.phonepeTransactionId,
        error: error.message
      });
      throw error;
    }
  }

  // Monitor webhook processing
  async monitorWebhookProcessing(webhookData, correlationId) {
    try {
      this.logger.webhookLog('INFO', `Processing webhook for transaction ${webhookData.orderId}`, {
        correlationId,
        orderId: webhookData.orderId,
        state: webhookData.state,
        responseCode: webhookData.responseCode
      });

      // Find payment session
      const paymentSession = await PaymentSession.findOne({ 
        phonepeTransactionId: webhookData.orderId 
      });

      if (!paymentSession) {
        this.logger.criticalAlert(`WEBHOOK: Payment session not found for transaction ${webhookData.orderId}`, {
          correlationId,
          orderId: webhookData.orderId,
          webhookData
        });
        return null;
      }

      this.logger.webhookLog('SUCCESS', `Payment session found for webhook`, {
        correlationId,
        sessionId: paymentSession._id,
        phonepeTransactionId: paymentSession.phonepeTransactionId,
        userEmail: paymentSession.userEmail
      });

      return paymentSession;
    } catch (error) {
      this.logger.errorLog('ERROR', `Failed to process webhook`, error);
      this.logger.criticalAlert(`WEBHOOK PROCESSING FAILED for ${webhookData.orderId}`, {
        correlationId,
        orderId: webhookData.orderId,
        error: error.message
      });
      throw error;
    }
  }

  // Monitor missing orders
  async checkForMissingOrders() {
    try {
      this.logger.paymentLog('INFO', 'Checking for missing orders...');

      // Find successful payment sessions without orders
      const successfulSessions = await PaymentSession.find({ status: 'success' });
      const missingOrders = [];

      for (const session of successfulSessions) {
        const order = await orderModel.findOne({
          phonepeTransactionId: session.phonepeTransactionId
        });

        if (!order) {
          missingOrders.push(session);
        }
      }

      if (missingOrders.length > 0) {
        this.logger.criticalAlert(`FOUND ${missingOrders.length} MISSING ORDERS!`, {
          missingOrders: missingOrders.map(session => ({
            sessionId: session._id,
            phonepeTransactionId: session.phonepeTransactionId,
            userEmail: session.userEmail,
            createdAt: session.createdAt,
            hasOrderPayload: !!session.orderPayload
          }))
        });
      } else {
        this.logger.paymentLog('SUCCESS', 'No missing orders found');
      }

      return missingOrders;
    } catch (error) {
      this.logger.errorLog('ERROR', 'Failed to check for missing orders', error);
      throw error;
    }
  }

  // Monitor payment flow health
  async monitorPaymentFlowHealth() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Check recent payment sessions
      const recentSessions = await PaymentSession.find({
        createdAt: { $gte: oneHourAgo }
      });

      // Check recent orders
      const recentOrders = await orderModel.find({
        createdAt: { $gte: oneHourAgo }
      });

      // Check for failed sessions
      const failedSessions = recentSessions.filter(s => s.status === 'failed');
      const pendingSessions = recentSessions.filter(s => s.status === 'pending');

      this.logger.paymentLog('INFO', 'Payment flow health check', {
        recentSessions: recentSessions.length,
        recentOrders: recentOrders.length,
        failedSessions: failedSessions.length,
        pendingSessions: pendingSessions.length,
        timeRange: '1 hour'
      });

      if (failedSessions.length > 0) {
        this.logger.criticalAlert(`FOUND ${failedSessions.length} FAILED PAYMENT SESSIONS in the last hour!`, {
          failedSessions: failedSessions.map(s => ({
            sessionId: s._id,
            phonepeTransactionId: s.phonepeTransactionId,
            userEmail: s.userEmail,
            status: s.status,
            createdAt: s.createdAt
          }))
        });
      }

      return {
        recentSessions: recentSessions.length,
        recentOrders: recentOrders.length,
        failedSessions: failedSessions.length,
        pendingSessions: pendingSessions.length
      };
    } catch (error) {
      this.logger.errorLog('ERROR', 'Failed to monitor payment flow health', error);
      throw error;
    }
  }
}

export default new PaymentMonitor();
