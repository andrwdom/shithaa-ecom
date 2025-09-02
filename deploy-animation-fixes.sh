#!/bin/bash

echo "🎬 Deploying Animation Performance Fixes"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /var/www/shithaa-ecom

echo -e "${YELLOW}📋 Step 1: Stopping frontend service...${NC}"
pm2 stop shithaa-frontend

echo -e "${YELLOW}📋 Step 2: Building frontend with animation fixes...${NC}"
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install --legacy-peer-deps
fi

# Build the frontend
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

echo -e "${GREEN}🎉 Animation fixes deployed successfully!${NC}"
echo ""
echo "📋 Summary of fixes applied:"
echo "✅ Hero carousel transitions: Increased duration to 1s with ease-in-out"
echo "✅ Banner ticker animation: Upgraded to 60fps using requestAnimationFrame"
echo "✅ Mobile optimization: Added hardware acceleration and smooth transitions"
echo "✅ CSS improvements: Better will-change properties and backface-visibility"
echo ""
echo "🔍 Test the following on mobile devices:"
echo "1. Hero category carousel image transitions should be smooth"
echo "2. Banner ticker should scroll smoothly at 60fps"
echo "3. All animations should feel as smooth as desktop version"
echo ""
echo "📱 Mobile-specific improvements:"
echo "- requestAnimationFrame for banner ticker (60fps instead of 20fps)"
echo "- Hardware acceleration with translate3d and will-change"
echo "- Optimized transition durations for mobile perception"
echo "- Better font smoothing and backface visibility"
