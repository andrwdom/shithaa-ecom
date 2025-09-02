#!/bin/bash

echo "🔧 Fixing Next.js Static File Serving Issues"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /var/www/shithaa-ecom

echo -e "${YELLOW}📋 Step 1: Checking current services...${NC}"
pm2 status

echo -e "${YELLOW}📋 Step 2: Stopping frontend service...${NC}"
pm2 stop shithaa-frontend

echo -e "${YELLOW}📋 Step 3: Cleaning frontend build cache...${NC}"
cd frontend
rm -rf .next
rm -rf out
rm -rf node_modules/.cache
rm -rf .next/cache

echo -e "${YELLOW}📋 Step 4: Reinstalling dependencies...${NC}"
npm install

echo -e "${YELLOW}📋 Step 5: Building frontend with clean cache...${NC}"
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://shithaa.in
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build completed successfully!${NC}"
    
    echo -e "${YELLOW}📋 Step 6: Verifying build files...${NC}"
    if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
        echo -e "${GREEN}✅ Build verification passed!${NC}"
        
        # Check if static files exist
        if [ -d ".next/static" ]; then
            echo -e "${GREEN}✅ Static files directory exists!${NC}"
            ls -la .next/static/
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

echo -e "${YELLOW}📋 Step 7: Restarting frontend service...${NC}"
cd ..
pm2 start shithaa-frontend

echo -e "${YELLOW}📋 Step 8: Restarting nginx...${NC}"
sudo systemctl reload nginx

echo -e "${YELLOW}📋 Step 9: Testing static file serving...${NC}"
sleep 5

# Test if static files are accessible
echo "Testing static file access..."
curl -I "https://shithaa.in/_next/static/chunks/app/layout-a8fa67ca11d0cf42.js" 2>/dev/null | head -1

echo -e "${GREEN}🎉 Fix completed!${NC}"
echo ""
echo "📋 Summary:"
echo "✅ Cleaned frontend build cache"
echo "✅ Rebuilt frontend with fresh dependencies"
echo "✅ Restarted frontend service"
echo "✅ Reloaded nginx configuration"
echo ""
echo "🔍 Next steps:"
echo "1. Test the website in a browser"
echo "2. Check browser console for any remaining errors"
echo "3. If issues persist, check nginx error logs: sudo tail -f /var/log/nginx/error.log"
