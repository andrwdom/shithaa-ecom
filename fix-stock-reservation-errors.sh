#!/bin/bash

echo "🚨 STOCK RESERVATION ERROR FIX SCRIPT"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Debugging current stock issues...${NC}"
cd backend
node debug-stock.js

echo ""
echo -e "${YELLOW}Step 2: Fixing stock issues...${NC}"
node fix-stock-issues.js

echo ""
echo -e "${YELLOW}Step 3: Restarting backend server...${NC}"
pm2 restart all

echo ""
echo -e "${YELLOW}Step 4: Waiting for server to start...${NC}"
sleep 5

echo ""
echo -e "${YELLOW}Step 5: Testing stock reservation...${NC}"
echo "Now try to checkout again - the stock reservation should work!"

echo ""
echo -e "${GREEN}✅ Stock fix script completed!${NC}"
echo ""
echo -e "${YELLOW}What was fixed:${NC}"
echo "1. Negative stock values → Set to 0"
echo "2. Missing stock fields → Set to 0"
echo "3. Invalid stock types → Set to 0"
echo "4. Enhanced error messages for better debugging"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Try checkout again"
echo "2. If it still fails, check the error message for specific details"
echo "3. Run: pm2 logs --lines 20 to see detailed logs"
echo ""
echo -e "${RED}If issues persist, the product might actually be out of stock!${NC}"
