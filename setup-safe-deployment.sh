#!/bin/bash

# 🚀 SETUP SAFE DEPLOYMENT FOR SHITHAA E-COMMERCE
# This script sets up your safe development pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 SETTING UP SAFE DEPLOYMENT PIPELINE${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    exit 1
fi

# Make scripts executable
echo -e "${YELLOW}🔧 Making scripts executable...${NC}"
chmod +x scripts/safe-deploy.sh
chmod +x scripts/staging-deploy.sh
chmod +x scripts/quick-fix.sh

# Create backup directories
echo -e "${YELLOW}📁 Creating backup directories...${NC}"
mkdir -p /var/www/backups
mkdir -p /var/www/quick-fix-backups

# Set up git branches
echo -e "${YELLOW}🌿 Setting up git branches...${NC}"
cd /var/www/shithaa-ecom

# Ensure we're on develop branch
git checkout develop

# Create backup of current main branch
echo -e "${YELLOW}💾 Creating backup of current production...${NC}"
git checkout main
git tag "production-backup-$(date +%Y%m%d_%H%M%S)"
git checkout develop

# Set up staging environment
echo -e "${YELLOW}🧪 Setting up staging environment...${NC}"
./scripts/staging-deploy.sh setup

echo -e "${GREEN}🎉 SETUP COMPLETE!${NC}"
echo ""
echo -e "${BLUE}Your safe deployment pipeline is ready!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Make changes on develop branch"
echo "2. Test on staging: sudo ./scripts/staging-deploy.sh deploy"
echo "3. Deploy to production: sudo ./scripts/safe-deploy.sh deploy"
echo ""
echo -e "${YELLOW}Quick commands:${NC}"
echo "• Check status: pm2 status"
echo "• View logs: pm2 logs"
echo "• Emergency fix: sudo ./scripts/quick-fix.sh frontend"
echo "• Rollback: sudo ./scripts/safe-deploy.sh rollback"
echo ""
echo -e "${GREEN}Your site is now bulletproof! 🛡️${NC}"
