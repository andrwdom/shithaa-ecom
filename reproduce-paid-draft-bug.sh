#!/bin/bash
# Reproduction Script: "Paid but Draft" Vulnerability
# This script demonstrates how the system can lose payments due to premature ACK

set -e

echo "🎯 PhonePe Webhook Security - 'Paid but Draft' Reproduction"
echo "============================================================"
echo ""
echo "This script simulates the CRITICAL vulnerability where:"
echo "  1. User pays successfully on PhonePe"
echo "  2. PhonePe sends webhook with invalid/malformed signature"
echo "  3. System ACKs with 200 OK BEFORE verifying signature"
echo "  4. PhonePe stops retrying (they got 200 OK)"
echo "  5. System rejects invalid webhook but too late"
echo "  6. Order stuck in DRAFT, customer charged, no order confirmed"
echo ""

# Configuration
BASE_URL="${BASE_URL:-https://shithaa.in}"
read -p "Enter backend URL (default: $BASE_URL): " input_url
BASE_URL="${input_url:-$BASE_URL}"

echo ""
echo "Using backend: $BASE_URL"
echo ""

# Step 1: Create legitimate payment session
echo "STEP 1: Creating payment session..."
echo "-----------------------------------"

SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/atomic-payment/create-session" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "reproduction_test_001",
        "quantity": 1,
        "size": "M",
        "price": 1000,
        "name": "Test Product for Reproduction"
      }
    ],
    "customerDetails": {
      "email": "security-test@example.com",
      "phone": "9999999999",
      "name": "Security Test User"
    },
    "shippingDetails": {
      "address": "Test Address",
      "city": "Test City",
      "state": "Test State",
      "pincode": "123456"
    },
    "totalAmount": 1000,
    "paymentMethod": "phonepe",
    "source": "reproduction_test"
  }')

if echo "$SESSION_RESPONSE" | grep -q '"success":false'; then
  echo "❌ Failed to create payment session"
  echo "Response: $SESSION_RESPONSE"
  exit 1
fi

TRANSACTION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"phonepeTransactionId":"[^"]*"' | cut -d'"' -f4)
ORDER_ID=$(echo "$SESSION_RESPONSE" | grep -o '"orderId":"[^"]*"' | cut -d'"' -f4)

echo "✅ Payment session created"
echo "   Transaction ID: $TRANSACTION_ID"
echo "   Order ID: $ORDER_ID"
echo ""
sleep 1

# Step 2: Simulate user payment
echo "STEP 2: User completes payment on PhonePe"
echo "------------------------------------------"
echo "   In real scenario:"
echo "   - User redirected to PhonePe payment page"
echo "   - User enters UPI PIN and pays ₹1000"
echo "   - PhonePe processes payment successfully"
echo "   - Money deducted from user's bank account"
echo ""
sleep 2

# Step 3: PhonePe sends webhook with malformed signature
echo "STEP 3: PhonePe sends webhook (with malformed signature)"
echo "--------------------------------------------------------"
echo "   Simulating network corruption or PhonePe bug"
echo "   Sending webhook with INVALID signature..."
echo ""

WEBHOOK_PAYLOAD=$(cat <<EOF
{
  "response": "$(echo "{\"merchantTransactionId\":\"$TRANSACTION_ID\",\"transactionId\":\"$TRANSACTION_ID\",\"state\":\"COMPLETED\",\"amount\":100000,\"responseCode\":\"SUCCESS\"}" | base64)",
  "payload": {
    "merchantTransactionId": "$TRANSACTION_ID",
    "transactionId": "$TRANSACTION_ID",
    "state": "COMPLETED",
    "amount": 100000,
    "responseCode": "SUCCESS",
    "timestamp": $(date +%s)000
  },
  "event": "PAYMENT_SUCCESS"
}
EOF
)

WEBHOOK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/api/payment/phonepe/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Verify: malformed_signature_12345###1" \
  -H "X-Verify-Index: 1" \
  -H "X-Request-Id: reproduction-test-$(date +%s)" \
  -d "$WEBHOOK_PAYLOAD")

HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
WEBHOOK_BODY=$(echo "$WEBHOOK_RESPONSE" | grep -v "HTTP_CODE:")

echo "   Webhook HTTP Status: $HTTP_CODE"
echo "   Webhook Response: $WEBHOOK_BODY"
echo ""

# Check if webhook was acknowledged
if [ "$HTTP_CODE" == "200" ]; then
  echo "⚠️  VULNERABILITY CONFIRMED:"
  echo "   System sent 200 OK despite invalid signature!"
  echo "   PhonePe will not retry this webhook."
  echo ""
elif [ "$HTTP_CODE" == "401" ]; then
  echo "✅ PATCH WORKING:"
  echo "   System correctly rejected invalid signature with 401"
  echo "   PhonePe will retry until valid signature received"
  echo ""
else
  echo "⚠️  Unexpected response code: $HTTP_CODE"
  echo ""
fi

sleep 2

