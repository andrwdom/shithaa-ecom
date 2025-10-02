import mongoose from 'mongoose';
import { phonePeWebhookHandler } from '../controllers/enhancedWebhookController.js';
import orderModel from '../models/orderModel.js';
import RawWebhook from '../models/RawWebhook.js';

/**
 * WEBHOOK INTEGRATION TEST
 * 
 * Tests the complete webhook flow from receipt to order confirmation
 */
class WebhookIntegrationTest {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run integration test
   */
  async runTest() {
    console.log('🧪 Starting Webhook Integration Test...\n');
    
    try {
      // Test 1: Webhook receipt and processing
      await this.testWebhookReceipt();
      
      // Test 2: Order confirmation flow
      await this.testOrderConfirmation();
      
      // Test 3: Error handling and retry
      await this.testErrorHandling();
      
      // Test 4: Idempotency
      await this.testIdempotency();
      
      // Generate test report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Integration test failed:', error);
    }
  }

  /**
   * Test webhook receipt and processing
   */
  async testWebhookReceipt() {
    console.log('🔍 Testing webhook receipt...');
    
    try {
      // Create mock request and response
      const mockReq = {
        headers: {
          'x-request-id': 'TEST-INTEGRATION-001',
          'authorization': this.generateTestAuth(),
          'content-type': 'application/json'
        },
        body: {
          payload: {
            orderId: 'TEST-INTEGRATION-001',
            state: 'COMPLETED',
            amount: 10000
          },
          event: 'PAYMENT_SUCCESS'
        },
        ip: '127.0.0.1'
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => {
            console.log(`Response: ${code}`, data);
            return { statusCode: code, data };
          }
        }),
        json: (data) => {
          console.log('Response:', data);
          return { data };
        }
      };

      // Call webhook handler
      const result = await phonePeWebhookHandler(mockReq, mockRes);
      
      // Check if webhook was processed
      const webhook = await RawWebhook.findOne({
        orderId: 'TEST-INTEGRATION-001'
      });

      const success = webhook && webhook.processed;
      
      this.testResults.push({
        test: 'Webhook Receipt',
        passed: success,
        details: {
          webhookFound: !!webhook,
          processed: webhook?.processed,
          result
        }
      });
      
