#!/bin/bash

echo "🧪 Testing Mobile Animation Performance Fixes"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Step 1: Checking frontend service status...${NC}"
pm2 status shithaa-frontend

echo -e "${YELLOW}📋 Step 2: Testing static file serving...${NC}"
# Test if static files are accessible
curl -I "https://shithaa.in/_next/static/chunks/app/layout-a8fa67ca11d0cf42.js" 2>/dev/null | head -1

echo -e "${YELLOW}📋 Step 3: Checking frontend build...${NC}"
cd /var/www/shithaa-ecom/frontend
if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
    echo -e "${GREEN}✅ Frontend build exists${NC}"
    
    if [ -d ".next/static" ]; then
        echo -e "${GREEN}✅ Static files directory exists${NC}"
        echo "Static files found:"
        ls -la .next/static/ | head -5
    else
        echo -e "${RED}❌ Static files directory missing${NC}"
    fi
else
    echo -e "${RED}❌ Frontend build missing - needs to be built${NC}"
fi

echo -e "${YELLOW}📋 Step 4: Checking CSS files...${NC}"
if [ -f "styles/mobile-optimized-animations.css" ]; then
    echo -e "${GREEN}✅ Mobile optimized animations CSS exists${NC}"
else
    echo -e "${RED}❌ Mobile optimized animations CSS missing${NC}"
fi

echo -e "${YELLOW}📋 Step 5: Checking optimized components...${NC}"
if [ -f "components/optimized-mobile-hero-card.tsx" ]; then
    echo -e "${GREEN}✅ Optimized mobile hero card component exists${NC}"
else
    echo -e "${RED}❌ Optimized mobile hero card component missing${NC}"
fi

if [ -f "components/optimized-banner-ticker.tsx" ]; then
    echo -e "${GREEN}✅ Optimized banner ticker component exists${NC}"
else
    echo -e "${RED}❌ Optimized banner ticker component missing${NC}"
fi

echo -e "${YELLOW}📋 Step 6: Testing website accessibility...${NC}"
curl -I "https://shithaa.in" 2>/dev/null | head -1

echo ""
echo -e "${GREEN}🎯 Test completed!${NC}"
echo ""
echo "📋 Manual testing checklist:"
echo "1. ✅ Open website on mobile device"
echo "2. ✅ Check hero category carousel transitions"
echo "3. ✅ Verify banner ticker smoothness"
echo "4. ✅ Test overall page performance"
echo "5. ✅ Compare with desktop version"
echo ""
echo "🔍 Performance indicators to look for:"
echo "• Hero carousel: Smooth fade transitions (not abrupt changes)"
echo "• Banner ticker: 60fps smooth scrolling (not 15fps choppy)"
echo "• Overall: Responsive interactions and smooth animations"
echo ""
echo "📱 Test on different devices:"
echo "• iPhone Safari"
echo "• Android Chrome"
echo "• Mobile Firefox"
echo "• Different screen sizes"
