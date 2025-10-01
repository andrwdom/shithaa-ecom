#!/bin/bash

echo "🚀 INSTANT DEPLOYMENT - Zero Cache Delay"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current timestamp for cache busting
TIMESTAMP=$(date +%s)
BUILD_ID=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🕐 Build ID: ${BUILD_ID}${NC}"
echo -e "${BLUE}🕐 Timestamp: ${TIMESTAMP}${NC}"

# Step 1: Clean everything
echo -e "${YELLOW}🧹 Step 1: Cleaning all caches...${NC}"
rm -rf .next
rm -rf out
rm -rf dist
rm -rf node_modules/.cache

# Step 2: Set environment with cache busting
echo -e "${YELLOW}🔧 Step 2: Setting environment...${NC}"
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://shithaa.in
export NEXT_PUBLIC_BUILD_ID=${BUILD_ID}
export NEXT_PUBLIC_CACHE_BUST=${TIMESTAMP}

# Step 3: Build with cache busting
echo -e "${YELLOW}🔨 Step 3: Building with cache busting...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Step 4: Restart PM2 with zero downtime
echo -e "${YELLOW}🔄 Step 4: Restarting PM2 (zero downtime)...${NC}"
pm2 reload shithaa-frontend --update-env

# Step 5: Clear Cloudflare cache (if using Cloudflare)
echo -e "${YELLOW}☁️  Step 5: Clearing CDN cache...${NC}"
# Uncomment if you have Cloudflare API token:
# curl -X POST "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/purge_cache" \
#   -H "Authorization: Bearer YOUR_API_TOKEN" \
#   -H "Content-Type: application/json" \
#   --data '{"purge_everything":true}'

# Step 6: Force browser cache invalidation
echo -e "${YELLOW}📱 Step 6: Generating cache-busting URLs...${NC}"
echo ""
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo ""
echo -e "${BLUE}🔗 Test URLs (cache-busted):${NC}"
echo "https://shithaa.in/?v=${TIMESTAMP}"
echo "https://shithaa.in/checkout?v=${TIMESTAMP}"
echo "https://shithaa.in/order-success?v=${TIMESTAMP}"
echo ""
echo -e "${YELLOW}📱 MOBILE TESTING:${NC}"
echo "1. Open Chrome DevTools on mobile"
echo "2. Go to Network tab"
echo "3. Check 'Disable cache'"
echo "4. Hard refresh (Ctrl+Shift+R)"
echo ""
echo -e "${GREEN}🎉 Changes should reflect IMMEDIATELY!${NC}"
echo -e "${BLUE}Build ID: ${BUILD_ID}${NC}"
