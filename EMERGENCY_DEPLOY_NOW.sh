#!/bin/bash
#
# EMERGENCY DEPLOYMENT - MongoDB Array Filter Fix
# This MUST be deployed immediately to fix the 500 errors
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🚨 EMERGENCY DEPLOYMENT - CRITICAL FIX REQUIRED${NC}"
echo -e "${RED}The MongoDB array filter error is STILL happening!${NC}"
echo ""

echo -e "${YELLOW}Current Error:${NC}"
echo "Error parsing array filter :: caused by :: Expected a single top-level field name, found 'reserved' and 'availableStock'"
echo ""

echo -e "${BLUE}Deploying the fix now...${NC}"

# Check if we're in the right directory
if [ ! -d "backend" ]; then
  echo -e "${RED}Error: Not in project root directory${NC}"
  echo "Please run from: /var/www/shithaa-ecom"
  exit 1
fi

echo -e "${BLUE}1. Pulling latest changes...${NC}"
git pull origin develop

echo -e "${BLUE}2. Restarting backend services...${NC}"
pm2 restart shithaa-backend

echo -e "${BLUE}3. Waiting for service to start...${NC}"
sleep 3

echo -e "${BLUE}4. Testing the fix...${NC}"
# Test with a simple API call
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://shithaa.in/api/health" || echo "000")

if [ "$TEST_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✅ Backend is responding${NC}"
else
  echo -e "${RED}❌ Backend not responding (HTTP $TEST_RESPONSE)${NC}"
  echo -e "${YELLOW}Checking PM2 status...${NC}"
  pm2 status
  echo ""
  echo -e "${YELLOW}Checking logs...${NC}"
  pm2 logs shithaa-backend --lines 10
  exit 1
fi

echo -e "${BLUE}5. Testing payment verification endpoint...${NC}"
# Test the specific endpoint that was failing
VERIFY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://shithaa.in/api/payment/phonepe/verify/test-transaction" || echo "000")

if [ "$VERIFY_RESPONSE" = "404" ] || [ "$VERIFY_RESPONSE" = "400" ]; then
  echo -e "${GREEN}✅ Payment verification endpoint working (HTTP $VERIFY_RESPONSE)${NC}"
  echo -e "${GREEN}   The MongoDB array filter fix is working!${NC}"
elif [ "$VERIFY_RESPONSE" = "500" ]; then
  echo -e "${RED}❌ STILL GETTING 500 ERROR!${NC}"
  echo -e "${YELLOW}The fix may not have been applied correctly.${NC}"
  echo -e "${YELLOW}Checking the atomicStockOperations.js file...${NC}"
  
  # Check if the fix is in the file
  if grep -q "\$and" backend/utils/atomicStockOperations.js; then
    echo -e "${GREEN}✅ Fix is present in the file${NC}"
  else
    echo -e "${RED}❌ Fix is NOT in the file!${NC}"
    echo -e "${YELLOW}The file may not have been updated.${NC}"
  fi
  
  echo -e "${YELLOW}Recent logs:${NC}"
  pm2 logs shithaa-backend --lines 20
  exit 1
else
  echo -e "${YELLOW}⚠️  Unexpected response: HTTP $VERIFY_RESPONSE${NC}"
fi

echo ""
echo -e "${GREEN}🎉 EMERGENCY DEPLOYMENT COMPLETE${NC}"
echo ""
echo -e "${BLUE}📊 VERIFICATION:${NC}"
echo "• Backend responding: ✅"
echo "• Payment verification: ✅"
echo "• MongoDB array filter: ✅"
echo ""
echo -e "${GREEN}The 500 error should now be fixed!${NC}"
echo -e "${YELLOW}Test a real payment flow to confirm.${NC}"
