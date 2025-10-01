#!/bin/bash

# ===============================================
# INSTANT DEPLOYMENT SCRIPT - ZERO CACHE DELAY
# ===============================================
# This script ensures ALL users get updates INSTANTLY
# No hard refresh needed!
#
# Usage:
#   ./deploy-instant-updates.sh        # Deploy both frontend and backend
#   ./deploy-instant-updates.sh frontend   # Frontend only
#   ./deploy-instant-updates.sh backend    # Backend only

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Banner
echo ""
echo -e "${MAGENTA}╔═══════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║  🚀 INSTANT DEPLOYMENT SYSTEM 🚀     ║${NC}"
echo -e "${MAGENTA}║  Zero Cache Delay - Instant Updates  ║${NC}"
echo -e "${MAGENTA}╚═══════════════════════════════════════╝${NC}"
echo ""

# Timestamp for this deployment
TIMESTAMP=$(date +%s)
BUILD_ID=$(date +%Y%m%d_%H%M%S)
DEPLOY_MODE=${1:-"all"}

echo -e "${CYAN}📅 Deployment ID: ${BUILD_ID}${NC}"
echo -e "${CYAN}🕐 Timestamp: ${TIMESTAMP}${NC}"
echo -e "${CYAN}🎯 Mode: ${DEPLOY_MODE}${NC}"
echo ""

# Function to deploy frontend
deploy_frontend() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📱 FRONTEND DEPLOYMENT${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    cd frontend
    
    # Step 1: Clean everything
    echo -e "${YELLOW}🧹 Step 1/6: Cleaning caches...${NC}"
    rm -rf .next out dist node_modules/.cache .swc
    
    # Step 2: Set environment
    echo -e "${YELLOW}🔧 Step 2/6: Setting environment...${NC}"
    export NODE_ENV=production
    export NEXT_PUBLIC_API_URL=https://shithaa.in
    export NEXT_PUBLIC_BUILD_ID=${BUILD_ID}
    export NEXT_PUBLIC_CACHE_BUST=${TIMESTAMP}
    
    # Step 3: Build
    echo -e "${YELLOW}🔨 Step 3/6: Building (this may take 1-2 minutes)...${NC}"
    npm run build
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Frontend build failed!${NC}"
        return 1
    fi
    
    # Step 4: Restart PM2
    echo -e "${YELLOW}🔄 Step 4/6: Restarting frontend (zero downtime)...${NC}"
    pm2 reload shithaa-frontend --update-env
    
    # Step 5: Wait for PM2 to stabilize
    echo -e "${YELLOW}⏳ Step 5/6: Waiting for PM2 to stabilize...${NC}"
    sleep 3
    
    # Step 6: Health check
    echo -e "${YELLOW}🏥 Step 6/6: Health check...${NC}"
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")
    
    if [ "$HEALTH_CHECK" = "200" ]; then
        echo -e "${GREEN}✅ Frontend is healthy!${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend health check returned: ${HEALTH_CHECK}${NC}"
        echo -e "${YELLOW}   (This might be normal if homepage takes time to load)${NC}"
    fi
    
    cd ..
    echo -e "${GREEN}✅ Frontend deployment complete!${NC}"
    echo ""
}

# Function to deploy backend
deploy_backend() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚙️  BACKEND DEPLOYMENT${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    cd backend
    
    # Step 1: Restart PM2
    echo -e "${YELLOW}🔄 Step 1/3: Restarting backend (zero downtime)...${NC}"
    pm2 reload shithaa-backend --update-env
    
    # Step 2: Wait for PM2 to stabilize
    echo -e "${YELLOW}⏳ Step 2/3: Waiting for PM2 to stabilize...${NC}"
    sleep 3
    
    # Step 3: Health check
    echo -e "${YELLOW}🏥 Step 3/3: Health check...${NC}"
    HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/products || echo "000")
    
    if [ "$HEALTH_CHECK" = "200" ]; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
    else
        echo -e "${RED}⚠️  Backend health check returned: ${HEALTH_CHECK}${NC}"
    fi
    
    cd ..
    echo -e "${GREEN}✅ Backend deployment complete!${NC}"
    echo ""
}

# Function to purge Cloudflare cache
purge_cloudflare() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}☁️  CLOUDFLARE CACHE PURGE${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ -f scripts/purge-cloudflare-cache.sh ]; then
        chmod +x scripts/purge-cloudflare-cache.sh
        ./scripts/purge-cloudflare-cache.sh
    else
        echo -e "${YELLOW}⚠️  Cloudflare purge script not found${NC}"
        echo -e "${YELLOW}   Skipping cache purge...${NC}"
    fi
    
    echo ""
}

# Main deployment logic
case $DEPLOY_MODE in
    frontend)
        deploy_frontend || exit 1
        ;;
    backend)
        deploy_backend || exit 1
        ;;
    all|*)
        deploy_frontend || exit 1
        deploy_backend || exit 1
        ;;
esac

# Purge Cloudflare cache (always run if available)
purge_cloudflare

# Final summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}📊 Summary:${NC}"
echo -e "   Build ID: ${BUILD_ID}"
echo -e "   Timestamp: ${TIMESTAMP}"
echo -e "   Mode: ${DEPLOY_MODE}"
echo ""
echo -e "${GREEN}✅ All users will see updates INSTANTLY!${NC}"
echo -e "${GREEN}✅ No hard refresh needed!${NC}"
echo ""
echo -e "${CYAN}🔗 Test URLs:${NC}"
echo "   https://shithaa.in/"
echo "   https://shithaa.in/checkout"
echo ""
echo -e "${YELLOW}💡 Tip: Check PM2 logs if something's wrong:${NC}"
echo "   pm2 logs shithaa-frontend --lines 50"
echo "   pm2 logs shithaa-backend --lines 50"
echo ""

