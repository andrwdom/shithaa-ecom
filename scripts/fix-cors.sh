#!/bin/bash

# 🔧 CORS FIX SCRIPT FOR SHITHAA E-COMMERCE
# This script applies the CORS fix safely

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 APPLYING CORS FIX${NC}"
echo -e "${BLUE}===================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    exit 1
fi

# Navigate to project directory
cd /var/www/shithaa-ecom

# Create backup of current server.js
echo -e "${YELLOW}📦 Creating backup of server.js...${NC}"
cp backend/server.js backend/server.js.backup.$(date +%Y%m%d_%H%M%S)

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin develop

# Install dependencies if needed
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Restart backend service
echo -e "${YELLOW}🔄 Restarting backend service...${NC}"
pm2 restart shithaa-backend

# Wait for service to start
sleep 5

# Test CORS
echo -e "${YELLOW}🧪 Testing CORS configuration...${NC}"
if curl -f "http://localhost:4000/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    exit 1
fi

# Test CORS endpoint
echo -e "${YELLOW}🧪 Testing CORS endpoint...${NC}"
CORS_RESPONSE=$(curl -s -H "Origin: http://shithaa.in" "http://localhost:4000/api/cors-test")
if echo "$CORS_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ CORS test passed for http://shithaa.in${NC}"
else
    echo -e "${RED}❌ CORS test failed${NC}"
    echo "Response: $CORS_RESPONSE"
fi

echo -e "${GREEN}🎉 CORS fix applied successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check your site at http://shithaa.in"
echo "2. Monitor logs: pm2 logs shithaa-backend"
echo "3. Test API calls from your frontend"
echo ""
echo -e "${BLUE}Note: HTTP is not recommended for production. Consider setting up HTTPS soon.${NC}"
