#!/bin/bash

echo "🔍 Deploying SEO Fixes for Shithaa.in"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 SEO Issues Fixed:${NC}"
echo "1. ✅ Updated API documentation title from 'JJTEX' to 'Shithaa'"
echo "2. ✅ Fixed robots.txt base URL fallback to use https://shithaa.in"
echo "3. ✅ Fixed sitemap.ts base URL fallback to use https://shithaa.in"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Starting deployment process...${NC}"

# 1. Build and deploy frontend
echo -e "${YELLOW}📦 Building frontend with SEO fixes...${NC}"
cd frontend

# Set production environment variables
export NODE_ENV=production
export NEXT_PUBLIC_SITE_URL=https://shithaa.in
export NEXT_PUBLIC_API_URL=https://shithaa.in

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# Build the application
echo -e "${YELLOW}🔨 Building Next.js application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build completed successfully!${NC}"
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

cd ..

# 2. Restart services
echo -e "${YELLOW}🔄 Restarting services...${NC}"

# Restart PM2 processes
echo -e "${YELLOW}🔄 Restarting PM2 processes...${NC}"
pm2 restart all

# Restart Nginx
echo -e "${YELLOW}🔄 Restarting Nginx...${NC}"
sudo systemctl restart nginx

# Check service status
echo -e "${YELLOW}🔍 Checking service status...${NC}"
pm2 status
sudo systemctl status nginx --no-pager -l

# 3. Verify SEO fixes
echo -e "${YELLOW}🔍 Verifying SEO fixes...${NC}"

# Check if robots.txt is accessible
echo -e "${YELLOW}🔍 Checking robots.txt...${NC}"
curl -s https://shithaa.in/robots.txt | head -10

# Check if sitemap.xml is accessible
echo -e "${YELLOW}🔍 Checking sitemap.xml...${NC}"
curl -s https://shithaa.in/sitemap.xml | head -10

# 4. Clear any caches
echo -e "${YELLOW}🧹 Clearing caches...${NC}"

# Clear Next.js cache
rm -rf frontend/.next/cache

# Clear any browser caches (if applicable)
echo -e "${YELLOW}💡 Tip: Clear your browser cache to see the changes immediately${NC}"

echo ""
echo -e "${GREEN}🎉 SEO Fixes Deployed Successfully!${NC}"
echo ""
echo -e "${BLUE}📋 What was fixed:${NC}"
echo "• Backend API documentation now shows 'Shithaa' instead of 'JJTEX'"
echo "• Robots.txt now uses correct production URL (https://shithaa.in)"
echo "• Sitemap.xml now uses correct production URL (https://shithaa.in)"
echo "• All services restarted to apply changes"
echo ""
echo -e "${BLUE}🔍 Next Steps:${NC}"
echo "1. Wait 24-48 hours for Google to re-crawl your site"
echo "2. Submit your sitemap to Google Search Console: https://shithaa.in/sitemap.xml"
echo "3. Request re-indexing of your homepage in Google Search Console"
echo "4. Monitor search results for 'shithaa.in' over the next few days"
echo ""
echo -e "${YELLOW}💡 Additional SEO Recommendations:${NC}"
echo "• Ensure NEXT_PUBLIC_SITE_URL=https://shithaa.in is set in your production environment"
echo "• Consider adding Google Analytics and Google Search Console verification"
echo "• Monitor your site's performance in Google Search Console"
echo "• Keep your sitemap updated with new products and pages"
echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
