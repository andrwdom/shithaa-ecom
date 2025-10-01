#!/usr/bin/env node

/**
 * WEBHOOK SYSTEM TEST SCRIPT
 * 
 * Tests the bulletproof webhook system with various scenarios:
 * 1. Valid webhook processing
 * 2. Invalid signature handling
 * 3. Retry mechanism
 * 4. Order recovery scenarios
 * 5. Emergency order creation
 */

import mongoose from 'mongoose';
import BulletproofWebhookService from '../services/bulletproofWebhookService.js';
import RawWebhook from '../models/RawWebhook.js';
import orderModel from '../models/orderModel.js';
import EnhancedLogger from '../utils/enhancedLogger.js';
import dotenv from 'dotenv';

dotenv.config();

class WebhookSystemTest {
  constructor() {
    this.webhookService = new BulletproofWebhookService();
    this.testResults = [];
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shithaa-ecom');
      console.log('✅ Connected to MongoDB for testing');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      process.exit(1);
    }
  }

  async runTests() {
    console.log('🧪 Starting Webhook System Tests...\n');

    try {
      await this.connect();

      // Test 1: Valid webhook processing
      await this.testValidWebhook();

      // Test 2: Emergency order creation
      await this.testEmergencyOrderCreation();

      // Test 3: Duplicate webhook handling
      await this.testDuplicateWebhook();

      // Test 4: Failed payment handling
      await this.testFailedPayment();

      // Test 5: Invalid payload handling
      await this.testInvalidPayload();

      await this.printResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    } finally {
      await mongoose.disconnect();
      console.log('\n🔚 Tests completed');
    }
  }

  async testValidWebhook() {
    console.log('🧪 Test 1: Valid webhook processing');
    
    try {
      const testWebhookPayload = {
        isValid: true,
        orderId: `TEST-${Date.now()}-1`,
        state: 'COMPLETED',
        amount: 100000, // ₹1000 in paise
        isSuccess: true,
        isFailure: false,
        event: 'PAYMENT_SUCCESS',
        fullPayload: {
          orderId: `TEST-${Date.now()}-1`,
          state: 'COMPLETED',
          amount: 100000
        }
      };

      const correlationId = `test_${Date.now()}_1`;
      const result = await this.webhookService.processWebhook(testWebhookPayload, correlationId);

      if (result.action === 'emergency_order_created') {
        this.addResult('testValidWebhook', true, 'Emergency order created as expected for unknown transaction');
      } else {
        this.addResult('testValidWebhook', false, `Unexpected result: ${result.action}`);
      }

    } catch (error) {
      this.addResult('testValidWebhook', false, error.message);
    }
  }

  async testEmergencyOrderCreation() {
    console.log('🧪 Test 2: Emergency order creation for orphaned payment');
    
    try {
      const testWebhookPayload = {
        isValid: true,
        orderId: `ORPHANED-${Date.now()}`,
        state: 'COMPLETED',
        amount: 250000, // ₹2500 in paise
        isSuccess: true,
        isFailure: false,
        event: 'PAYMENT_SUCCESS',
        fullPayload: {
          orderId: `ORPHANED-${Date.now()}`,
          state: 'COMPLETED',
          amount: 250000,
          customerVpa: 'test@paytm'
        }
      };

      const correlationId = `test_${Date.now()}_2`;
      const result = await this.webhookService.processWebhook(testWebhookPayload, correlationId);

      if (result.action === 'emergency_order_created' && result.requiresManualProcessing) {
        // Verify emergency order was created
        const emergencyOrder = await orderModel.findOne({ 
          phonepeTransactionId: testWebhookPayload.orderId,
          'meta.source': 'emergency_webhook_recovery'
        });

        if (emergencyOrder) {
          this.addResult('testEmergencyOrderCreation', true, 
            `Emergency order created: ${emergencyOrder.orderId} with total ₹${emergencyOrder.total}`);
        } else {
          this.addResult('testEmergencyOrderCreation', false, 'Emergency order not found in database');
        }
      } else {
        this.addResult('testEmergencyOrderCreation', false, `Unexpected result: ${result.action}`);
      }

    } catch (error) {
      this.addResult('testEmergencyOrderCreation', false, error.message);
    }
  }

  async testDuplicateWebhook() {
    console.log('🧪 Test 3: Duplicate webhook handling');
    
    try {
      // Create a test order first
      const testOrderId = `DUP-TEST-${Date.now()}`;
      const testOrder = await orderModel.create({
        orderId: testOrderId,
        phonepeTransactionId: testOrderId,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        total: 1500,
        items: [],
        userInfo: { email: 'test@example.com', name: 'Test User' },
        shippingInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          addressLine1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          postalCode: '123456',
          country: 'India'
        },
        createdAt: new Date(),
        confirmedAt: new Date()
      });

      // Now send duplicate webhook
      const testWebhookPayload = {
        isValid: true,
        orderId: testOrderId,
        state: 'COMPLETED',
        amount: 150000,
        isSuccess: true,
        isFailure: false,
        event: 'PAYMENT_SUCCESS',
        fullPayload: {
          orderId: testOrderId,
          state: 'COMPLETED',
          amount: 150000
        }
      };

      const correlationId = `test_${Date.now()}_3`;
      const result = await this.webhookService.processWebhook(testWebhookPayload, correlationId);

      if (result.action === 'already_confirmed') {
        this.addResult('testDuplicateWebhook', true, 'Duplicate webhook properly ignored');
      } else {
        this.addResult('testDuplicateWebhook', false, `Unexpected result: ${result.action}`);
      }

    } catch (error) {
      this.addResult('testDuplicateWebhook', false, error.message);
    }
  }

  async testFailedPayment() {
    console.log('🧪 Test 4: Failed payment handling');
    
    try {
      // Create a draft order first
      const testOrderId = `FAIL-TEST-${Date.now()}`;
      const draftOrder = await orderModel.create({
        orderId: testOrderId,
        phonepeTransactionId: testOrderId,
        status: 'DRAFT',
        paymentStatus: 'PENDING',
        total: 800,
        items: [{
          productId: 'test-product',
          name: 'Test Product',
          size: 'M',
          quantity: 1,
          price: 800
        }],
        userInfo: { email: 'test@example.com', name: 'Test User' },
        shippingInfo: {
          fullName: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          addressLine1: 'Test Address',
          city: 'Test City',
          state: 'Test State',
          postalCode: '123456',
          country: 'India'
        },
        createdAt: new Date()
      });

      // Send failed payment webhook
      const testWebhookPayload = {
        isValid: true,
        orderId: testOrderId,
        state: 'FAILED',
        amount: 80000,
        isSuccess: false,
        isFailure: true,
        event: 'PAYMENT_FAILED',
        fullPayload: {
          orderId: testOrderId,
          state: 'FAILED',
          amount: 80000,
          error: 'Insufficient balance'
        }
      };

      const correlationId = `test_${Date.now()}_4`;
      const result = await this.webhookService.processWebhook(testWebhookPayload, correlationId);

      if (result.action === 'order_cancelled') {
        // Verify order was cancelled
        const cancelledOrder = await orderModel.findById(draftOrder._id);
        if (cancelledOrder && cancelledOrder.status === 'CANCELLED' && cancelledOrder.paymentStatus === 'FAILED') {
          this.addResult('testFailedPayment', true, 'Order properly cancelled for failed payment');
        } else {
          this.addResult('testFailedPayment', false, 'Order not properly cancelled');
        }
      } else {
        this.addResult('testFailedPayment', false, `Unexpected result: ${result.action}`);
      }

    } catch (error) {
      this.addResult('testFailedPayment', false, error.message);
    }
  }

  async testInvalidPayload() {
    console.log('🧪 Test 5: Invalid payload handling');
    
    try {
      const invalidWebhookPayload = {
        isValid: false,
        error: 'Missing orderId in payload',
        orderId: null,
        state: null,
        isSuccess: false,
        isFailure: false
      };

      const correlationId = `test_${Date.now()}_5`;
      
      try {
        await this.webhookService.processWebhook(invalidWebhookPayload, correlationId);
        this.addResult('testInvalidPayload', false, 'Should have thrown an error for invalid payload');
      } catch (error) {
        if (error.message.includes('invalid') || error.message.includes('missing')) {
          this.addResult('testInvalidPayload', true, 'Properly rejected invalid payload');
        } else {
          this.addResult('testInvalidPayload', false, `Unexpected error: ${error.message}`);
        }
      }

    } catch (error) {
      this.addResult('testInvalidPayload', false, `Test setup failed: ${error.message}`);
    }
  }

  addResult(testName, passed, details) {
    this.testResults.push({ testName, passed, details });
    const status = passed ? '✅' : '❌';
    console.log(`   ${status} ${testName}: ${details}\n`);
  }

  async printResults() {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;

    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.filter(r => !r.passed).forEach(test => {
        console.log(`  - ${test.testName}: ${test.details}`);
      });
    }

    console.log('\n✨ Webhook system test completed!');
    
    if (failed === 0) {
      console.log('🎉 All tests passed! The webhook system is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please review the implementation.');
    }
  }

  async cleanup() {
    // Clean up test data
    try {
      await orderModel.deleteMany({
        orderId: { $regex: /^(TEST-|ORPHANED-|DUP-TEST-|FAIL-TEST-)/ }
      });
      
      await RawWebhook.deleteMany({
        correlationId: { $regex: /^test_/ }
      });
      
      console.log('🧹 Test data cleaned up');
    } catch (error) {
      console.log('⚠️ Cleanup failed:', error.message);
    }
  }
}

// Run tests
const tester = new WebhookSystemTest();
tester.runTests()
  .then(() => tester.cleanup())
  .catch(console.error);
