#!/bin/bash
# Verification Script: Webhook Security Implementation
# Usage: ./verify-webhook-security.sh

set -e

echo "🔍 Webhook Security Verification Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Check function
check() {
  local name="$1"
  local command="$2"
  local expected="$3"
  
  echo -n "Checking $name... "
  
  if eval "$command" | grep -q "$expected"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAILED++))
    return 1
  fi
}

warn() {
  local message="$1"
  echo -e "${YELLOW}⚠️ WARNING: $message${NC}"
  ((WARNINGS++))
}

info() {
  local message="$1"
  echo "ℹ️ $message"
}

# 1. Environment Variables
echo "1️⃣ Environment Variables"
echo "------------------------"

if [ -f "backend/.env" ]; then
  check "PHONEPE_SALT_1" "grep -q 'PHONEPE_SALT_1' backend/.env && echo 'found'" "found"
  check "REDIS_HOST" "grep -q 'REDIS_HOST' backend/.env && echo 'found'" "found"
  check "MONGODB_URI replica set" "grep -q 'replicaSet' backend/.env && echo 'found'" "found"
else
  warn ".env file not found in backend/"
fi

echo ""

# 2. Database Indices
echo "2️⃣ Database Indices"
echo "-------------------"

if command -v mongosh &> /dev/null; then
  MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/shithaa_maternity_db}"
  
  # Check webhook event unique index
  if mongosh "$MONGO_URI" --quiet --eval "db.webhookevents.getIndexes().some(i => i.name === 'idx_webhook_eventid_unique')" | grep -q "true"; then
    echo -e "${GREEN}✅ PASS${NC} webhook eventId unique index"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} webhook eventId unique index missing"
    ((FAILED++))
  fi
  
  # Check order transaction ID unique index
  if mongosh "$MONGO_URI" --quiet --eval "db.orders.getIndexes().some(i => i.name === 'idx_order_phonepe_txn_unique')" | grep -q "true"; then
    echo -e "${GREEN}✅ PASS${NC} order phonepeTransactionId unique index"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} order phonepeTransactionId unique index missing"
    ((FAILED++))
  fi
  
  # Check for duplicate orders
  DUP_COUNT=$(mongosh "$MONGO_URI" --quiet --eval "db.orders.aggregate([
    {\$match: {phonepeTransactionId: {\$ne: null}}},
    {\$group: {_id: '\$phonepeTransactionId', count: {\$sum: 1}}},
    {\$match: {count: {\$gt: 1}}}
  ]).toArray().length")
  
  if [ "$DUP_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} No duplicate orders found"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} Found $DUP_COUNT duplicate order entries"
    ((FAILED++))
  fi
else
  warn "mongosh not found, skipping database checks"
fi

echo ""

# 3. Redis Connection
echo "3️⃣ Redis Connection"
echo "-------------------"

if command -v redis-cli &> /dev/null; then
  REDIS_HOST="${REDIS_HOST:-localhost}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  
  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} PING | grep -q "PONG"; then
    echo -e "${GREEN}✅ PASS${NC} Redis connection"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} Redis connection failed"
    ((FAILED++))
  fi
else
  warn "redis-cli not found, skipping Redis checks"
fi

echo ""

# 4. NPM Packages
echo "4️⃣ NPM Packages"
echo "---------------"

if [ -f "backend/package.json" ]; then
  if grep -q '"redlock"' backend/package.json; then
    echo -e "${GREEN}✅ PASS${NC} redlock package installed"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} redlock package not found"
    ((FAILED++))
  fi
  
  if grep -q '"ioredis"' backend/package.json; then
    echo -e "${GREEN}✅ PASS${NC} ioredis package installed"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} ioredis package not found"
    ((FAILED++))
  fi
else
  warn "package.json not found"
fi

echo ""

# 5. Code Files
echo "5️⃣ Code Files Verification"
echo "---------------------------"

# Check signature verification function
if [ -f "backend/utils/phonepeSignature.js" ]; then
  if grep -q "createHmac" backend/utils/phonepeSignature.js; then
    echo -e "${GREEN}✅ PASS${NC} HMAC signature verification present"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} HMAC signature verification missing"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} phonepeSignature.js not found"
  ((FAILED++))
