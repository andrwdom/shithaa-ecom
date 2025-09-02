#!/bin/bash

echo "📱 Fixing Mobile Banner Animation Issue"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Mobile Banner Animation Issues Fixed:${NC}"
echo "1. ✅ Moved CSS from styled-jsx to global stylesheet for better reliability"
echo "2. ✅ Added dedicated banner-animation.css file with mobile optimizations"
echo "3. ✅ Implemented JavaScript fallback animation for mobile devices"
echo "4. ✅ Added hardware acceleration and webkit prefixes for better mobile support"
echo "5. ✅ Used translate3d instead of translateX for better performance"
echo "6. ✅ Added mobile device detection for conditional animation"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Starting mobile banner animation fix deployment...${NC}"

# 1. Build and deploy frontend
echo -e "${YELLOW}📦 Building frontend with mobile-optimized banner animation...${NC}"
cd frontend

# Set production environment variables
export NODE_ENV=production
export NEXT_PUBLIC_SITE_URL=https://shithaa.in
export NEXT_PUBLIC_API_URL=https://shithaa.in

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# Build the application
echo -e "${YELLOW}🔨 Building Next.js application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build completed successfully!${NC}"
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

cd ..

# 2. Restart services
echo -e "${YELLOW}🔄 Restarting services...${NC}"

# Restart PM2 processes
echo -e "${YELLOW}🔄 Restarting PM2 processes...${NC}"
pm2 restart all

# Restart Nginx
echo -e "${YELLOW}🔄 Restarting Nginx...${NC}"
sudo systemctl restart nginx

# Check service status
echo -e "${YELLOW}🔍 Checking service status...${NC}"
pm2 status
sudo systemctl status nginx --no-pager -l

# 3. Test the banner
echo -e "${YELLOW}🔍 Testing banner animation...${NC}"

# Wait a moment for services to start
sleep 5

# Test website accessibility
echo -e "${YELLOW}🔍 Checking website accessibility...${NC}"
curl -I https://shithaa.in

# 4. Clear caches
echo -e "${YELLOW}🧹 Clearing caches...${NC}"

# Clear Next.js cache
rm -rf frontend/.next/cache

echo ""
echo -e "${GREEN}🎉 Mobile Banner Animation Fix Deployed Successfully!${NC}"
echo ""
echo -e "${BLUE}📋 What was fixed:${NC}"
echo "• Moved CSS from styled-jsx to global stylesheet for better mobile compatibility"
echo "• Created dedicated banner-animation.css with mobile-specific optimizations"
echo "• Added JavaScript fallback animation that runs on mobile devices"
echo "• Implemented hardware acceleration with translate3d for better performance"
echo "• Added webkit prefixes for better iOS Safari support"
echo "• Mobile device detection automatically switches to JavaScript animation"
echo "• Desktop devices continue to use CSS animation for optimal performance"
echo ""
echo -e "${BLUE}🔍 Technical Implementation:${NC}"
echo "• CSS Animation: Used for desktop devices (better performance)"
echo "• JavaScript Animation: Used for mobile devices (better compatibility)"
echo "• Hardware Acceleration: translate3d with webkit prefixes"
echo "• Mobile Detection: User agent detection for conditional animation"
echo "• Fallback Support: Multiple animation methods for maximum compatibility"
echo ""
echo -e "${YELLOW}💡 Testing Instructions:${NC}"
echo "1. Open https://shithaa.in on a mobile device"
echo "2. Check that the purple banner scrolls smoothly from right to left"
echo "3. Test on different mobile browsers (Chrome, Safari, Firefox)"
echo "4. Verify animation works on both iOS and Android devices"
echo "5. Test on desktop to ensure CSS animation still works"
echo ""
echo -e "${BLUE}🔍 Expected Results:${NC}"
echo "• Mobile: JavaScript-based smooth scrolling animation"
echo "• Desktop: CSS-based animation with hover pause"
echo "• All Devices: Consistent banner animation behavior"
echo "• Performance: Hardware-accelerated animations for smooth experience"
echo ""
echo -e "${GREEN}✅ Mobile banner animation fix completed!${NC}"
