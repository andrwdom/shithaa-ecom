import mongoose from 'mongoose';
import BulletproofWebhookProcessor from '../services/bulletproofWebhookProcessor.js';
import WebhookQueueManager from '../services/webhookQueueManager.js';
import WebhookReconciliationService from '../services/webhookReconciliationService.js';
import orderModel from '../models/orderModel.js';
import RawWebhook from '../models/RawWebhook.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * WEBHOOK RELIABILITY TEST SUITE
 * 
 * Tests the bulletproof webhook system under various failure scenarios
 */
class WebhookReliabilityTest {
  constructor() {
    this.processor = new BulletproofWebhookProcessor();
    this.queueManager = new WebhookQueueManager();
    this.reconciliationService = new WebhookReconciliationService();
    this.testResults = [];
  }

  /**
   * Run all webhook reliability tests
   */
  async runAllTests() {
    console.log('🧪 Starting Webhook Reliability Tests...\n');
    
    try {
      // Test 1: Idempotency
      await this.testIdempotency();
      
      // Test 2: Retry Mechanism
      await this.testRetryMechanism();
      
      // Test 3: Circuit Breaker
      await this.testCircuitBreaker();
      
      // Test 4: Queue Processing
      await this.testQueueProcessing();
      
      // Test 5: Reconciliation
      await this.testReconciliation();
      
      // Test 6: Error Recovery
      await this.testErrorRecovery();
      
      // Test 7: High Load
      await this.testHighLoad();
      
      // Test 8: Network Failures
      await this.testNetworkFailures();
      
      // Generate test report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * Test 1: Idempotency
   */
  async testIdempotency() {
    console.log('🔍 Testing Idempotency...');
    
    const webhookData = {
      orderId: 'TEST-IDEMPOTENCY-001',
      amount: 10000,
      state: 'COMPLETED',
      isSuccess: true,
      isFailure: false,
      fullPayload: { test: 'idempotency' }
    };
    
    const correlationId = 'TEST-IDEMPOTENCY';
    
    try {
      // Process webhook first time
      const result1 = await this.processor.processWebhook(webhookData, correlationId);
      
      // Process same webhook again
      const result2 = await this.processor.processWebhook(webhookData, correlationId);
      
      // Verify idempotency
      const isIdempotent = result1.action === result2.action && 
                          result1.orderId === result2.orderId;
      
      this.testResults.push({
        test: 'Idempotency',
        passed: isIdempotent,
        details: {
          firstResult: result1,
          secondResult: result2,
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
   * Test 2: Retry Mechanism
   */
  async testRetryMechanism() {
    console.log('🔍 Testing Retry Mechanism...');
    
    const webhookData = {
      orderId: 'TEST-RETRY-001',
      amount: 20000,
      state: 'COMPLETED',
      isSuccess: true,
      isFailure: false,
      fullPayload: { test: 'retry' }
    };
    
    const correlationId = 'TEST-RETRY';
    
    try {
      // Mock a failing webhook processor
      const originalProcessWebhook = this.processor.processWebhook;
      let attemptCount = 0;
      
      this.processor.processWebhook = async (data, correlationId, attempt = 1) => {
        attemptCount++;
        if (attempt < 3) {
          throw new Error('Simulated processing failure');
        }
        return originalProcessWebhook.call(this.processor, data, correlationId, attempt);
      };
      
      const startTime = Date.now();
      const result = await this.processor.processWebhook(webhookData, correlationId);
      const processingTime = Date.now() - startTime;
      
      // Restore original method
      this.processor.processWebhook = originalProcessWebhook;
      
      const retryWorked = attemptCount >= 3 && result.success;
      
      this.testResults.push({
        test: 'Retry Mechanism',
        passed: retryWorked,
        details: {
          attempts: attemptCount,
          processingTime,
          result
        }
      });
      
      console.log(retryWorked ? '✅ Retry mechanism test passed' : '❌ Retry mechanism test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Retry Mechanism',
        passed: false,
        error: error.message
      });
      console.log('❌ Retry mechanism test failed:', error.message);
    }
  }

  /**
   * Test 3: Circuit Breaker
   */
  async testCircuitBreaker() {
    console.log('🔍 Testing Circuit Breaker...');
    
    try {
      // Simulate multiple failures to trigger circuit breaker
      const webhookData = {
        orderId: 'TEST-CIRCUIT-001',
        amount: 30000,
        state: 'COMPLETED',
        isSuccess: true,
        isFailure: false,
        fullPayload: { test: 'circuit_breaker' }
      };
      
      const correlationId = 'TEST-CIRCUIT';
      
      // Mock a failing processor
      const originalProcessWebhook = this.processor.processWebhook;
      this.processor.processWebhook = async () => {
        throw new Error('Simulated circuit breaker failure');
      };
      
      // Trigger multiple failures
      for (let i = 0; i < 6; i++) {
        try {
          await this.processor.processWebhook(webhookData, correlationId);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Check if circuit breaker is open
      const circuitOpen = this.processor.isCircuitOpen();
      
      // Restore original method
      this.processor.processWebhook = originalProcessWebhook;
      
      this.testResults.push({
        test: 'Circuit Breaker',
        passed: circuitOpen,
        details: {
          circuitOpen,
          failureCount: this.processor.failureCount
        }
      });
      
      console.log(circuitOpen ? '✅ Circuit breaker test passed' : '❌ Circuit breaker test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Circuit Breaker',
        passed: false,
        error: error.message
      });
      console.log('❌ Circuit breaker test failed:', error.message);
    }
  }

  /**
   * Test 4: Queue Processing
   */
  async testQueueProcessing() {
    console.log('🔍 Testing Queue Processing...');
    
    try {
      const webhookData = {
        orderId: 'TEST-QUEUE-001',
        amount: 40000,
        state: 'COMPLETED',
        isSuccess: true,
        isFailure: false,
        fullPayload: { test: 'queue' }
      };
      
      const correlationId = 'TEST-QUEUE';
      
      // Enqueue webhook
      const webhookId = await this.queueManager.enqueueWebhook(webhookData, correlationId, 'high');
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if webhook was processed
      const webhook = await RawWebhook.findById(webhookId);
      const wasProcessed = webhook && webhook.processed;
      
      this.testResults.push({
        test: 'Queue Processing',
        passed: wasProcessed,
        details: {
          webhookId,
          processed: wasProcessed,
          webhook
        }
      });
      
      console.log(wasProcessed ? '✅ Queue processing test passed' : '❌ Queue processing test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Queue Processing',
        passed: false,
        error: error.message
      });
      console.log('❌ Queue processing test failed:', error.message);
    }
  }

  /**
   * Test 5: Reconciliation
   */
  async testReconciliation() {
    console.log('🔍 Testing Reconciliation...');
    
    try {
      // Create a draft order that should be reconciled
      const draftOrder = await orderModel.create({
        orderId: 'TEST-RECONCILE-001',
        phonepeTransactionId: 'TEST-RECONCILE-TXN-001',
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
          total: 50000
        },
        total: 50000
      });
      
      // Run reconciliation
      await this.reconciliationService.performReconciliation();
      
      // Check if order was reconciled
      const updatedOrder = await orderModel.findById(draftOrder._id);
      const wasReconciled = updatedOrder && updatedOrder.status === 'CONFIRMED';
      
      this.testResults.push({
        test: 'Reconciliation',
        passed: wasReconciled,
        details: {
          orderId: draftOrder._id,
          originalStatus: 'DRAFT',
          finalStatus: updatedOrder?.status,
          wasReconciled
        }
      });
      
      console.log(wasReconciled ? '✅ Reconciliation test passed' : '❌ Reconciliation test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Reconciliation',
        passed: false,
        error: error.message
      });
      console.log('❌ Reconciliation test failed:', error.message);
    }
  }

  /**
   * Test 6: Error Recovery
   */
  async testErrorRecovery() {
    console.log('🔍 Testing Error Recovery...');
    
    try {
      const webhookData = {
        orderId: 'TEST-ERROR-001',
        amount: 60000,
        state: 'COMPLETED',
        isSuccess: true,
        isFailure: false,
        fullPayload: { test: 'error_recovery' }
      };
      
      const correlationId = 'TEST-ERROR';
      
      // Process webhook that will fail
      try {
        await this.processor.processWebhook(webhookData, correlationId);
      } catch (error) {
        // Expected to fail
      }
      
      // Check if webhook was stored in dead letter queue
      const deadLetterWebhook = await RawWebhook.findOne({
        orderId: webhookData.orderId,
        deadLetter: true
      });
      
      const errorRecovered = deadLetterWebhook && deadLetterWebhook.requiresManualProcessing;
      
      this.testResults.push({
        test: 'Error Recovery',
        passed: errorRecovered,
        details: {
          deadLetterWebhook: !!deadLetterWebhook,
          requiresManualProcessing: deadLetterWebhook?.requiresManualProcessing
        }
      });
      
      console.log(errorRecovered ? '✅ Error recovery test passed' : '❌ Error recovery test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Error Recovery',
        passed: false,
        error: error.message
      });
      console.log('❌ Error recovery test failed:', error.message);
    }
  }

  /**
   * Test 7: High Load
   */
  async testHighLoad() {
    console.log('🔍 Testing High Load...');
    
    try {
      const webhookCount = 100;
      const webhooks = [];
      
      // Create multiple webhooks
      for (let i = 0; i < webhookCount; i++) {
        const webhookData = {
          orderId: `TEST-LOAD-${i.toString().padStart(3, '0')}`,
          amount: 10000 + (i * 100),
          state: 'COMPLETED',
          isSuccess: true,
          isFailure: false,
          fullPayload: { test: 'high_load', index: i }
        };
        
        webhooks.push(webhookData);
      }
      
      const startTime = Date.now();
      
      // Process all webhooks concurrently
      const promises = webhooks.map((webhookData, index) => 
        this.queueManager.enqueueWebhook(webhookData, `TEST-LOAD-${index}`, 'normal')
      );
      
      await Promise.all(promises);
      
      const enqueueTime = Date.now() - startTime;
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check processing results
      const processedCount = await RawWebhook.countDocuments({
        orderId: { $regex: /^TEST-LOAD-/ },
        processed: true
      });
      
      const successRate = (processedCount / webhookCount) * 100;
      const loadTestPassed = successRate >= 95;
      
      this.testResults.push({
        test: 'High Load',
        passed: loadTestPassed,
        details: {
          webhookCount,
          processedCount,
          successRate: Math.round(successRate),
          enqueueTime
        }
      });
      
      console.log(loadTestPassed ? '✅ High load test passed' : '❌ High load test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'High Load',
        passed: false,
        error: error.message
      });
      console.log('❌ High load test failed:', error.message);
    }
  }

  /**
   * Test 8: Network Failures
   */
  async testNetworkFailures() {
    console.log('🔍 Testing Network Failures...');
    
    try {
      const webhookData = {
        orderId: 'TEST-NETWORK-001',
        amount: 70000,
        state: 'COMPLETED',
        isSuccess: true,
        isFailure: false,
        fullPayload: { test: 'network_failure' }
      };
      
      const correlationId = 'TEST-NETWORK';
      
      // Mock network failure
      const originalProcessWebhook = this.processor.processWebhook;
      this.processor.processWebhook = async () => {
        throw new Error('Network timeout');
      };
      
      // Process webhook (should fail and retry)
      try {
        await this.processor.processWebhook(webhookData, correlationId);
      } catch (error) {
        // Expected to fail
      }
      
      // Restore original method
      this.processor.processWebhook = originalProcessWebhook;
      
      // Check if webhook was queued for retry
      const retryWebhook = await RawWebhook.findOne({
        orderId: webhookData.orderId,
        retryCount: { $gt: 0 }
      });
      
      const networkFailureHandled = retryWebhook && retryWebhook.retryAfter;
      
      this.testResults.push({
        test: 'Network Failures',
        passed: networkFailureHandled,
        details: {
          retryWebhook: !!retryWebhook,
          retryCount: retryWebhook?.retryCount,
          retryAfter: retryWebhook?.retryAfter
        }
      });
      
      console.log(networkFailureHandled ? '✅ Network failure test passed' : '❌ Network failure test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Network Failures',
        passed: false,
        error: error.message
      });
      console.log('❌ Network failure test failed:', error.message);
    }
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    console.log('\n📊 WEBHOOK RELIABILITY TEST REPORT');
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
    
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (successRate < 100) {
      console.log('❌ Some tests failed. Review the failed tests and fix issues.');
    } else {
      console.log('✅ All tests passed! Webhook system is production-ready.');
    }
    
    if (successRate >= 95) {
      console.log('✅ Webhook system meets industry standards for reliability.');
    } else {
      console.log('⚠️  Webhook system needs improvement before production deployment.');
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new WebhookReliabilityTest();
  test.runAllTests().then(() => {
    console.log('\n🏁 Test suite completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

export default WebhookReliabilityTest;
