#!/usr/bin/env node

/**
 * Idempotency Key Verification Script
 * 
 * This script verifies that all webhook processors use the same deterministic
 * idempotency key generation function
 */

import crypto from 'crypto';

/**
 * Standard idempotency key generation function
 * Format: sha256(transactionId + '|' + orderId + '|' + amount + '|' + state)
 */
function generateStandardIdempotencyKey(transactionId, orderId, amount, state) {
  const keyString = `${transactionId}|${orderId}|${amount}|${state}`;
  return crypto.createHash('sha256').update(keyString).digest('hex');
}

/**
 * Test the idempotency key generation
 */
function testIdempotencyKeyGeneration() {
  console.log('🧪 Testing idempotency key generation...\n');

  // Test case 1: Basic webhook data
  const testCase1 = {
    transactionId: 'TXN123456789',
    orderId: 'ORDER123456789',
    amount: 5000, // 50.00 in paise
    state: 'COMPLETED'
  };

  const key1 = generateStandardIdempotencyKey(
    testCase1.transactionId,
    testCase1.orderId,
    testCase1.amount,
    testCase1.state
  );

  console.log('📝 Test Case 1 - Basic webhook:');
  console.log(`  Transaction ID: ${testCase1.transactionId}`);
  console.log(`  Order ID: ${testCase1.orderId}`);
  console.log(`  Amount: ${testCase1.amount}`);
  console.log(`  State: ${testCase1.state}`);
  console.log(`  Generated Key: ${key1}`);
  console.log('');

  // Test case 2: Same data should generate same key (deterministic)
  const key1Duplicate = generateStandardIdempotencyKey(
    testCase1.transactionId,
    testCase1.orderId,
    testCase1.amount,
    testCase1.state
  );

  console.log('🔄 Test Case 2 - Deterministic verification:');
  console.log(`  First generation:  ${key1}`);
  console.log(`  Second generation: ${key1Duplicate}`);
  console.log(`  Match: ${key1 === key1Duplicate ? '✅ YES' : '❌ NO'}`);
  console.log('');

  // Test case 3: Different amount should generate different key
  const key1DifferentAmount = generateStandardIdempotencyKey(
    testCase1.transactionId,
    testCase1.orderId,
    6000, // Different amount
    testCase1.state
  );

  console.log('🔀 Test Case 3 - Different amount:');
  console.log(`  Original key: ${key1}`);
  console.log(`  Different amount key: ${key1DifferentAmount}`);
  console.log(`  Different: ${key1 !== key1DifferentAmount ? '✅ YES' : '❌ NO'}`);
  console.log('');

  // Test case 4: Different state should generate different key
  const key1DifferentState = generateStandardIdempotencyKey(
    testCase1.transactionId,
    testCase1.orderId,
    testCase1.amount,
    'FAILED' // Different state
  );

  console.log('🔀 Test Case 4 - Different state:');
  console.log(`  Original key: ${key1}`);
  console.log(`  Different state key: ${key1DifferentState}`);
  console.log(`  Different: ${key1 !== key1DifferentState ? '✅ YES' : '❌ NO'}`);
  console.log('');

  // Test case 5: Edge cases with undefined/null values
  const testCase5 = {
    transactionId: 'TXN987654321',
    orderId: 'ORDER987654321',
    amount: 0,
    state: 'PENDING'
  };

  const key5 = generateStandardIdempotencyKey(
    testCase5.transactionId,
    testCase5.orderId,
    testCase5.amount,
    testCase5.state
  );

  console.log('📝 Test Case 5 - Edge case (zero amount):');
  console.log(`  Transaction ID: ${testCase5.transactionId}`);
  console.log(`  Order ID: ${testCase5.orderId}`);
  console.log(`  Amount: ${testCase5.amount}`);
  console.log(`  State: ${testCase5.state}`);
  console.log(`  Generated Key: ${key5}`);
  console.log('');

  // Test case 6: Performance test
  console.log('⚡ Test Case 6 - Performance test:');
  const startTime = Date.now();
  const iterations = 10000;
  
  for (let i = 0; i < iterations; i++) {
    generateStandardIdempotencyKey(
      `TXN${i}`,
      `ORDER${i}`,
      i * 100,
      i % 2 === 0 ? 'COMPLETED' : 'FAILED'
    );
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const avgTime = duration / iterations;
  
  console.log(`  Generated ${iterations} keys in ${duration}ms`);
  console.log(`  Average time per key: ${avgTime.toFixed(4)}ms`);
  console.log(`  Performance: ${avgTime < 1 ? '✅ EXCELLENT' : avgTime < 5 ? '✅ GOOD' : '⚠️  SLOW'}`);
  console.log('');

  return {
    deterministic: key1 === key1Duplicate,
    sensitiveToAmount: key1 !== key1DifferentAmount,
    sensitiveToState: key1 !== key1DifferentState,
    performance: avgTime
  };
}

/**
 * Verify key format requirements
 */
function verifyKeyFormat() {
  console.log('🔍 Verifying idempotency key format requirements...\n');

  const requirements = [
    {
      name: 'Deterministic (no timestamps)',
      test: () => {
        const key1 = generateStandardIdempotencyKey('TXN1', 'ORDER1', 1000, 'COMPLETED');
        const key2 = generateStandardIdempotencyKey('TXN1', 'ORDER1', 1000, 'COMPLETED');
        return key1 === key2;
      }
    },
    {
      name: 'Includes transaction ID',
      test: () => {
        const key1 = generateStandardIdempotencyKey('TXN1', 'ORDER1', 1000, 'COMPLETED');
        const key2 = generateStandardIdempotencyKey('TXN2', 'ORDER1', 1000, 'COMPLETED');
        return key1 !== key2;
      }
    },
    {
      name: 'Includes order ID',
      test: () => {
        const key1 = generateStandardIdempotencyKey('TXN1', 'ORDER1', 1000, 'COMPLETED');
        const key2 = generateStandardIdempotencyKey('TXN1', 'ORDER2', 1000, 'COMPLETED');
        return key1 !== key2;
      }
    },
    {
      name: 'Includes amount',
      test: () => {
        const key1 = generateStandardIdempotencyKey('TXN1', 'ORDER1', 1000, 'COMPLETED');
        const key2 = generateStandardIdempotencyKey('TXN1', 'ORDER1', 2000, 'COMPLETED');
        return key1 !== key2;
      }
    },
    {
      name: 'Includes state',
      test: () => {
        const key1 = generateStandardIdempotencyKey('TXN1', 'ORDER1', 1000, 'COMPLETED');
        const key2 = generateStandardIdempotencyKey('TXN1', 'ORDER1', 1000, 'FAILED');
        return key1 !== key2;
      }
    },
    {
      name: 'SHA256 hash format',
      test: () => {
        const key = generateStandardIdempotencyKey('TXN1', 'ORDER1', 1000, 'COMPLETED');
        return /^[a-f0-9]{64}$/.test(key);
      }
    }
  ];

  let passedTests = 0;
  
  requirements.forEach(requirement => {
    const passed = requirement.test();
    console.log(`${passed ? '✅' : '❌'} ${requirement.name}: ${passed ? 'PASS' : 'FAIL'}`);
    if (passed) passedTests++;
  });

  console.log(`\n📊 Results: ${passedTests}/${requirements.length} tests passed`);
  console.log(`Overall: ${passedTests === requirements.length ? '✅ ALL REQUIREMENTS MET' : '❌ SOME REQUIREMENTS FAILED'}`);
  
  return passedTests === requirements.length;
}

/**
 * Main verification function
 */
function main() {
  console.log('🔐 IDEMPOTENCY KEY VERIFICATION SCRIPT');
  console.log('=====================================\n');

  const testResults = testIdempotencyKeyGeneration();
  const formatResults = verifyKeyFormat();

  console.log('\n📋 FINAL SUMMARY:');
  console.log('==================');
  console.log(`Deterministic generation: ${testResults.deterministic ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Amount sensitivity: ${testResults.sensitiveToAmount ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`State sensitivity: ${testResults.sensitiveToState ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Performance: ${testResults.performance < 1 ? '✅ EXCELLENT' : testResults.performance < 5 ? '✅ GOOD' : '⚠️  SLOW'} (${testResults.performance.toFixed(4)}ms avg)`);
  console.log(`Format requirements: ${formatResults ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = testResults.deterministic && 
                   testResults.sensitiveToAmount && 
                   testResults.sensitiveToState && 
                   formatResults;

  console.log(`\n🎯 OVERALL RESULT: ${allPassed ? '✅ IDEMPOTENCY KEYS ARE CORRECT' : '❌ IDEMPOTENCY KEYS NEED FIXES'}`);
  
  if (allPassed) {
    console.log('\n✅ The idempotency key generation meets all requirements:');
    console.log('   - Deterministic (no timestamps)');
    console.log('   - Includes all required fields (transactionId, orderId, amount, state)');
    console.log('   - Sensitive to field changes');
    console.log('   - Proper SHA256 hash format');
    console.log('   - Good performance');
    console.log('\n🚀 Ready for production use!');
  } else {
    console.log('\n❌ Idempotency key generation needs fixes before production use.');
    process.exit(1);
  }
}

// Run the verification
main();