fi

# Check webhook controller
if [ -f "backend/controllers/enhancedWebhookController.js" ]; then
  if grep -q "verifyPhonePeSignature" backend/controllers/enhancedWebhookController.js; then
    echo -e "${GREEN}✅ PASS${NC} Webhook signature verification call present"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} Webhook signature verification missing"
    ((FAILED++))
  fi
  
  # Check if ACK happens after verification (look for res.status(200) after signature check)
  if grep -A 20 "verifyPhonePeSignature" backend/controllers/enhancedWebhookController.js | grep -q "res.status(200)"; then
    echo -e "${GREEN}✅ PASS${NC} 200 ACK after signature verification"
    ((PASSED++))
  else
    warn "Unable to verify ACK timing (manual review needed)"
  fi
else
  echo -e "${RED}❌ FAIL${NC} enhancedWebhookController.js not found"
  ((FAILED++))
fi

echo ""

# 6. Backend Health
echo "6️⃣ Backend Health"
echo "-----------------"

BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"

if curl -f -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✅ PASS${NC} Backend health check"
  ((PASSED++))
else
  echo -e "${RED}❌ FAIL${NC} Backend health check failed"
  ((FAILED++))
fi

# Test webhook endpoint (should reject without signature)
WEBHOOK_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/payment/phonepe/webhook" \
  -H "Content-Type: application/json" \
  -d '{"test":true}')

if [ "$WEBHOOK_TEST" == "401" ]; then
  echo -e "${GREEN}✅ PASS${NC} Webhook rejects requests without signature"
  ((PASSED++))
elif [ "$WEBHOOK_TEST" == "200" ]; then
  echo -e "${RED}❌ FAIL${NC} Webhook accepts requests without signature (CRITICAL)"
  ((FAILED++))
else
  warn "Webhook endpoint returned unexpected status: $WEBHOOK_TEST"
fi

echo ""

# 7. Monitoring
echo "7️⃣ Monitoring & Logging"
echo "------------------------"

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
  if pm2 list | grep -q "shithaa-backend"; then
    echo -e "${GREEN}✅ PASS${NC} Backend running in PM2"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} Backend not running in PM2"
    ((FAILED++))
  fi
else
  warn "PM2 not found"
fi

# Check recent webhook processing
if command -v mongosh &> /dev/null; then
  RECENT_WEBHOOKS=$(mongosh "$MONGO_URI" --quiet --eval "
    db.webhookevents.find({
      receivedAt: {\$gte: new Date(Date.now() - 24*60*60*1000)}
    }).count()
  " 2>/dev/null || echo "0")
  
  info "Webhooks processed in last 24h: $RECENT_WEBHOOKS"
  
  FAILED_WEBHOOKS=$(mongosh "$MONGO_URI" --quiet --eval "
    db.webhookevents.find({
      status: 'failed',
      receivedAt: {\$gte: new Date(Date.now() - 24*60*60*1000)}
    }).count()
  " 2>/dev/null || echo "0")
  
  if [ "$FAILED_WEBHOOKS" -gt 0 ]; then
    warn "Failed webhooks in last 24h: $FAILED_WEBHOOKS (investigate manually)"
  else
    echo -e "${GREEN}✅ PASS${NC} No failed webhooks in last 24h"
    ((PASSED++))
  fi
fi

echo ""
echo "========================================"
echo "📊 VERIFICATION SUMMARY"
echo "========================================"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo -e "${YELLOW}⚠️ Warnings: $WARNINGS${NC}"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}🎉 All critical checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run unit tests: npm test"
  echo "  2. Run k6 load test: k6 run k6-webhook-duplicate-delivery.js"
  echo "  3. Monitor logs for 24 hours: pm2 logs shithaa-backend"
  exit 0
else
  echo -e "${RED}⚠️ Some checks failed. Review above for details.${NC}"
  echo ""
  echo "Fix failures before deploying to production:"
  echo "  1. Review PAYMENT_WEBHOOK_FORENSIC_AUDIT.md"
  echo "  2. Apply missing patches"
  echo "  3. Run this script again"
  exit 1
fi

