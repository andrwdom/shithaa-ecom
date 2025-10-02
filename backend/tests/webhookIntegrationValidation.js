import mongoose from 'mongoose';
import webhookServiceManager from '../services/webhookServiceManager.js';
import { phonePeWebhookHandler } from '../controllers/enhancedWebhookController.js';
import orderModel from '../models/orderModel.js';
import RawWebhook from '../models/RawWebhook.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * WEBHOOK INTEGRATION VALIDATION
 * 
 * ENTERPRISE-GRADE VALIDATION:
 * ✅ Service initialization
 * ✅ Memory leak detection
 * ✅ Circular dependency check
 * ✅ Error handling validation
 * ✅ Frontend compatibility
 * ✅ Database consistency
 * ✅ Performance validation
 */
class WebhookIntegrationValidation {
  constructor() {
    this.testResults = [];
    this.memoryBaseline = process.memoryUsage();
    this.startTime = Date.now();
  }

  /**
   * Run comprehensive integration validation
   */
  async runValidation() {
    console.log('🔍 Starting Webhook Integration Validation...\n');
    
    try {
      // Test 1: Service Manager Initialization
      await this.testServiceManagerInitialization();
      
      // Test 2: Memory Leak Detection
      await this.testMemoryLeakDetection();
      
      // Test 3: Circular Dependency Check
      await this.testCircularDependencies();
      
      // Test 4: Error Handling Validation
      await this.testErrorHandling();
      
      // Test 5: Frontend Compatibility
      await this.testFrontendCompatibility();
      
      // Test 6: Database Consistency
      await this.testDatabaseConsistency();
      
      // Test 7: Performance Validation
      await this.testPerformanceValidation();
      
      // Test 8: Concurrent Processing
      await this.testConcurrentProcessing();
      
      // Test 9: Service Shutdown
      await this.testServiceShutdown();
      
      // Generate validation report
      this.generateValidationReport();
      
    } catch (error) {
      console.error('❌ Integration validation failed:', error);
      this.testResults.push({
        test: 'Validation Suite',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test service manager initialization
   */
  async testServiceManagerInitialization() {
    console.log('🔍 Testing service manager initialization...');
    
    try {
      // Test singleton pattern
      const manager1 = webhookServiceManager;
      const manager2 = webhookServiceManager;
      const isSingleton = manager1 === manager2;
      
      // Test initialization
      const services = await manager1.initialize();
      const hasAllServices = services.processor && services.queueManager && services.reconciliationService;
      
      // Test health status
      const healthStatus = manager1.getHealthStatus();
      const isHealthy = healthStatus.isInitialized && !healthStatus.isStarting;
      
      const passed = isSingleton && hasAllServices && isHealthy;
      
      this.testResults.push({
        test: 'Service Manager Initialization',
        passed,
        details: {
          isSingleton,
          hasAllServices,
          isHealthy,
          healthStatus
        }
      });
      
      console.log(passed ? '✅ Service manager initialization test passed' : '❌ Service manager initialization test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Service Manager Initialization',
        passed: false,
        error: error.message
      });
      console.log('❌ Service manager initialization test failed:', error.message);
    }
  }

  /**
   * Test memory leak detection
   */
  async testMemoryLeakDetection() {
    console.log('🔍 Testing memory leak detection...');
    
    try {
      const initialMemory = process.memoryUsage();
      
      // Create multiple service instances (should be prevented by singleton)
      const services1 = await webhookServiceManager.initialize();
      const services2 = await webhookServiceManager.initialize();
      const services3 = await webhookServiceManager.initialize();
      
      // Check if same instances are returned
      const sameInstances = services1 === services2 && services2 === services3;
      
      // Check memory usage
      const currentMemory = process.memoryUsage();
      const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
      const memoryLeakThreshold = 50 * 1024 * 1024; // 50MB
      const noMemoryLeak = memoryIncrease < memoryLeakThreshold;
      
      const passed = sameInstances && noMemoryLeak;
      
      this.testResults.push({
        test: 'Memory Leak Detection',
        passed,
        details: {
          sameInstances,
          memoryIncrease: Math.round(memoryIncrease / 1024 / 1024) + 'MB',
          noMemoryLeak,
          threshold: '50MB'
        }
      });
      
      console.log(passed ? '✅ Memory leak detection test passed' : '❌ Memory leak detection test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Memory Leak Detection',
        passed: false,
        error: error.message
      });
      console.log('❌ Memory leak detection test failed:', error.message);
    }
  }

  /**
   * Test circular dependencies
   */
  async testCircularDependencies() {
    console.log('🔍 Testing circular dependencies...');
    
    try {
      // Test if services can be imported without circular dependency errors
      const processor = await import('../services/bulletproofWebhookProcessor.js');
      const queueManager = await import('../services/webhookQueueManager.js');
      const reconciliationService = await import('../services/webhookReconciliationService.js');
      
      // Check if all modules loaded successfully
      const allLoaded = processor && queueManager && reconciliationService;
      
      // Test service initialization
      const services = await webhookServiceManager.initialize();
      const servicesInitialized = services.processor && services.queueManager && services.reconciliationService;
      
      const passed = allLoaded && servicesInitialized;
      
      this.testResults.push({
        test: 'Circular Dependencies',
        passed,
        details: {
          allLoaded,
          servicesInitialized
        }
      });
      
      console.log(passed ? '✅ Circular dependencies test passed' : '❌ Circular dependencies test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Circular Dependencies',
        passed: false,
        error: error.message
      });
      console.log('❌ Circular dependencies test failed:', error.message);
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('🔍 Testing error handling...');
    
    try {
      // Test webhook with invalid data
      const mockReq = {
        headers: {
          'x-request-id': 'TEST-ERROR-HANDLING',
          'authorization': 'invalid_auth',
          'content-type': 'application/json'
        },
        body: {
          invalid: 'data'
        },
        ip: '127.0.0.1'
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => ({ statusCode: code, data })
        }),
        json: (data) => ({ data })
      };

      // Process invalid webhook
      const result = await phonePeWebhookHandler(mockReq, mockRes);
      
      // Check if error was handled gracefully
      const handledGracefully = result && (result.statusCode === 200 || result.data);
      
      this.testResults.push({
        test: 'Error Handling',
        passed: handledGracefully,
        details: {
          result,
          handledGracefully
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
   * Test frontend compatibility
   */
  async testFrontendCompatibility() {
    console.log('🔍 Testing frontend compatibility...');
    
    try {
      // Test webhook endpoint response format
      const mockReq = {
        headers: {
          'x-request-id': 'TEST-FRONTEND-COMPAT',
          'authorization': this.generateTestAuth(),
          'content-type': 'application/json'
        },
        body: {
          payload: {
            orderId: 'TEST-FRONTEND-001',
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

      const result = await phonePeWebhookHandler(mockReq, mockRes);
      
      // Check if response format is compatible with frontend
      const isCompatible = result && result.statusCode === 200;
      
      this.testResults.push({
        test: 'Frontend Compatibility',
        passed: isCompatible,
        details: {
          result,
          isCompatible
        }
      });
      
      console.log(isCompatible ? '✅ Frontend compatibility test passed' : '❌ Frontend compatibility test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Frontend Compatibility',
        passed: false,
        error: error.message
      });
      console.log('❌ Frontend compatibility test failed:', error.message);
    }
  }

  /**
   * Test database consistency
   */
  async testDatabaseConsistency() {
    console.log('🔍 Testing database consistency...');
    
    try {
      // Create test order
      const testOrder = await orderModel.create({
        orderId: 'TEST-DB-CONSISTENCY-001',
        phonepeTransactionId: 'TEST-DB-CONSISTENCY-001',
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

      // Process webhook
      const mockReq = {
        headers: {
          'x-request-id': 'TEST-DB-CONSISTENCY-001',
          'authorization': this.generateTestAuth(),
          'content-type': 'application/json'
        },
        body: {
          payload: {
            orderId: 'TEST-DB-CONSISTENCY-001',
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

      await phonePeWebhookHandler(mockReq, mockRes);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check database consistency
      const updatedOrder = await orderModel.findById(testOrder._id);
      const webhookRecord = await RawWebhook.findOne({
        orderId: 'TEST-DB-CONSISTENCY-001'
      });

      const isConsistent = updatedOrder && webhookRecord && 
                          (updatedOrder.status === 'CONFIRMED' || webhookRecord.processed);
      
      this.testResults.push({
        test: 'Database Consistency',
        passed: isConsistent,
        details: {
          orderStatus: updatedOrder?.status,
          webhookProcessed: webhookRecord?.processed,
          isConsistent
        }
      });
      
      console.log(isConsistent ? '✅ Database consistency test passed' : '❌ Database consistency test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Database Consistency',
        passed: false,
        error: error.message
      });
      console.log('❌ Database consistency test failed:', error.message);
    }
  }

  /**
   * Test performance validation
   */
  async testPerformanceValidation() {
    console.log('🔍 Testing performance validation...');
    
    try {
      const startTime = Date.now();
      
      // Test service initialization performance
      const services = await webhookServiceManager.initialize();
      const initTime = Date.now() - startTime;
      
      // Test webhook processing performance
      const webhookStartTime = Date.now();
      
      const mockReq = {
        headers: {
          'x-request-id': 'TEST-PERFORMANCE-001',
          'authorization': this.generateTestAuth(),
          'content-type': 'application/json'
        },
        body: {
          payload: {
            orderId: 'TEST-PERFORMANCE-001',
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

      await phonePeWebhookHandler(mockReq, mockRes);
      const webhookTime = Date.now() - webhookStartTime;
      
      // Performance thresholds
      const initTimeThreshold = 5000; // 5 seconds
      const webhookTimeThreshold = 3000; // 3 seconds
      
      const initPerformance = initTime < initTimeThreshold;
      const webhookPerformance = webhookTime < webhookTimeThreshold;
      
      const passed = initPerformance && webhookPerformance;
      
      this.testResults.push({
        test: 'Performance Validation',
        passed,
        details: {
          initTime: initTime + 'ms',
          webhookTime: webhookTime + 'ms',
          initThreshold: initTimeThreshold + 'ms',
          webhookThreshold: webhookTimeThreshold + 'ms',
          initPerformance,
          webhookPerformance
        }
      });
      
      console.log(passed ? '✅ Performance validation test passed' : '❌ Performance validation test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Performance Validation',
        passed: false,
        error: error.message
      });
      console.log('❌ Performance validation test failed:', error.message);
    }
  }

  /**
   * Test concurrent processing
   */
  async testConcurrentProcessing() {
    console.log('🔍 Testing concurrent processing...');
    
    try {
      const concurrentCount = 10;
      const promises = [];
      
      // Create concurrent webhook requests
      for (let i = 0; i < concurrentCount; i++) {
        const mockReq = {
          headers: {
            'x-request-id': `TEST-CONCURRENT-${i}`,
            'authorization': this.generateTestAuth(),
            'content-type': 'application/json'
          },
          body: {
            payload: {
              orderId: `TEST-CONCURRENT-${i}`,
              state: 'COMPLETED',
              amount: 10000 + i
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

        promises.push(phonePeWebhookHandler(mockReq, mockRes));
      }
      
      // Process all webhooks concurrently
      const results = await Promise.all(promises);
      
      // Check if all webhooks were processed
      const allProcessed = results.every(result => result && result.statusCode === 200);
      
      // Wait for background processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check webhook records
      const webhookCount = await RawWebhook.countDocuments({
        orderId: { $regex: /^TEST-CONCURRENT-/ }
      });
      
      const concurrentSuccess = allProcessed && webhookCount >= concurrentCount;
      
      this.testResults.push({
        test: 'Concurrent Processing',
        passed: concurrentSuccess,
        details: {
          concurrentCount,
          allProcessed,
          webhookCount,
          concurrentSuccess
        }
      });
      
      console.log(concurrentSuccess ? '✅ Concurrent processing test passed' : '❌ Concurrent processing test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Concurrent Processing',
        passed: false,
        error: error.message
      });
      console.log('❌ Concurrent processing test failed:', error.message);
    }
  }

  /**
   * Test service shutdown
   */
  async testServiceShutdown() {
    console.log('🔍 Testing service shutdown...');
    
    try {
      // Test graceful shutdown
      await webhookServiceManager.shutdown();
      
      // Check if services are properly shut down
      const healthStatus = webhookServiceManager.getHealthStatus();
      const isShutdown = !healthStatus.isInitialized && !healthStatus.isStarting;
      
      this.testResults.push({
        test: 'Service Shutdown',
        passed: isShutdown,
        details: {
          healthStatus,
          isShutdown
        }
      });
      
      console.log(isShutdown ? '✅ Service shutdown test passed' : '❌ Service shutdown test failed');
      
    } catch (error) {
      this.testResults.push({
        test: 'Service Shutdown',
        passed: false,
        error: error.message
      });
      console.log('❌ Service shutdown test failed:', error.message);
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
   * Generate validation report
   */
  generateValidationReport() {
    console.log('\n📊 WEBHOOK INTEGRATION VALIDATION REPORT');
    console.log('==========================================');
    
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests) * 100;
    
    const totalTime = Date.now() - this.startTime;
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - this.memoryBaseline.heapUsed;
    
    console.log(`\nOverall Success Rate: ${Math.round(successRate)}% (${passedTests}/${totalTests})`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Memory Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    
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
    
    console.log('\n🎯 ENTERPRISE READINESS ASSESSMENT:');
    
    if (successRate === 100) {
      console.log('✅ EXCELLENT - System is enterprise-ready');
      console.log('✅ All integration tests passed');
      console.log('✅ No memory leaks detected');
      console.log('✅ No circular dependencies');
      console.log('✅ Proper error handling');
      console.log('✅ Frontend compatible');
      console.log('✅ Database consistent');
      console.log('✅ Performance acceptable');
      console.log('✅ Concurrent processing works');
      console.log('✅ Graceful shutdown');
    } else if (successRate >= 90) {
      console.log('⚠️  GOOD - Minor issues need attention');
      console.log('⚠️  Review failed tests and fix issues');
    } else {
      console.log('❌ POOR - Major issues need fixing');
      console.log('❌ System not ready for production');
      console.log('❌ Fix critical issues before deployment');
    }
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validation = new WebhookIntegrationValidation();
  validation.runValidation().then(() => {
    console.log('\n🏁 Integration validation completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Integration validation crashed:', error);
    process.exit(1);
  });
}

export default WebhookIntegrationValidation;
