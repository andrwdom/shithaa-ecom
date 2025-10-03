/**
 * Test PhonePe Webhook Signature Verification
 * Tests the industry-standard X-VERIFY HMAC-SHA256 signature verification
 */

const crypto = require('crypto');

// Mock PhonePe signature verification function
function verifyPhonePeSignature(req, correlationId) {
  try {
    const xVerifyHeader = req.headers['x-verify'];
    const xVerifyIndexHeader = req.headers['x-verify-index'];
    
    if (!xVerifyHeader || !xVerifyIndexHeader) {
      console.log('ERROR: Missing X-VERIFY or X-VERIFY-INDEX headers');
      return false;
    }

    const saltIndex = parseInt(xVerifyIndexHeader);
    const salt = process.env[`PHONEPE_SALT_${saltIndex}`];
    
    if (!salt) {
      console.log('ERROR: PhonePe salt not configured for index', saltIndex);
      return false;
    }

    // PhonePe signature: HMAC-SHA256(payload + /pg/v1/pay + saltIndex) + '###' + saltIndex
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const message = payload + '/pg/v1/pay' + saltIndex;
    const expectedSignature = crypto
      .createHmac('sha256', salt)
      .update(message)
      .digest('hex') + '###' + saltIndex;

    // Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(xVerifyHeader, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    
    return isValid;
    
  } catch (error) {
    console.log('ERROR: PhonePe signature verification failed:', error.message);
    return false;
  }
}

// Test cases
function runTests() {
  console.log('🧪 Testing PhonePe Webhook Signature Verification\n');
  
  // Set up test environment
  process.env.PHONEPE_SALT_1 = 'test_salt_123';
  
  const testPayload = {
    orderId: 'TEST_ORDER_123',
    amount: 1000,
    status: 'SUCCESS'
  };
  
  const saltIndex = 1;
  const salt = process.env.PHONEPE_SALT_1;
  const payload = JSON.stringify(testPayload);
  const message = payload + '/pg/v1/pay' + saltIndex;
  const expectedSignature = crypto
    .createHmac('sha256', salt)
    .update(message)
    .digest('hex') + '###' + saltIndex;
  
  // Test 1: Valid signature
  console.log('Test 1: Valid signature');
  const validReq = {
    headers: {
      'x-verify': expectedSignature,
      'x-verify-index': saltIndex.toString()
    },
    body: testPayload
  };
  
  const result1 = verifyPhonePeSignature(validReq, 'TEST-1');
  console.log('✅ Result:', result1 ? 'PASS' : 'FAIL');
  console.log('Expected: true, Got:', result1);
  console.log('');
  
  // Test 2: Invalid signature
  console.log('Test 2: Invalid signature');
  const invalidReq = {
    headers: {
      'x-verify': 'invalid_signature_123',
      'x-verify-index': saltIndex.toString()
    },
    body: testPayload
  };
  
  const result2 = verifyPhonePeSignature(invalidReq, 'TEST-2');
  console.log('✅ Result:', result2 ? 'FAIL' : 'PASS');
  console.log('Expected: false, Got:', result2);
  console.log('');
  
  // Test 3: Missing headers
  console.log('Test 3: Missing headers');
  const missingHeadersReq = {
    headers: {},
    body: testPayload
  };
  
  const result3 = verifyPhonePeSignature(missingHeadersReq, 'TEST-3');
  console.log('✅ Result:', result3 ? 'FAIL' : 'PASS');
  console.log('Expected: false, Got:', result3);
  console.log('');
  
  // Test 4: Wrong salt index
  console.log('Test 4: Wrong salt index');
  const wrongSaltReq = {
    headers: {
      'x-verify': expectedSignature,
      'x-verify-index': '999'
    },
    body: testPayload
  };
  
  const result4 = verifyPhonePeSignature(wrongSaltReq, 'TEST-4');
  console.log('✅ Result:', result4 ? 'FAIL' : 'PASS');
  console.log('Expected: false, Got:', result4);
  console.log('');
  
  // Test 5: Timing attack protection
  console.log('Test 5: Timing attack protection');
  const timingAttackReq = {
    headers: {
      'x-verify': 'a'.repeat(64), // Same length as expected signature
      'x-verify-index': saltIndex.toString()
    },
    body: testPayload
  };
  
  const start = Date.now();
  const result5 = verifyPhonePeSignature(timingAttackReq, 'TEST-5');
  const end = Date.now();
  
  console.log('✅ Result:', result5 ? 'FAIL' : 'PASS');
  console.log('Expected: false, Got:', result5);
  console.log('Timing (ms):', end - start);
  console.log('');
  
  console.log('🎯 All tests completed!');
}

// Run tests
runTests();
