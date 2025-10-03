#!/bin/bash

# Webhook Idempotency Test Script (cURL version)
# Tests webhook idempotency using cURL commands

BASE_URL="http://localhost:4000"
WEBHOOK_ENDPOINT="/api/payment/phonepe/webhook"
USERNAME="${PHONEPE_CALLBACK_USERNAME:-test_user}"
PASSWORD="${PHONEPE_CALLBACK_PASSWORD:-test_pass}"

# Generate test order ID
ORDER_ID="test_order_$(date +%s)"
AMOUNT=10000

echo "🧪 Webhook Idempotency Test (cURL)"
echo "=================================="
echo "🌐 Base URL: $BASE_URL"
echo "📡 Webhook Endpoint: $WEBHOOK_ENDPOINT"
echo "🔐 Username: $USERNAME"
echo "🔑 Password: ${PASSWORD:0:3}***"
echo "📋 Test Order ID: $ORDER_ID"
echo "💰 Test Amount: $AMOUNT paise"
echo ""

# Function to generate signature
generate_signature() {
    local payload="$1"
    local username="$2"
    local password="$3"
    echo -n "${username}:${password}" | sha256sum | cut -d' ' -f1
}

# Function to send webhook
send_webhook() {
    local order_id="$1"
    local amount="$2"
    local state="${3:-COMPLETED}"
    local request_id="$4"
    
    local payload=$(cat <<EOF
{
  "payload": {
    "orderId": "$order_id",
    "merchantTransactionId": "$order_id",
    "transactionId": "txn_$order_id",
    "amount": $amount,
    "state": "$state",
    "status": "$state",
    "currency": "INR",
    "paymentInstrument": {
      "type": "UPI",
      "utr": "utr_$order_id"
    }
  },
  "event": "payment.completed"
}
EOF
)
    
    local signature=$(generate_signature "$payload" "$USERNAME" "$PASSWORD")
    
    echo "🔄 Sending webhook for order $order_id (Request ID: $request_id)..."
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "X-PhonePe-Signature: $signature" \
        -H "X-Request-ID: $request_id" \
        -H "User-Agent: WebhookIdempotencyTest/1.0" \
        -d "$payload" \
        "$BASE_URL$WEBHOOK_ENDPOINT")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n -1)
    
    echo "   Status: $http_code"
    echo "   Response: $body"
    echo ""
    
    return $http_code
}

# Test 1: Send multiple concurrent requests with same order ID
echo "🧪 Test 1: Concurrent Duplicate Requests"
echo "========================================"

# Send 3 requests with the same order ID
for i in {1..3}; do
    send_webhook "$ORDER_ID" "$AMOUNT" "COMPLETED" "test_$(date +%s)_$i" &
done

# Wait for all background processes to complete
wait

echo "✅ Test 1 completed - sent 3 concurrent requests with same order ID"
echo ""

# Test 2: Send duplicate request after processing
echo "🧪 Test 2: Duplicate After Processing"
echo "===================================="

sleep 2  # Wait a bit for processing

send_webhook "$ORDER_ID" "$AMOUNT" "COMPLETED" "duplicate_$(date +%s)"

echo "✅ Test 2 completed - sent duplicate request after processing"
echo ""

# Test 3: Different order IDs
echo "🧪 Test 3: Different Order IDs"
echo "=============================="

for i in {1..3}; do
    different_order_id="test_order_$(date +%s)_$i"
    send_webhook "$different_order_id" "$AMOUNT" "COMPLETED" "different_$(date +%s)_$i"
    sleep 0.5
done

echo "✅ Test 3 completed - sent requests with different order IDs"
echo ""

# Test 4: Invalid signature
echo "🧪 Test 4: Invalid Signature"
echo "============================"

invalid_payload=$(cat <<EOF
{
  "payload": {
    "orderId": "test_invalid_$(date +%s)",
    "merchantTransactionId": "test_invalid_$(date +%s)",
    "transactionId": "txn_invalid_$(date +%s)",
    "amount": $AMOUNT,
    "state": "COMPLETED",
    "status": "COMPLETED",
    "currency": "INR"
  },
  "event": "payment.completed"
}
EOF
)

echo "🔄 Sending webhook with invalid signature..."
response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-PhonePe-Signature: invalid_signature" \
    -H "X-Request-ID: invalid_$(date +%s)" \
    -H "User-Agent: WebhookIdempotencyTest/1.0" \
    -d "$invalid_payload" \
    "$BASE_URL$WEBHOOK_ENDPOINT")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

echo "   Status: $http_code"
echo "   Response: $body"
echo ""

echo "✅ Test 4 completed - sent request with invalid signature"
echo ""

# Test 5: Missing order ID
echo "🧪 Test 5: Missing Order ID"
echo "==========================="

missing_order_payload=$(cat <<EOF
{
  "payload": {
    "amount": $AMOUNT,
    "state": "COMPLETED",
    "status": "COMPLETED",
    "currency": "INR"
  },
  "event": "payment.completed"
}
EOF
)

signature=$(generate_signature "$missing_order_payload" "$USERNAME" "$PASSWORD")

echo "🔄 Sending webhook with missing order ID..."
response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "X-PhonePe-Signature: $signature" \
    -H "X-Request-ID: missing_$(date +%s)" \
    -H "User-Agent: WebhookIdempotencyTest/1.0" \
    -d "$missing_order_payload" \
    "$BASE_URL$WEBHOOK_ENDPOINT")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

echo "   Status: $http_code"
echo "   Response: $body"
echo ""

echo "✅ Test 5 completed - sent request with missing order ID"
echo ""

# Test 6: Check webhook events
echo "🧪 Test 6: Check Webhook Events"
echo "==============================="

echo "🔄 Fetching webhook events from database..."
response=$(curl -s -w "\n%{http_code}" \
    -X GET \
    -H "Content-Type: application/json" \
    "$BASE_URL/api/webhook-management/events?limit=10")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n -1)

echo "   Status: $http_code"
echo "   Response: $body"
echo ""

echo "✅ Test 6 completed - checked webhook events"
echo ""

echo "🎉 All tests completed!"
echo ""
echo "📊 Summary:"
echo "==========="
echo "✅ Test 1: Concurrent duplicate requests"
echo "✅ Test 2: Duplicate after processing"
echo "✅ Test 3: Different order IDs"
echo "✅ Test 4: Invalid signature"
echo "✅ Test 5: Missing order ID"
echo "✅ Test 6: Check webhook events"
echo ""
echo "🔍 Check the webhook events in the database to verify idempotency:"
echo "   - Only one webhook should be processed for each unique order ID"
echo "   - Duplicate webhooks should be skipped"
echo "   - Failed webhooks should be marked as failed"
echo ""
echo "💡 To check webhook events manually:"
echo "   curl -X GET \"$BASE_URL/api/webhook-management/events?limit=10\""
