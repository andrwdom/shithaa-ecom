#!/bin/bash

echo "🔧 Fixing Mobile Animation Error"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /var/www/shithaa-ecom

echo -e "${YELLOW}📋 Step 1: Stopping frontend service...${NC}"
pm2 stop shithaa-frontend

echo -e "${YELLOW}📋 Step 2: Building frontend with fixes...${NC}"
cd frontend
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://shithaa.in
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build completed successfully!${NC}"
    
    echo -e "${YELLOW}📋 Step 3: Verifying build files...${NC}"
    if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
        echo -e "${GREEN}✅ Build verification passed!${NC}"
    else
        echo -e "${RED}❌ Build verification failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Step 4: Starting frontend service...${NC}"
cd ..
pm2 start shithaa-frontend

echo -e "${YELLOW}📋 Step 5: Reloading nginx...${NC}"
sudo systemctl reload nginx

echo -e "${GREEN}🎉 Mobile Animation Error Fixed!${NC}"
echo ""
echo "📋 Error fixed:"
echo "✅ ReferenceError: isMobile is not defined"
echo "✅ Added proper mobile detection in DefaultBannerTicker"
echo "✅ Fixed useRef type definitions"
echo ""
echo "🔍 Test the following:"
echo "1. Banner ticker should work without errors"
echo "2. Hero carousel transitions should be smooth"
echo "3. No console errors should appear"
echo ""
echo "📱 Test on mobile devices:"
echo "• Check banner ticker smoothness"
echo "• Verify hero carousel fade transitions"
echo "• Ensure no JavaScript errors in console"
