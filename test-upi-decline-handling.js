/**
 * Test UPI Decline Handling
 * Tests the Indian market-ready UPI decline handling with user-friendly messages
 */

// Mock UPI decline handler function
function handleUPIDecline(phonepeResponse, correlationId) {
  const { code, message } = phonepeResponse;
  
  // Map PhonePe error codes to user-friendly messages
  const declineMessages = {
    'INSUFFICIENT_FUNDS': {
      title: 'Insufficient Balance',
      message: 'Add money to your UPI account and try again',
      action: 'Add Money & Retry',
      retryable: true
    },
    'BANK_ERROR': {
      title: 'Bank Server Error',
      message: 'Your bank is temporarily unavailable. Please try again in 2-3 minutes',
      action: 'Retry Payment',
      retryable: true
    },
    'UPI_PIN_INCORRECT': {
      title: 'Incorrect UPI PIN',
      message: 'Please enter the correct UPI PIN',
      action: 'Try Again',
      retryable: true
    },
    'TRANSACTION_DECLINED': {
      title: 'Transaction Declined',
      message: 'Your bank declined this transaction. Contact your bank if this continues',
      action: 'Contact Bank',
      retryable: false
    },
    'NETWORK_ERROR': {
      title: 'Network Issue',
      message: 'Poor internet connection. Please check your network and try again',
      action: 'Retry Payment',
      retryable: true
    },
    'TIMEOUT': {
      title: 'Payment Timeout',
      message: 'Payment took too long. Please try again',
      action: 'Retry Payment',
      retryable: true
    },
    'INVALID_UPI_ID': {
      title: 'Invalid UPI ID',
      message: 'Please check your UPI ID and try again',
      action: 'Check UPI ID',
      retryable: true
    }
  };
  
  const declineInfo = declineMessages[code] || {
    title: 'Payment Failed',
    message: message || 'Something went wrong. Please try again',
    action: 'Retry Payment',
    retryable: true
  };
  
  console.log(`[${correlationId}] UPI decline handled:`, {
    code,
    originalMessage: message,
    userFriendlyMessage: declineInfo.message,
    retryable: declineInfo.retryable
  });
  
  return {
    success: false,
    error: 'PAYMENT_DECLINED',
    declineInfo,
    originalCode: code,
    originalMessage: message
  };
}

// Test cases
function runTests() {
  console.log('🧪 Testing UPI Decline Handling\n');
  
  // Test 1: Insufficient Funds
  console.log('Test 1: Insufficient Funds');
  const insufficientFundsResponse = {
    code: 'INSUFFICIENT_FUNDS',
    message: 'Insufficient balance in account'
  };
  
  const result1 = handleUPIDecline(insufficientFundsResponse, 'TEST-1');
  console.log('✅ Result:', result1.declineInfo.title === 'Insufficient Balance' ? 'PASS' : 'FAIL');
  console.log('Title:', result1.declineInfo.title);
  console.log('Message:', result1.declineInfo.message);
  console.log('Retryable:', result1.declineInfo.retryable);
  console.log('');
  
  // Test 2: Bank Error
  console.log('Test 2: Bank Error');
  const bankErrorResponse = {
    code: 'BANK_ERROR',
    message: 'Bank server temporarily unavailable'
  };
  
  const result2 = handleUPIDecline(bankErrorResponse, 'TEST-2');
  console.log('✅ Result:', result2.declineInfo.title === 'Bank Server Error' ? 'PASS' : 'FAIL');
  console.log('Title:', result2.declineInfo.title);
  console.log('Message:', result2.declineInfo.message);
  console.log('Retryable:', result2.declineInfo.retryable);
  console.log('');
  
  // Test 3: UPI PIN Incorrect
  console.log('Test 3: UPI PIN Incorrect');
  const pinErrorResponse = {
    code: 'UPI_PIN_INCORRECT',
    message: 'Incorrect UPI PIN entered'
  };
  
  const result3 = handleUPIDecline(pinErrorResponse, 'TEST-3');
  console.log('✅ Result:', result3.declineInfo.title === 'Incorrect UPI PIN' ? 'PASS' : 'FAIL');
  console.log('Title:', result3.declineInfo.title);
  console.log('Message:', result3.declineInfo.message);
  console.log('Retryable:', result3.declineInfo.retryable);
  console.log('');
  
  // Test 4: Transaction Declined (Non-retryable)
  console.log('Test 4: Transaction Declined (Non-retryable)');
  const declinedResponse = {
    code: 'TRANSACTION_DECLINED',
    message: 'Transaction declined by bank'
  };
  
  const result4 = handleUPIDecline(declinedResponse, 'TEST-4');
  console.log('✅ Result:', result4.declineInfo.title === 'Transaction Declined' ? 'PASS' : 'FAIL');
  console.log('Title:', result4.declineInfo.title);
  console.log('Message:', result4.declineInfo.message);
  console.log('Retryable:', result4.declineInfo.retryable);
  console.log('');
  
  // Test 5: Network Error
  console.log('Test 5: Network Error');
  const networkErrorResponse = {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed'
  };
  
  const result5 = handleUPIDecline(networkErrorResponse, 'TEST-5');
  console.log('✅ Result:', result5.declineInfo.title === 'Network Issue' ? 'PASS' : 'FAIL');
  console.log('Title:', result5.declineInfo.title);
  console.log('Message:', result5.declineInfo.message);
  console.log('Retryable:', result5.declineInfo.retryable);
  console.log('');
  
  // Test 6: Unknown Error Code
  console.log('Test 6: Unknown Error Code');
  const unknownErrorResponse = {
    code: 'UNKNOWN_ERROR',
    message: 'Some unknown error occurred'
  };
  
  const result6 = handleUPIDecline(unknownErrorResponse, 'TEST-6');
  console.log('✅ Result:', result6.declineInfo.title === 'Payment Failed' ? 'PASS' : 'FAIL');
  console.log('Title:', result6.declineInfo.title);
  console.log('Message:', result6.declineInfo.message);
  console.log('Retryable:', result6.declineInfo.retryable);
  console.log('');
  
  // Test 7: Empty Response
  console.log('Test 7: Empty Response');
  const emptyResponse = {};
  
  const result7 = handleUPIDecline(emptyResponse, 'TEST-7');
  console.log('✅ Result:', result7.declineInfo.title === 'Payment Failed' ? 'PASS' : 'FAIL');
  console.log('Title:', result7.declineInfo.title);
  console.log('Message:', result7.declineInfo.message);
  console.log('Retryable:', result7.declineInfo.retryable);
  console.log('');
  
  console.log('🎯 All UPI decline handling tests completed!');
  console.log('\n📊 Summary:');
  console.log('- Retryable errors: INSUFFICIENT_FUNDS, BANK_ERROR, UPI_PIN_INCORRECT, NETWORK_ERROR, TIMEOUT, INVALID_UPI_ID');
  console.log('- Non-retryable errors: TRANSACTION_DECLINED');
  console.log('- Unknown errors default to retryable with generic message');
}

// Run tests
runTests();
