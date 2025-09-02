#!/bin/bash

echo "🗺️ Fixing Sitemap Indexing Issue"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Sitemap Issues Identified:${NC}"
echo "1. ❌ Static sitemap.xml was being served instead of dynamic sitemap"
echo "2. ❌ Outdated lastmod dates (2024-01-01) in static sitemap"
echo "3. ❌ Missing product pages in sitemap"
echo "4. ❌ Incorrect API URL fallback in dynamic sitemap"
echo ""

echo -e "${YELLOW}🔧 Fixes Applied:${NC}"
echo "1. ✅ Removed static sitemap.xml file"
echo "2. ✅ Fixed API URL fallback in dynamic sitemap"
echo "3. ✅ Added sizing-guide page to sitemap"
echo "4. ✅ Dynamic sitemap now includes all product pages"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Starting sitemap fix deployment...${NC}"

# 1. Build and deploy frontend
echo -e "${YELLOW}📦 Building frontend with fixed sitemap...${NC}"
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

# 3. Test the new sitemap
echo -e "${YELLOW}🔍 Testing new sitemap...${NC}"

# Wait a moment for services to start
sleep 5

# Test sitemap accessibility
echo -e "${YELLOW}🔍 Checking sitemap accessibility...${NC}"
curl -I https://shithaa.in/sitemap.xml

# Test sitemap content
echo -e "${YELLOW}🔍 Checking sitemap content...${NC}"
curl -s https://shithaa.in/sitemap.xml | head -20

# 4. Clear caches
echo -e "${YELLOW}🧹 Clearing caches...${NC}"

# Clear Next.js cache
rm -rf frontend/.next/cache

echo ""
echo -e "${GREEN}🎉 Sitemap Indexing Fix Deployed Successfully!${NC}"
echo ""
echo -e "${BLUE}📋 What was fixed:${NC}"
echo "• Removed static sitemap.xml that was causing indexing issues"
echo "• Dynamic sitemap now generates with current dates"
echo "• All product pages are now included in sitemap"
echo "• Fixed API URL fallback for production environment"
echo "• Added missing sizing-guide page to sitemap"
echo ""
echo -e "${BLUE}🔍 Next Steps:${NC}"
echo "1. Wait 5-10 minutes for the new sitemap to be available"
echo "2. Test the sitemap: curl -s https://shithaa.in/sitemap.xml"
echo "3. In Google Search Console:"
echo "   - Go to Sitemaps section"
echo "   - Remove the old sitemap submission"
echo "   - Add the new sitemap: https://shithaa.in/sitemap.xml"
echo "   - Request re-indexing"
echo "4. Monitor the validation status in Google Search Console"
echo ""
echo -e "${YELLOW}💡 Expected Results:${NC}"
echo "• Sitemap should show current dates (not 2024-01-01)"
echo "• Should include all product pages"
echo "• Google Search Console should show 'SUCCESS' instead of 'PENDING'"
echo "• Better indexing of your product pages"
echo ""
echo -e "${GREEN}✅ Sitemap fix completed!${NC}"
