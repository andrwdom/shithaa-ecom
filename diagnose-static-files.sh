#!/bin/bash

echo "🔍 Diagnosing Next.js Static File Issues"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Step 1: Checking Next.js service status...${NC}"
pm2 status shithaa-frontend

echo -e "${YELLOW}📋 Step 2: Checking if Next.js is responding...${NC}"
curl -I "http://127.0.0.1:3000" 2>/dev/null | head -1

echo -e "${YELLOW}📋 Step 3: Checking frontend build directory...${NC}"
cd /var/www/shithaa-ecom/frontend
if [ -d ".next" ]; then
    echo -e "${GREEN}✅ .next directory exists${NC}"
    if [ -d ".next/static" ]; then
        echo -e "${GREEN}✅ .next/static directory exists${NC}"
        echo "Static files found:"
        ls -la .next/static/ | head -10
    else
        echo -e "${RED}❌ .next/static directory missing${NC}"
    fi
else
    echo -e "${RED}❌ .next directory missing - frontend needs to be built${NC}"
fi

echo -e "${YELLOW}📋 Step 4: Testing static file access via Next.js server...${NC}"
# Test a specific static file
TEST_FILE="_next/static/chunks/app/layout-a8fa67ca11d0cf42.js"
curl -I "http://127.0.0.1:3000/$TEST_FILE" 2>/dev/null | head -3

echo -e "${YELLOW}📋 Step 5: Testing static file access via nginx...${NC}"
curl -I "https://shithaa.in/$TEST_FILE" 2>/dev/null | head -3

echo -e "${YELLOW}📋 Step 6: Checking nginx error logs...${NC}"
sudo tail -5 /var/log/nginx/error.log

echo -e "${YELLOW}📋 Step 7: Checking Next.js logs...${NC}"
pm2 logs shithaa-frontend --lines 5

echo ""
echo -e "${GREEN}🎯 Diagnosis complete!${NC}"
echo ""
echo "📋 Common issues and solutions:"
echo "1. If .next directory is missing: Run 'npm run build' in frontend directory"
echo "2. If Next.js server not responding: Restart with 'pm2 restart shithaa-frontend'"
echo "3. If nginx returns 404: Check nginx configuration and reload"
echo "4. If MIME type errors: Update nginx static file configuration"
