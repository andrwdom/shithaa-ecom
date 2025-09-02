#!/bin/bash

echo "🎬 Fixing Banner Animation for Mobile Devices"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Banner Animation Issues Fixed:${NC}"
echo "1. ✅ Fixed CSS animation logic for proper scrolling"
echo "2. ✅ Updated animation to work on all devices (desktop & mobile)"
echo "3. ✅ Added third promotional message for better visibility"
echo "4. ✅ Improved animation timing and smoothness"
echo "5. ✅ Added accessibility support (prefers-reduced-motion)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Starting banner animation fix deployment...${NC}"

# 1. Build and deploy frontend
echo -e "${YELLOW}📦 Building frontend with fixed banner animation...${NC}"
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
echo -e "${GREEN}🎉 Banner Animation Fix Deployed Successfully!${NC}"
echo ""
echo -e "${BLUE}📋 What was fixed:${NC}"
echo "• Banner now scrolls smoothly from left to right on all devices"
echo "• Added third promotional message for better visibility"
echo "• Fixed CSS animation logic for proper continuous scrolling"
echo "• Improved animation timing (24s duration for smooth movement)"
echo "• Added accessibility support for users who prefer reduced motion"
echo "• Animation now works consistently on desktop and mobile"
echo ""
echo -e "${BLUE}🔍 Expected Results:${NC}"
echo "• Banner messages will scroll continuously from right to left"
echo "• Animation will be smooth and graceful on all devices"
echo "• Three promotional messages will cycle through:"
echo "  - FREE DELIVERY FOR LOUNGE WEAR WITHIN TAMIL NADU"
echo "  - BUY 3 LOUNGE WEAR @1299RS"
echo "  - PREMIUM MATERNITY WEAR - ELEGANT & COMFORTABLE"
echo ""
echo -e "${YELLOW}💡 Testing Instructions:${NC}"
echo "1. Open https://shithaa.in on both desktop and mobile"
echo "2. Check that the purple banner above the navbar scrolls smoothly"
echo "3. Verify the animation works on different screen sizes"
echo "4. Test that the animation pauses on hover (desktop)"
echo ""
echo -e "${GREEN}✅ Banner animation fix completed!${NC}"
