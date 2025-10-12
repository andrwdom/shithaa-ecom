#!/bin/bash

# Quick Zero-Downtime Deploy Script
# For simple changes that don't require rebuilding

echo "🚀 Quick Zero-Downtime Deploy..."
echo "📅 $(date)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PM2_APP_NAME="shithaa-frontend"

echo -e "${BLUE}🔄 Performing graceful PM2 reload...${NC}"

# Use PM2 reload for zero-downtime
pm2 reload "$PM2_APP_NAME" --update-env

# Wait and verify
sleep 2

if pm2 list | grep "$PM2_APP_NAME" | grep -q "online"; then
    echo -e "${GREEN}✅ Quick deploy successful!${NC}"
    pm2 status | grep "$PM2_APP_NAME"
else
    echo -e "${YELLOW}⚠️  Reload failed, attempting restart...${NC}"
    pm2 restart "$PM2_APP_NAME"
    echo -e "${GREEN}✅ Restart completed${NC}"
fi

echo -e "${BLUE}💡 Monitor logs: pm2 logs $PM2_APP_NAME${NC}"
