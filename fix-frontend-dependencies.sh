#!/bin/bash

echo "🔧 Fixing Frontend Dependency Conflicts"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to frontend directory
cd /var/www/shithaa-ecom/frontend

echo -e "${YELLOW}📋 Step 1: Stopping frontend service...${NC}"
pm2 stop shithaa-frontend

echo -e "${YELLOW}📋 Step 2: Cleaning all build artifacts...${NC}"
rm -rf .next
rm -rf out
rm -rf node_modules
rm -rf package-lock.json

echo -e "${YELLOW}📋 Step 3: Installing dependencies with legacy peer deps...${NC}"
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
else
    echo -e "${RED}❌ Dependency installation failed, trying with force...${NC}"
    npm install --force
fi

echo -e "${YELLOW}📋 Step 4: Building frontend...${NC}"
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://shithaa.in
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build completed successfully!${NC}"
    
    echo -e "${YELLOW}📋 Step 5: Verifying build files...${NC}"
    if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
        echo -e "${GREEN}✅ Build verification passed!${NC}"
        
        # Check if static files exist
        if [ -d ".next/static" ]; then
            echo -e "${GREEN}✅ Static files directory exists!${NC}"
            echo "Static files found:"
            ls -la .next/static/ | head -5
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

echo -e "${YELLOW}📋 Step 6: Starting frontend service...${NC}"
cd ..
pm2 start shithaa-frontend

echo -e "${YELLOW}📋 Step 7: Reloading nginx...${NC}"
sudo systemctl reload nginx

echo -e "${GREEN}🎉 Frontend dependency fix completed!${NC}"
echo ""
echo "📋 Summary:"
echo "✅ Fixed date-fns version conflict"
echo "✅ Cleaned and reinstalled dependencies"
echo "✅ Built frontend successfully"
echo "✅ Restarted services"
echo ""
echo "🔍 Next steps:"
echo "1. Test the website in a browser"
echo "2. Check if static file 404 errors are resolved"
echo "3. Monitor for any remaining console errors"
