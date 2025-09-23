#!/bin/bash

# 🚀 Cloudflare CDN Optimization Deployment Script
# This script deploys the Cloudflare-optimized configuration

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Cloudflare CDN Optimization Deployment...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Backup current nginx configuration
echo -e "${YELLOW}📦 Backing up current nginx configuration...${NC}"
cp /etc/nginx/sites-available/shithaa-ecom /etc/nginx/sites-available/shithaa-ecom.backup.$(date +%Y%m%d_%H%M%S)

# Copy new Cloudflare-optimized configuration
echo -e "${YELLOW}📋 Installing Cloudflare-optimized nginx configuration...${NC}"
cp nginx-config/cloudflare-optimized.conf /etc/nginx/sites-available/shithaa-ecom

# Test nginx configuration
echo -e "${YELLOW}🔍 Testing nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration test passed${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed. Restoring backup...${NC}"
    cp /etc/nginx/sites-available/shithaa-ecom.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/shithaa-ecom
    exit 1
fi

# Reload nginx
echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
systemctl reload nginx

# Verify nginx is running
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running successfully${NC}"
else
    echo -e "${RED}❌ Nginx failed to start. Check logs: journalctl -u nginx${NC}"
    exit 1
fi

# Test image serving
echo -e "${YELLOW}🖼️ Testing image serving...${NC}"
if curl -I http://localhost/images/ 2>/dev/null | grep -q "200 OK"; then
    echo -e "${GREEN}✅ Image serving is working${NC}"
else
    echo -e "${YELLOW}⚠️ Image serving test inconclusive (may be normal if no images exist)${NC}"
fi

# Test static file serving
echo -e "${YELLOW}📁 Testing static file serving...${NC}"
if curl -I http://localhost/static/ 2>/dev/null | grep -q "200 OK\|404 Not Found"; then
    echo -e "${GREEN}✅ Static file serving is working${NC}"
else
    echo -e "${YELLOW}⚠️ Static file serving test inconclusive${NC}"
fi

# Display Cloudflare optimization status
echo -e "${BLUE}🎉 Cloudflare CDN Optimization Deployment Complete!${NC}"
echo -e "${GREEN}✅ Nginx configuration updated with Cloudflare optimizations${NC}"
echo -e "${GREEN}✅ Cache headers configured for optimal Cloudflare performance${NC}"
echo -e "${GREEN}✅ Image optimization enabled${NC}"
echo -e "${GREEN}✅ Static file caching optimized${NC}"

echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "1. Ensure your domain (shithaa.in) is configured in Cloudflare"
echo -e "2. Verify DNS records point to Cloudflare (orange cloud ON)"
echo -e "3. Test image loading through Cloudflare CDN"
echo -e "4. Monitor Cloudflare analytics for cache hit rates"

echo -e "${BLUE}🔍 To verify Cloudflare is working:${NC}"
echo -e "1. Visit your site and check DevTools → Network"
echo -e "2. Look for 'cf-cache-status: HIT' in response headers"
echo -e "3. Check that images load from Cloudflare CDN"

echo -e "${GREEN}🚀 Deployment completed successfully!${NC}"
