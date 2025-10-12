#!/bin/bash

# Zero-Downtime Frontend Deployment Script
# This script builds and deploys frontend changes without disrupting users

set -e  # Exit on any error

echo "🚀 Starting Zero-Downtime Frontend Deployment..."
echo "📅 $(date)"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="frontend"
PM2_APP_NAME="shithaa-frontend"
BACKUP_DIR="/tmp/shithaa-frontend-backup-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}📋 Pre-deployment checks...${NC}"

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found! Please run this from the project root.${NC}"
    exit 1
fi

# Check if PM2 is running
if ! pm2 list | grep -q "$PM2_APP_NAME"; then
    echo -e "${RED}❌ PM2 app '$PM2_APP_NAME' not found!${NC}"
    exit 1
fi

# Check current PM2 status
echo -e "${YELLOW}📊 Current PM2 Status:${NC}"
pm2 status | grep "$PM2_APP_NAME"

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"
echo ""

# Step 1: Create backup of current build
echo -e "${BLUE}💾 Creating backup of current build...${NC}"
mkdir -p "$BACKUP_DIR"
if [ -d "$FRONTEND_DIR/.next" ]; then
    cp -r "$FRONTEND_DIR/.next" "$BACKUP_DIR/"
    echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
else
    echo -e "${YELLOW}⚠️  No existing .next directory found (first deployment?)${NC}"
fi

# Step 2: Build new version in background
echo -e "${BLUE}🔨 Building new frontend version...${NC}"
cd "$FRONTEND_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package-lock.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing/updating dependencies...${NC}"
    npm ci --silent
fi

# Build the new version
echo -e "${YELLOW}🏗️  Building Next.js application...${NC}"
npm run build

# Verify build was successful
if [ ! -d ".next" ]; then
    echo -e "${RED}❌ Build failed! .next directory not found.${NC}"
    echo -e "${YELLOW}🔄 Restoring backup...${NC}"
    cd ..
    rm -rf "$FRONTEND_DIR/.next"
    if [ -d "$BACKUP_DIR/.next" ]; then
        cp -r "$BACKUP_DIR/.next" "$FRONTEND_DIR/"
    fi
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"
cd ..

# Step 3: Graceful PM2 restart
echo -e "${BLUE}🔄 Performing graceful restart...${NC}"

# Get current uptime before restart
BEFORE_UPTIME=$(pm2 show "$PM2_APP_NAME" | grep "uptime" | awk '{print $4}' || echo "unknown")

# Use PM2 reload for zero-downtime deployment
echo -e "${YELLOW}🔄 Reloading PM2 process...${NC}"
pm2 reload "$PM2_APP_NAME" --update-env

# Wait a moment for the reload to complete
sleep 3

# Verify the process is running
if pm2 list | grep "$PM2_APP_NAME" | grep -q "online"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    
    # Get new uptime (should be reset after reload)
    AFTER_UPTIME=$(pm2 show "$PM2_APP_NAME" | grep "uptime" | awk '{print $4}' || echo "unknown")
    
    echo ""
    echo -e "${GREEN}🎉 Zero-Downtime Deployment Complete!${NC}"
    echo "================================================"
    echo -e "${BLUE}📊 Deployment Summary:${NC}"
    echo -e "   • App Name: $PM2_APP_NAME"
    echo -e "   • Before Uptime: $BEFORE_UPTIME"
    echo -e "   • After Uptime: $AFTER_UPTIME"
    echo -e "   • Backup Location: $BACKUP_DIR"
    echo -e "   • Deployment Time: $(date)"
    echo ""
    echo -e "${GREEN}✅ Users can continue using the site without interruption!${NC}"
    
    # Show current status
    echo -e "${BLUE}📈 Current PM2 Status:${NC}"
    pm2 status | grep "$PM2_APP_NAME"
    
else
    echo -e "${RED}❌ Deployment failed! Process not online after reload.${NC}"
    echo -e "${YELLOW}🔄 Attempting to restart...${NC}"
    pm2 restart "$PM2_APP_NAME"
    
    if pm2 list | grep "$PM2_APP_NAME" | grep -q "online"; then
        echo -e "${GREEN}✅ Process restarted successfully${NC}"
    else
        echo -e "${RED}❌ Critical error! Manual intervention required.${NC}"
        echo -e "${YELLOW}🔄 Restoring backup...${NC}"
        cd "$FRONTEND_DIR"
        rm -rf ".next"
        if [ -d "$BACKUP_DIR/.next" ]; then
            cp -r "$BACKUP_DIR/.next" "."
            pm2 restart "$PM2_APP_NAME"
        fi
        cd ..
        exit 1
    fi
fi

# Step 4: Cleanup old backup (optional - keep recent ones)
echo -e "${BLUE}🧹 Cleanup: Keeping backup for 24 hours...${NC}"
echo "   Backup will be automatically cleaned up by system"

echo ""
echo -e "${GREEN}🎯 Deployment completed successfully!${NC}"
echo -e "${BLUE}💡 Tip: Monitor your application logs with: pm2 logs $PM2_APP_NAME${NC}"
