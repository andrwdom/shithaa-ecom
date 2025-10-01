#!/bin/bash

# Hero Images Fix Deployment Script
# October 1, 2025

echo "========================================="
echo "🖼️  Deploying Hero Images Fix"
echo "========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Deploy Backend Fix
echo -e "${YELLOW}🔧 Step 1: Deploying backend fix...${NC}"
cd backend
pm2 restart backend
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend restarted${NC}"
else
    echo -e "${RED}❌ Backend restart failed${NC}"
    exit 1
fi
echo ""

# Wait for backend to stabilize
echo -e "${BLUE}⏳ Waiting for backend to stabilize...${NC}"
sleep 3

# Test backend API
echo -e "${YELLOW}🧪 Testing backend hero images API...${NC}"
RESPONSE=$(curl -s "http://localhost:4000/api/hero-images?categoryId=maternity-feeding-wear&device=desktop&limit=6")
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Backend API responding correctly${NC}"
    # Check if images array is empty (expected if no products)
    if echo "$RESPONSE" | grep -q '"total":0'; then
        echo -e "${YELLOW}⚠️  Backend returns no images (products may be missing in database)${NC}"
    fi
else
    echo -e "${RED}❌ Backend API test failed${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi
echo ""

# Step 2: Deploy Frontend Fix
echo -e "${YELLOW}📦 Step 2: Building and deploying frontend...${NC}"
cd ../frontend

# Clean build
rm -rf .next
echo -e "${BLUE}🧹 Cleaned .next directory${NC}"

# Build
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend build successful${NC}"

# Restart
pm2 restart frontend
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend restarted${NC}"
else
    echo -e "${RED}❌ Frontend restart failed${NC}"
    exit 1
fi
echo ""

# Wait for frontend to start
echo -e "${BLUE}⏳ Waiting for frontend to start...${NC}"
sleep 5

# Step 3: Verify placeholder images exist
echo -e "${YELLOW}🔍 Step 3: Verifying placeholder images...${NC}"
cd public/placeholders
if [ -f "hero1.JPG" ] && [ -f "hero2.JPG" ] && [ -f "hero3.JPG" ] && [ -f "hero4.JPG" ]; then
    echo -e "${GREEN}✅ All placeholder images exist${NC}"
    ls -lh hero*.JPG
else
    echo -e "${RED}❌ Some placeholder images are missing${NC}"
    ls -lh
    exit 1
fi
cd ../..
echo ""

# Step 4: Health check
echo -e "${YELLOW}🏥 Step 4: Running health checks...${NC}"

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend health check passed (HTTP 200)${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend returned HTTP ${FRONTEND_STATUS}${NC}"
fi

# Check backend
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend health check passed (HTTP 200)${NC}"
else
    echo -e "${RED}❌ Backend health check failed (HTTP ${BACKEND_STATUS})${NC}"
fi
echo ""

# Step 5: PM2 Status
echo -e "${YELLOW}📊 Step 5: Checking PM2 status...${NC}"
pm2 status
echo ""

echo "========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Test home page: https://shithaa.in/"
echo "2. Clear browser cache: Ctrl+Shift+Delete"
echo "3. Check console for errors (should be none)"
echo "4. Verify hero cards show placeholder images"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "If hero images still show as broken:"
echo "  - Check if products exist in database"
echo "  - Run: node -e \"require('mongoose').connect(...).then(() => ...)\""
echo "  - See HERO_IMAGES_FIX_COMPLETE.md for database diagnostics"
echo ""
echo -e "${BLUE}📋 View logs:${NC}"
echo "  pm2 logs frontend --lines 50"
echo "  pm2 logs backend --lines 50"
echo ""
echo -e "${GREEN}Happy testing! 🚀${NC}"

