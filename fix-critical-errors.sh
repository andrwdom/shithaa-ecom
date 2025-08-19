#!/bin/bash

echo "🚨 CRITICAL ERROR FIX SCRIPT FOR SHITHAA"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Checking current server status...${NC}"
pm2 status

echo ""
echo -e "${YELLOW}Step 2: Testing environment variables...${NC}"
cd backend
node test-env.js

echo ""
echo -e "${YELLOW}Step 3: Restarting backend server...${NC}"
pm2 restart all

echo ""
echo -e "${YELLOW}Step 4: Waiting for server to start...${NC}"
sleep 5

echo ""
echo -e "${YELLOW}Step 5: Testing health endpoint...${NC}"
curl -s http://localhost:4000/api/health | jq '.' 2>/dev/null || curl -s http://localhost:4000/api/health

echo ""
echo -e "${YELLOW}Step 6: Testing production health endpoint...${NC}"
curl -s https://shithaa.in/api/health | jq '.' 2>/dev/null || curl -s https://shithaa.in/api/health

echo ""
echo -e "${YELLOW}Step 7: Checking server logs for errors...${NC}"
pm2 logs --lines 10

echo ""
echo -e "${GREEN}✅ Fix script completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check if health endpoint is working (no more 500 errors)"
echo "2. Try checkout process to see if payment errors are resolved"
echo "3. Check browser console for any remaining errors"
echo ""
echo -e "${YELLOW}If issues persist, check:${NC}"
echo "- Environment variables in .env file"
echo "- MongoDB connection"
echo "- PhonePe credentials"
echo "- Server logs with: pm2 logs --lines 50"
