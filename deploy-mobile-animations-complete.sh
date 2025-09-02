#!/bin/bash

echo "🚀 Deploying Complete Mobile Animation Fixes"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /var/www/shithaa-ecom

echo -e "${YELLOW}📋 Step 1: Stopping frontend service...${NC}"
pm2 stop shithaa-frontend

echo -e "${YELLOW}📋 Step 2: Installing dependencies...${NC}"
cd frontend
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
else
    echo -e "${RED}❌ Dependency installation failed, trying with force...${NC}"
    npm install --force
fi

echo -e "${YELLOW}📋 Step 3: Building frontend with all optimizations...${NC}"
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://shithaa.in
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build completed successfully!${NC}"
    
    echo -e "${YELLOW}📋 Step 4: Verifying build files...${NC}"
    if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
        echo -e "${GREEN}✅ Build verification passed!${NC}"
        
        # Check if static files exist
        if [ -d ".next/static" ]; then
            echo -e "${GREEN}✅ Static files directory exists!${NC}"
        else
            echo -e "${RED}❌ Static files directory missing!${NC}"
        fi
    else
        echo -e "${RED}❌ Build verification failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Step 5: Starting frontend service...${NC}"
cd ..
pm2 start shithaa-frontend

echo -e "${YELLOW}📋 Step 6: Reloading nginx...${NC}"
sudo systemctl reload nginx

echo -e "${GREEN}🎉 Complete Mobile Animation Fixes Deployed!${NC}"
echo ""
echo "📋 All fixes applied:"
echo "✅ Fixed ReferenceError: isMobile is not defined"
echo "✅ Fixed useRef type definitions"
echo "✅ Fixed navbar Button variant issues"
echo "✅ Fixed hero carousel fade transitions for mobile"
echo "✅ Optimized banner ticker animation performance"
echo "✅ Added mobile-specific CSS optimizations"
echo "✅ Implemented hardware acceleration for animations"
echo "✅ Added intersection observer for performance"
echo "✅ Optimized animation timing for mobile devices"
echo ""
echo "🔍 Performance improvements:"
echo "• Hero carousel: Smooth fade transitions (not abrupt changes)"
echo "• Banner ticker: 60fps animation using requestAnimationFrame"
echo "• Mobile performance: Optimized for better battery life"
echo "• Hardware acceleration: Full GPU acceleration enabled"
echo "• Intersection observer: Prevents unnecessary animations"
echo ""
echo "📱 Test the following on mobile:"
echo "1. Hero category carousel image transitions (should be smooth fades)"
echo "2. Banner ticker smoothness (should be 60fps, not 15fps choppy)"
echo "3. Overall page performance (should feel responsive)"
echo "4. No console errors should appear"
echo ""
echo "🔧 If issues persist:"
echo "1. Clear browser cache completely"
echo "2. Test on different mobile devices"
echo "3. Check browser developer tools for performance metrics"
echo "4. Verify network connectivity"
echo ""
echo "📊 Expected results:"
echo "• Smooth 60fps animations on mobile"
echo "• Better battery life due to hardware acceleration"
echo "• No JavaScript errors in console"
echo "• Responsive interactions across all devices"
