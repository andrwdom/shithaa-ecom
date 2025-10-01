#!/bin/bash

# Complete Hero Section Fix Deployment
# Fixes: Visibility issue + Product image fetching

echo "========================================="
echo "🖼️  Deploying Complete Hero Section Fix"
echo "========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Diagnose Product Database
echo -e "${YELLOW}🔍 Step 1: Diagnosing product database...${NC}"
cd backend
node diagnose-hero-products.js
echo ""

read -p "Press Enter to continue with deployment..."
echo ""

# Step 2: Deploy Backend (if needed)
echo -e "${YELLOW}🔧 Step 2: Restarting backend...${NC}"
pm2 restart backend
sleep 2
echo ""

# Step 3: Deploy Frontend
echo -e "${YELLOW}📦 Step 3: Building and deploying frontend...${NC}"
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

# Step 4: Verify
echo -e "${YELLOW}🏥 Step 4: Running health checks...${NC}"
sleep 3

# Check frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend returned HTTP ${FRONTEND_STATUS}${NC}"
fi

# Test hero images API
echo -e "${BLUE}Testing hero images API...${NC}"
HERO_RESPONSE=$(curl -s "http://localhost:4000/api/hero-images?categoryId=maternity-feeding-wear&device=desktop&limit=6")
PRODUCT_COUNT=$(echo "$HERO_RESPONSE" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')

if [ ! -z "$PRODUCT_COUNT" ]; then
    if [ "$PRODUCT_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✅ API returning $PRODUCT_COUNT images for maternity-feeding-wear${NC}"
    else
        echo -e "${YELLOW}⚠️  API returns 0 images - products may be missing in database${NC}"
        echo -e "${BLUE}   Hero section will show placeholder images${NC}"
    fi
else
    echo -e "${RED}❌ API test failed${NC}"
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
echo -e "${BLUE}📝 What's Fixed:${NC}"
echo "1. ✅ Hero section now visible immediately on page load"
echo "2. ✅ No scrolling required to see category cards"
echo "3. ✅ Placeholder images load instantly"
echo "4. ✅ Improved intersection observer for better performance"
echo ""
echo -e "${YELLOW}⚠️  Product Images Status:${NC}"
if [ "$PRODUCT_COUNT" -gt 0 ]; then
    echo "✅ Dynamic product images are loading from database"
    echo "   Cards will rotate through actual product images"
else
    echo "⚠️  No products found in database for categories"
    echo "   Hero section showing placeholder images (this is normal if database is empty)"
    echo ""
    echo -e "${BLUE}To fix:${NC}"
    echo "1. Check diagnostic output above for category issues"
    echo "2. Import products from backup OR"
    echo "3. Add products via admin panel with correct categorySlug values"
fi
echo ""
echo -e "${BLUE}🧪 Test the fix:${NC}"
echo "1. Open: https://shithaa.in/ in incognito mode"
echo "2. Hero section should be visible immediately (no scrolling)"
echo "3. All 4 category cards should display images"
echo "4. Console should have no image loading errors"
echo ""
echo -e "${BLUE}📋 View logs:${NC}"
echo "   pm2 logs frontend --lines 50"
echo "   pm2 logs backend --lines 50"
echo ""
echo -e "${GREEN}Happy testing! 🚀${NC}"