      console.log(success ? '✅ Webhook receipt test passed' : '❌ Webhook receipt test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Webhook Receipt',
        passed: false,
        error: error.message
      });
      console.log('❌ Webhook receipt test failed:', error.message);
    }
  }

  /**
   * Test order confirmation flow
   */
  async testOrderConfirmation() {
    console.log('🔍 Testing order confirmation...');
    
    try {
      // Create a draft order
      const draftOrder = await orderModel.create({
        orderId: 'TEST-ORDER-001',
        phonepeTransactionId: 'TEST-ORDER-001',
        status: 'DRAFT',
        paymentStatus: 'PENDING',
        cartItems: [{
          productId: 'test-product',
          size: 'M',
          quantity: 1,
          name: 'Test Product'
        }],
        userInfo: {
          email: 'test@example.com',
          name: 'Test User'
        },
        shippingInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '1234567890',
          addressLine1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          postalCode: '123456',
          country: 'India'
        },
        orderSummary: {
          total: 10000
        },
        total: 10000
      });

      // Create webhook for this order
      const mockReq = {
        headers: {
          'x-request-id': 'TEST-ORDER-001',
          'authorization': this.generateTestAuth(),
          'content-type': 'application/json'
        },
        body: {
          payload: {
            orderId: 'TEST-ORDER-001',
            state: 'COMPLETED',
            amount: 10000
          },
          event: 'PAYMENT_SUCCESS'
        },
        ip: '127.0.0.1'
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        }),
        json: (data) => ({ data })
      };

      // Process webhook
      await phonePeWebhookHandler(mockReq, mockRes);

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if order was confirmed
      const updatedOrder = await orderModel.findById(draftOrder._id);
      const wasConfirmed = updatedOrder && updatedOrder.status === 'CONFIRMED';
      
      this.testResults.push({
        test: 'Order Confirmation',
        passed: wasConfirmed,
        details: {
          orderId: draftOrder._id,
          originalStatus: 'DRAFT',
          finalStatus: updatedOrder?.status,
          wasConfirmed
        }
      });
      
      console.log(wasConfirmed ? '✅ Order confirmation test passed' : '❌ Order confirmation test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Order Confirmation',
        passed: false,
        error: error.message
      });
      console.log('❌ Order confirmation test failed:', error.message);
    }
  }

  /**
   * Test error handling and retry
   */
  async testErrorHandling() {
    console.log('🔍 Testing error handling...');
    
    try {
      // Create webhook with invalid data
      const mockReq = {
        headers: {
          'x-request-id': 'TEST-ERROR-001',
          'authorization': this.generateTestAuth(),
          'content-type': 'application/json'
        },
        body: {
          payload: {
            orderId: 'TEST-ERROR-001',
            state: 'INVALID_STATE',
            amount: 10000
          },
          event: 'PAYMENT_SUCCESS'
        },
        ip: '127.0.0.1'
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        }),
        json: (data) => ({ data })
      };

      // Process webhook
      const result = await phonePeWebhookHandler(mockReq, mockRes);
      
      // Check if webhook was handled gracefully
      const webhook = await RawWebhook.findOne({
        orderId: 'TEST-ERROR-001'
      });

      const handledGracefully = webhook && (webhook.processed || webhook.deadLetter);
      
      this.testResults.push({
        test: 'Error Handling',
        passed: handledGracefully,
        details: {
          webhookFound: !!webhook,
          processed: webhook?.processed,
          deadLetter: webhook?.deadLetter,
          result
        }
      });
      
      console.log(handledGracefully ? '✅ Error handling test passed' : '❌ Error handling test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Error Handling',
        passed: false,
        error: error.message
      });
      console.log('❌ Error handling test failed:', error.message);
    }
  }

  /**
   * Test idempotency
   */
  async testIdempotency() {
    console.log('🔍 Testing idempotency...');
    
    try {
      const orderId = 'TEST-IDEMPOTENCY-001';
      
      // Process same webhook twice
      const mockReq = {
        headers: {
          'x-request-id': 'TEST-IDEMPOTENCY-001',
          'authorization': this.generateTestAuth(),
          'content-type': 'application/json'
        },
        body: {
          payload: {
            orderId: orderId,
            state: 'COMPLETED',
            amount: 10000
          },
          event: 'PAYMENT_SUCCESS'
        },
        ip: '127.0.0.1'
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        }),
        json: (data) => ({ data })
      };

      // Process webhook first time
      await phonePeWebhookHandler(mockReq, mockRes);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Process same webhook again
      await phonePeWebhookHandler(mockReq, mockRes);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if only one webhook record exists
      const webhookCount = await RawWebhook.countDocuments({
        orderId: orderId
      });
      
      const isIdempotent = webhookCount <= 1;
      
      this.testResults.push({
        test: 'Idempotency',
        passed: isIdempotent,
        details: {
          webhookCount,
          isIdempotent
        }
      });
      
      console.log(isIdempotent ? '✅ Idempotency test passed' : '❌ Idempotency test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Idempotency',
        passed: false,
        error: error.message
      });
      console.log('❌ Idempotency test failed:', error.message);
    }
  }

  /**
   * Generate test authentication header
   */
  generateTestAuth() {
    const crypto = require('crypto');
    const username = process.env.PHONEPE_CALLBACK_USERNAME || 'test';
    const password = process.env.PHONEPE_CALLBACK_PASSWORD || 'test';
    return crypto.createHash('sha256').update(`${username}:${password}`).digest('hex');
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    console.log('\n📊 WEBHOOK INTEGRATION TEST REPORT');
    console.log('=====================================');
    
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests) * 100;
    
    console.log(`\nOverall Success Rate: ${Math.round(successRate)}% (${passedTests}/${totalTests})`);
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.test}`);
      
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    if (successRate === 100) {
      console.log('\n🎉 All integration tests passed! Webhook system is working correctly.');
    } else {
      console.log('\n⚠️  Some integration tests failed. Check the details above.');
    }
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new WebhookIntegrationTest();
  test.runTest().then(() => {
    console.log('\n🏁 Integration test completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Integration test crashed:', error);
    process.exit(1);
  });
}

export default WebhookIntegrationTest;
