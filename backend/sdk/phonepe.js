/**
 * PhonePe SDK Wrapper
 * Wraps the pg-sdk-node package to provide a consistent interface
 */

import { StandardCheckoutClient, Env } from 'pg-sdk-node';

export class PhonePeSDK {
  constructor(environment = 'UAT') {
    this.environment = environment;
    this.client = null;
    this.initialized = false;
    
    this.initializeClient();
  }

  initializeClient() {
    try {
      const merchantId = process.env.PHONEPE_MERCHANT_ID;
      const apiKey = process.env.PHONEPE_API_KEY;
      const saltIndex = parseInt(process.env.PHONEPE_SALT_INDEX || '1', 10);
      const env = this.environment === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;

      if (!merchantId || !apiKey) {
        console.error('PhonePe credentials missing:', {
          merchantId: merchantId ? 'SET' : 'MISSING',
          apiKey: apiKey ? 'SET' : 'MISSING'
        });
        return;
      }

      this.client = StandardCheckoutClient.getInstance(
        merchantId,
        apiKey,
        saltIndex,
        env
      );

      this.initialized = true;
      console.log('PhonePe SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PhonePe SDK:', error);
      this.initialized = false;
    }
  }

  async pay(paymentRequest) {
    if (!this.initialized || !this.client) {
      throw new Error('PhonePe SDK not initialized');
    }

    try {
      console.log('Creating PhonePe payment with request:', paymentRequest);
      
      const response = await this.client.pay(paymentRequest);
      
      console.log('PhonePe payment response:', response);
      
      return {
        success: response && response.success,
        data: response
      };
    } catch (error) {
      console.error('PhonePe payment creation failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async getPaymentStatus(merchantTransactionId) {
    if (!this.initialized || !this.client) {
      throw new Error('PhonePe SDK not initialized');
    }

    try {
      // Try both method names for compatibility
      let response;
      if (typeof this.client.getOrderStatus === 'function') {
        response = await this.client.getOrderStatus(merchantTransactionId);
      } else if (typeof this.client.getStatus === 'function') {
        response = await this.client.getStatus(merchantTransactionId);
      } else {
        throw new Error('PhonePe client missing status check methods');
      }

      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('PhonePe status check failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  isInitialized() {
    return this.initialized;
  }
}

export default PhonePeSDK;
