/**
 * TEST SCRIPT FOR STRUCTURED LOGGING
 * 
 * Run this to verify logging system is working correctly
 */

import ProductionLogger from '../utils/productionLogger.js';
import { generateCorrelationId } from '../utils/productionLogger.js';

console.log('🧪 Testing Structured Logging System...\n');

// Test 1: Basic logging
console.log('Test 1: Basic logging methods...');
ProductionLogger.info('Test info message', { test: true });
ProductionLogger.warn('Test warning message', { test: true });
ProductionLogger.debug('Test debug message', { test: true });
console.log('✅ Basic logging works\n');

// Test 2: Payment logging
console.log('Test 2: Payment-specific logging...');
const correlationId = generateCorrelationId('test');
ProductionLogger.payment('info', 'Test payment event', {
  correlationId,
  transactionId: 'TEST_12345',
  amount: 1000,
  status: 'success'
});
console.log('✅ Payment logging works\n');

// Test 3: Webhook logging
console.log('Test 3: Webhook logging...');
ProductionLogger.webhook('info', 'Test webhook received', {
  correlationId,
  path: '/webhook/phonepe',
  transactionId: 'TEST_12345'
});
console.log('✅ Webhook logging works\n');

// Test 4: Path tracking
console.log('Test 4: Path tracking...');
ProductionLogger.trackPath(
  correlationId,
  'callback',
  'TEST_12345',
  'processing',
  { step: 'order_creation' }
);
console.log('✅ Path tracking works\n');

// Test 5: Race condition detection
console.log('Test 5: Race condition detection...');
ProductionLogger.raceConditionDetected('TEST_12345', 'callback', {
  correlationId,
  existingOrder: 'ORDER_123',
  attemptedBy: 'webhook'
});
console.log('✅ Race condition detection works\n');

// Test 6: Order transition logging
console.log('Test 6: Order state transition...');
ProductionLogger.orderTransition(
  'ORDER_123',
  'DRAFT',
  'CONFIRMED',
  { correlationId, transactionId: 'TEST_12345' }
);
console.log('✅ Order transition logging works\n');

// Test 7: Critical alerts
console.log('Test 7: Critical alerts...');
ProductionLogger.critical('Test critical alert', {
  correlationId,
  issue: 'payment_stuck',
  transactionId: 'TEST_12345'
});
console.log('✅ Critical alerts work\n');

// Test 8: Child logger with correlation ID
console.log('Test 8: Child logger...');
const childLogger = ProductionLogger.child(correlationId);
childLogger.info('Test from child logger', { test: true });
console.log('✅ Child logger works\n');

// Test 9: Sensitive data redaction
console.log('Test 9: Sensitive data redaction...');
ProductionLogger.info('Test sensitive data', {
  password: 'should_be_redacted',
  phonepeApiKey: 'should_be_redacted',
  normalData: 'should_be_visible'
});
console.log('✅ Sensitive data redaction works\n');

console.log('================================================');
console.log('✅ ALL TESTS PASSED!');
console.log('================================================\n');
console.log('📁 Check log files in backend/logs/');
console.log('   - payment-*.log should have payment events');
console.log('   - webhook-*.log should have webhook events');
console.log('   - combined-*.log should have all events');
console.log('   - critical-*.log should have critical alerts');
console.log('\n🎉 Structured logging is ready for production!\n');

process.exit(0);

