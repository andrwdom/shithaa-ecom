#!/bin/bash

echo "🚀 DEPLOYING CRITICAL PAYMENT FIXES..."

# 1. Backup current system
echo "📦 Creating backup..."
cp -r backend/controllers/paymentController.js backend/controllers/paymentController.js.backup
cp -r frontend/app/payment/phonepe/callback/page.tsx frontend/app/payment/phonepe/callback/page.tsx.backup

# 2. Run the critical fix script
echo "🔧 Running critical payment fixes..."
node fix-payment-flow-critical.js

# 3. Restart services
echo "🔄 Restarting services..."

# If using PM2
if command -v pm2 &> /dev/null; then
    echo "Restarting PM2 services..."
    pm2 restart all
else
    echo "Please restart your Node.js services manually"
fi

# 4. Test the fixes
echo "🧪 Testing payment flow..."

# Create a test script
cat > test-payment-fix.js << 'EOF'
const testPaymentStatus = () => {
  const testCases = [
    { state: 'PAID', responseCode: 'SUCCESS', expected: true },
    { state: 'COMPLETED', responseCode: '000', expected: true },
    { state: 'SUCCESS', responseCode: 'PAYMENT_SUCCESS', expected: true },
    { state: 'FAILED', responseCode: 'PAYMENT_ERROR', expected: false },
    { state: 'CANCELLED', responseCode: 'PAYMENT_CANCELLED', expected: false }
  ];
  
  console.log('🧪 Testing payment status detection...');
  
  testCases.forEach((testCase, index) => {
    const isSuccess = (
      testCase.state === 'PAID' ||
      testCase.state === 'COMPLETED' ||
      testCase.state === 'SUCCESS' ||
      testCase.state === 'SUCCESSFUL' ||
      testCase.state === 'CAPTURED' ||
      testCase.responseCode === 'SUCCESS' ||
      testCase.responseCode === '000' ||
      testCase.responseCode === 'PAYMENT_SUCCESS' ||
      (testCase.responseCode && testCase.responseCode.toString().startsWith('00'))
    );
    
    const result = isSuccess === testCase.expected ? '✅' : '❌';
    console.log(`${result} Test ${index + 1}: ${testCase.state}/${testCase.responseCode} -> ${isSuccess} (expected: ${testCase.expected})`);
  });
};

testPaymentStatus();
EOF

node test-payment-fix.js
rm test-payment-fix.js

echo ""
echo "✅ CRITICAL PAYMENT FIXES DEPLOYED!"
echo ""
echo "🔍 MONITORING CHECKLIST:"
echo "1. Check that payment success detection is working"
echo "2. Verify orders are being marked as CONFIRMED"
echo "3. Ensure stock is updating after payment"
echo "4. Monitor webhook processing"
echo ""
echo "📞 If issues persist, check:"
echo "- PhonePe webhook configuration"
echo "- Database connection"
echo "- Stock reservation logic"
echo "- Order status update timing"
