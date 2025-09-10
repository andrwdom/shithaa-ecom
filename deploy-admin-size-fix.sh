#!/bin/bash

echo "🚀 DEPLOYING ADMIN PANEL SIZE FIX"
echo "=================================="

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

# Stop the admin service
echo -e "${YELLOW}🛑 Stopping admin service...${NC}"
pm2 stop admin 2>/dev/null || echo "Admin service not running"

# Navigate to admin directory
cd admin

echo -e "${YELLOW}📁 Admin directory: $(pwd)${NC}"

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist
rm -rf build

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Set production environment
export NODE_ENV=production

# Build the admin application
echo -e "${YELLOW}🔨 Building admin application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Admin build completed successfully!${NC}"
else
    echo -e "${RED}❌ Admin build failed!${NC}"
    exit 1
fi

# Go back to project root
cd ..

# Start the admin service
echo -e "${YELLOW}🚀 Starting admin service...${NC}"
pm2 start ecosystem.config.js --only admin

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Admin service started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start admin service${NC}"
    exit 1
fi

# Wait a moment for the service to fully start
echo -e "${YELLOW}⏳ Waiting for service to start...${NC}"
sleep 5

# Check service status
echo -e "${YELLOW}📊 Checking service status...${NC}"
pm2 status

# Test the admin endpoint
echo -e "${YELLOW}🧪 Testing admin endpoint...${NC}"
ADMIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "https://admin.shithaa.in/")
if [ "$ADMIN_RESPONSE" = "200" ]; then
    echo -e "${GREEN}    ✅ Admin panel working (HTTP $ADMIN_RESPONSE)${NC}"
else
    echo -e "${RED}    ❌ Admin panel failed (HTTP $ADMIN_RESPONSE)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 ADMIN DEPLOYMENT COMPLETED!${NC}"
echo ""
echo "🔧 What was fixed:"
echo "1. ✅ New sizes are now preserved when editing products"
echo "2. ✅ New sizes default to stock: 1 instead of 0"
echo "3. ✅ All selected sizes are sent to backend"
echo "4. ✅ Admin panel rebuilt and deployed"
echo ""
echo "📋 Next steps:"
echo "1. Go to admin panel: https://admin.shithaa.in"
echo "2. Edit any product and try adding a new size"
echo "3. Save the product and verify the new size is preserved"
echo "4. Check the product list to confirm the size appears"
echo ""
echo "🚨 If issues persist:"
echo "- Check admin logs: pm2 logs admin"
echo "- Verify the service is running: pm2 status"
echo "- Check browser console for any errors"
