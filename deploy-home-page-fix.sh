#!/bin/bash

# Home Page Loading Fix Deployment Script
# October 1, 2025

echo "========================================="
echo "🏠 Deploying Home Page Loading Fix"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: frontend directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}🔨 Step 2: Building production bundle...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

echo -e "${YELLOW}🧪 Step 3: Running quick validation...${NC}"
# Check if build output exists
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Build output not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build output validated${NC}"
echo ""

echo -e "${YELLOW}🔄 Step 4: Restarting frontend service...${NC}"
cd ..

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to restart frontend..."
    pm2 restart frontend || pm2 restart ecosystem.config.js --only frontend
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend restarted via PM2${NC}"
    else
        echo -e "${YELLOW}⚠️  PM2 restart had issues, trying alternative method...${NC}"
        pm2 delete frontend 2>/dev/null
        cd frontend
        pm2 start npm --name "frontend" -- start
        cd ..
    fi
else
    echo -e "${YELLOW}⚠️  PM2 not found, using npm start...${NC}"
    cd frontend
    # Kill existing node processes for frontend (if any)
    pkill -f "next start" || true
    # Start in background
    nohup npm start > ../frontend.log 2>&1 &
    echo "Frontend started in background (PID: $!)"
    cd ..
fi
echo ""

echo -e "${YELLOW}🔍 Step 5: Checking service status...${NC}"
sleep 3

# Check if service is running
if command -v pm2 &> /dev/null; then
    pm2 status frontend
else
    if pgrep -f "next start" > /dev/null; then
        echo -e "${GREEN}✅ Frontend service is running${NC}"
    else
        echo -e "${RED}❌ Frontend service may not be running${NC}"
    fi
fi
echo ""

echo -e "${YELLOW}📊 Step 6: Quick health check...${NC}"
sleep 2
# Try to curl the home page
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend responding with HTTP 200${NC}"
elif [ "$RESPONSE" = "000" ]; then
    echo -e "${YELLOW}⚠️  Could not connect to frontend (may be starting up)${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend returned HTTP $RESPONSE${NC}"
fi
echo ""

echo "========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "📝 Next Steps:"
echo "1. Test the home page: https://shithaa.in/ or http://localhost:3000"
echo "2. Check browser console for any errors"
echo "3. Verify hero section loads within 1 second"
echo "4. Confirm no excessive white space"
echo "5. Test on mobile device"
echo ""
echo "📋 View logs:"
if command -v pm2 &> /dev/null; then
    echo "   pm2 logs frontend"
else
    echo "   tail -f frontend.log"
fi
echo ""
echo "🔄 Rollback if needed:"
echo "   git revert HEAD"
echo "   ./deploy-home-page-fix.sh"
echo ""
echo -e "${GREEN}Happy testing! 🚀${NC}"

