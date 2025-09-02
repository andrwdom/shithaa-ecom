#!/bin/bash

echo "⚡ Quick Fix for Dependency Conflict"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to frontend directory
cd /var/www/shithaa-ecom/frontend

echo -e "${YELLOW}📋 Step 1: Installing dependencies with legacy peer deps...${NC}"
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencies installed successfully!${NC}"
    
    echo -e "${YELLOW}📋 Step 2: Building frontend...${NC}"
    export NODE_ENV=production
    export NEXT_PUBLIC_API_URL=https://shithaa.in
    npm run build
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend build completed successfully!${NC}"
        
        echo -e "${YELLOW}📋 Step 3: Restarting frontend service...${NC}"
        cd ..
        pm2 restart shithaa-frontend
        
        echo -e "${GREEN}🎉 Quick fix completed!${NC}"
        echo ""
        echo "📋 Summary:"
        echo "✅ Resolved dependency conflict"
        echo "✅ Built frontend successfully"
        echo "✅ Restarted frontend service"
        echo ""
        echo "🔍 Test the website now to see if static file errors are resolved."
    else
        echo -e "${RED}❌ Frontend build failed!${NC}"
        echo "Try running the full fix: ./fix-frontend-dependencies.sh"
    fi
else
    echo -e "${RED}❌ Dependency installation failed!${NC}"
    echo "Try running the full fix: ./fix-frontend-dependencies.sh"
fi
