#!/bin/bash

# ===============================================
# CLOUDFLARE CACHE PURGE SCRIPT
# ===============================================
# Automatically purges Cloudflare cache on deployment
# 
# Setup:
# 1. Get Cloudflare API token from: https://dash.cloudflare.com/profile/api-tokens
# 2. Add to .env: CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN
# 3. Run this script after every deployment

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}☁️  Cloudflare Cache Purge${NC}"
echo "========================================"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Check if required variables are set
if [ -z "$CLOUDFLARE_ZONE_ID" ] || [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo -e "${RED}❌ Missing Cloudflare credentials!${NC}"
    echo ""
    echo "Please add to your .env file:"
    echo "CLOUDFLARE_ZONE_ID=your_zone_id"
    echo "CLOUDFLARE_API_TOKEN=your_api_token"
    echo ""
    echo "Get these from: https://dash.cloudflare.com"
    exit 1
fi

echo -e "${YELLOW}🔄 Purging ALL Cloudflare cache...${NC}"

# Purge everything
RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}')

# Check if successful (check for both "success":true and "success": true with space)
if echo "$RESPONSE" | grep -q '"success":[[:space:]]*true'; then
    echo -e "${GREEN}✅ Cloudflare cache purged successfully!${NC}"
    echo ""
    echo -e "${GREEN}🎉 All users will now get the latest version IMMEDIATELY!${NC}"
    exit 0
else
    echo -e "${RED}❌ Failed to purge Cloudflare cache${NC}"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "Please check:"
    echo "1. CLOUDFLARE_ZONE_ID is correct"
    echo "2. CLOUDFLARE_API_TOKEN has 'Cache Purge' permission"
    exit 1
fi

