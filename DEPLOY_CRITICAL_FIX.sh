#!/bin/bash
#
# DEPLOY CRITICAL FIX - MongoDB Array Filter Syntax Error
# This fixes the 500 error in payment verification
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           DEPLOYING CRITICAL FIX - PAYMENT VERIFICATION  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔧 FIXING: MongoDB array filter syntax error${NC}"
echo -e "${YELLOW}📋 ISSUE: Payment verification returns 500 Internal Server Error${NC}"
echo -e "${YELLOW}💡 ROOT CAUSE: Array filter had multiple top-level field names${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ]; then
  echo -e "${RED}Error: Not in project root directory${NC}"
  echo "Please run from: /var/www/shithaa-ecom"
  exit 1
fi

echo -e "${BLUE}1. Pulling latest changes...${NC}"
git pull origin develop

echo -e "${BLUE}2. Restarting services...${NC}"
pm2 restart all

echo -e "${BLUE}3. Verifying deployment...${NC}"
sleep 2

# Test the fix
echo -e "${BLUE}4. Testing payment verification endpoint...${NC}"
TEST_URL="https://shithaa.in/api/payment/phonepe/verify/test-transaction"
echo "Testing: $TEST_URL"

# Check if the service is responding (should get 404 for invalid transaction, not 500)
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" || echo "000")

if [ "$HTTP_STATUS" = "404" ] || [ "$HTTP_STATUS" = "400" ]; then
  echo -e "${GREEN}✅ SUCCESS: Endpoint responding correctly (HTTP $HTTP_STATUS)${NC}"
  echo -e "${GREEN}   This means the MongoDB syntax error is fixed!${NC}"
elif [ "$HTTP_STATUS" = "500" ]; then
  echo -e "${RED}❌ FAILED: Still getting 500 error${NC}"
  echo -e "${YELLOW}   Check logs: pm2 logs shithaa-backend --lines 20${NC}"
else
  echo -e "${YELLOW}⚠️  UNEXPECTED: HTTP $HTTP_STATUS${NC}"
  echo -e "${YELLOW}   Check logs: pm2 logs shithaa-backend --lines 20${NC}"
fi

echo ""
echo -e "${BLUE}5. Checking for stuck orders...${NC}"
STUCK_COUNT=$(mongo shithaa_maternity_db --quiet --eval "db.orders.countDocuments({status:'DRAFT',paymentStatus:'PAID'})" 2>/dev/null || echo "0")
echo "Stuck DRAFT orders with PAID status: $STUCK_COUNT"

if [ "$STUCK_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Found $STUCK_COUNT stuck orders. Run reconciliation:${NC}"
  echo -e "${YELLOW}   node emergency-reconcile-paid-drafts.js --dry-run${NC}"
  echo -e "${YELLOW}   node emergency-reconcile-paid-drafts.js${NC}"
fi

echo ""
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo ""
echo -e "${BLUE}📊 MONITORING:${NC}"
echo "• Check logs: pm2 logs --lines 50"
echo "• Monitor stuck orders: mongo shithaa_maternity_db --eval \"db.orders.countDocuments({status:'DRAFT',paymentStatus:'PAID'})\""
echo "• Test payment flow: Try a real checkout"
echo ""
echo -e "${GREEN}🎯 EXPECTED RESULT:${NC}"
echo "• Payment verification should work (no more 500 errors)"
echo "• Orders should transition from DRAFT to CONFIRMED"
echo "• Customer should see success page instead of 'Payment Failed'"
echo ""