# Step 4: PhonePe marks webhook as delivered
echo "STEP 4: PhonePe's behavior"
echo "--------------------------"
if [ "$HTTP_CODE" == "200" ]; then
  echo "   ❌ PhonePe sees 200 OK"
  echo "   ❌ PhonePe marks webhook as successfully delivered"
  echo "   ❌ PhonePe STOPS RETRYING"
  echo "   ❌ No more webhooks will be sent for this payment"
else
  echo "   ✅ PhonePe sees $HTTP_CODE error"
  echo "   ✅ PhonePe marks webhook as failed"
  echo "   ✅ PhonePe will retry with exponential backoff"
fi
echo ""
sleep 2

# Step 5: Check order status
echo "STEP 5: Checking order status in database"
echo "------------------------------------------"
sleep 1

# Try to get order status
ORDER_CHECK=$(curl -s "$BASE_URL/api/order/$TRANSACTION_ID" 2>/dev/null || echo '{"status":"NOT_FOUND"}')
ORDER_STATUS=$(echo "$ORDER_CHECK" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 | head -1)

echo "   Order Status: ${ORDER_STATUS:-UNKNOWN}"
echo ""

# Step 6: Analyze the impact
echo "STEP 6: Impact Analysis"
echo "-----------------------"

if [ "$HTTP_CODE" == "200" ] && [ "$ORDER_STATUS" == "DRAFT" ]; then
  echo "💥 CRITICAL VULNERABILITY CONFIRMED"
  echo ""
  echo "What happened:"
  echo "  ✅ Customer paid ₹1000 (money deducted from bank)"
  echo "  ❌ Order stuck in DRAFT status"
  echo "  ❌ Stock NOT reserved or deducted"
  echo "  ❌ Confirmation email NOT sent"
  echo "  ❌ PhonePe stopped retrying webhooks"
  echo ""
  echo "Customer experience:"
  echo "  - PhonePe shows 'Payment Successful'"
  echo "  - Your website shows 'Payment Failed' or loading forever"
  echo "  - Customer contacts support (angry)"
  echo ""
  echo "Business impact:"
  echo "  - Customer charged but no order"
  echo "  - Manual reconciliation required"
  echo "  - Potential refund + compensation"
  echo "  - Loss of customer trust"
  echo "  - Negative reviews"
  echo ""
  echo "🔧 FIX REQUIRED:"
  echo "  Apply PATCH 1 from PAYMENT_WEBHOOK_FORENSIC_AUDIT.md"
  echo "  Move 200 ACK to AFTER signature verification"
  echo ""
  
elif [ "$HTTP_CODE" == "401" ]; then
  echo "✅ PATCH WORKING CORRECTLY"
  echo ""
  echo "What happened:"
  echo "  ✅ Customer paid ₹1000 (money deducted from bank)"
  echo "  ✅ System rejected invalid webhook with 401"
  echo "  ✅ PhonePe will retry with valid signature"
  echo "  ✅ Order will be confirmed on next webhook"
  echo ""
  echo "Expected flow:"
  echo "  1. PhonePe retries webhook (in 1 min, 2 min, 5 min...)"
  echo "  2. Next webhook has valid signature"
  echo "  3. System verifies signature before ACK"
  echo "  4. System processes payment"
  echo "  5. Order confirmed, stock deducted"
  echo "  6. Customer receives confirmation"
  echo ""
  
elif [ "$ORDER_STATUS" == "CONFIRMED" ] || [ "$ORDER_STATUS" == "PAID" ]; then
  echo "✅ Order was confirmed successfully"
  echo ""
  echo "This might indicate:"
  echo "  - Webhook signature was actually valid, OR"
  echo "  - System processed despite invalid signature (concerning), OR"
  echo "  - A retry webhook already succeeded"
  echo ""
  
else
  echo "⚠️  Unexpected state"
  echo "   HTTP Code: $HTTP_CODE"
  echo "   Order Status: $ORDER_STATUS"
  echo ""
  echo "Manual investigation required."
fi

# Step 7: Recommendations
echo ""
echo "STEP 7: Recommendations"
echo "-----------------------"
echo ""
echo "If vulnerability is present:"
echo "  1. Apply patches from PAYMENT_WEBHOOK_FORENSIC_AUDIT.md"
echo "  2. Run verification: ./verify-webhook-security.sh"
echo "  3. Test again with this script"
echo "  4. Deploy to staging"
echo "  5. Run k6 load tests"
echo "  6. Deploy to production with monitoring"
echo ""
echo "Immediate mitigation (temporary):"
echo "  1. Set up reconciliation cron job"
echo "  2. Monitor draft orders > 30 minutes old"
echo "  3. Query PhonePe API for payment status"
echo "  4. Manually confirm paid draft orders"
echo ""
echo "Long-term prevention:"
echo "  1. Implement all patches from audit"
echo "  2. Add automated tests to CI/CD"
echo "  3. Set up alerting for stuck orders"
echo "  4. Regular security audits"
echo ""

echo "=========================================================="
echo "Reproduction complete!"
echo ""
echo "Transaction ID: $TRANSACTION_ID"
echo "Order ID: $ORDER_ID"
echo ""
echo "For detailed analysis, see: PAYMENT_WEBHOOK_FORENSIC_AUDIT.md"
echo "=========================================================="

