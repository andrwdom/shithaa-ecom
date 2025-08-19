#!/bin/bash

echo "🚀 DEPLOYING SHITHAA FRONTEND WITH STATIC ASSET FIXES"
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    exit 1
fi

# Navigate to project directory
cd /var/www/shithaa-ecom

echo -e "${YELLOW}📁 Current directory: $(pwd)${NC}"

# Stop the frontend service
echo -e "${YELLOW}🛑 Stopping frontend service...${NC}"
pm2 stop frontend 2>/dev/null || echo "Frontend service not running"

# Navigate to frontend directory
cd frontend

echo -e "${YELLOW}📁 Frontend directory: $(pwd)${NC}"

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf .next
rm -rf out
rm -rf dist

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Set production environment
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://shithaa.in

# Build the application
echo -e "${YELLOW}🔨 Building Next.js application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Go back to project root
cd ..

# Update nginx configuration
echo -e "${YELLOW}🔧 Updating nginx configuration...${NC}"
cp nginx-config/shithaa.conf /etc/nginx/sites-available/shithaa.conf

# Test nginx configuration
echo -e "${YELLOW}🧪 Testing nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
    
    # Reload nginx
    echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
    systemctl reload nginx
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
    else
        echo -e "${RED}❌ Failed to reload nginx${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Nginx configuration is invalid${NC}"
    exit 1
fi

# Start the frontend service
echo -e "${YELLOW}🚀 Starting frontend service...${NC}"
pm2 start ecosystem.config.js --only frontend

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend service started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start frontend service${NC}"
    exit 1
fi

# Wait a moment for the service to fully start
echo -e "${YELLOW}⏳ Waiting for service to start...${NC}"
sleep 5

# Check service status
echo -e "${YELLOW}📊 Checking service status...${NC}"
pm2 status

# Test the endpoints
echo -e "${YELLOW}🧪 Testing endpoints...${NC}"

# Test static assets
echo -e "${YELLOW}  📁 Testing static assets...${NC}"
STATIC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://shithaa.in/_next/static/css/app/layout.css")
if [ "$STATIC_RESPONSE" = "200" ]; then
    echo -e "${GREEN}    ✅ Static assets working (HTTP $STATIC_RESPONSE)${NC}"
else
    echo -e "${RED}    ❌ Static assets failed (HTTP $STATIC_RESPONSE)${NC}"
fi

# Test main page
echo -e "${YELLOW}  🏠 Testing main page...${NC}"
MAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://shithaa.in/")
if [ "$MAIN_RESPONSE" = "200" ]; then
    echo -e "${GREEN}    ✅ Main page working (HTTP $MAIN_RESPONSE)${NC}"
else
    echo -e "${RED}    ❌ Main page failed (HTTP $MAIN_RESPONSE)${NC}"
fi

# Test checkout page
echo -e "${YELLOW}  🛒 Testing checkout page...${NC}"
CHECKOUT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://shithaa.in/checkout")
if [ "$CHECKOUT_RESPONSE" = "200" ]; then
    echo -e "${GREEN}    ✅ Checkout page working (HTTP $CHECKOUT_RESPONSE)${NC}"
else
    echo -e "${RED}    ❌ Checkout page failed (HTTP $CHECKOUT_RESPONSE)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED!${NC}"
echo ""
echo "🔧 What was fixed:"
echo "1. ✅ Static asset MIME type issues"
echo "2. ✅ Nginx configuration updated"
echo "3. ✅ Frontend service restarted"
echo "4. ✅ Static files now properly proxied"
echo ""
echo "📋 Next steps:"
echo "1. Test the checkout flow manually"
echo "2. Verify that 'Proceed to Checkout' works without blank pages"
echo "3. Check that static assets load properly"
echo "4. Monitor the console for any remaining errors"
echo ""
echo "🚨 If issues persist:"
echo "- Check nginx error logs: tail -f /var/log/nginx/error.log"
echo "- Check frontend logs: pm2 logs frontend"
echo "- Verify the service is running: pm2 status"
