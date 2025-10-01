#!/bin/bash

echo "========================================="
echo "🖼️  Quick Fix: Hero Images from Products"
echo "========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Deploy backend
echo -e "${YELLOW}🔧 Restarting backend...${NC}"
cd backend
pm2 restart backend
sleep 2
echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

# Test API
echo -e "${YELLOW}🧪 Testing hero images API...${NC}"
curl -s "http://localhost:4000/api/hero-images?categoryId=maternity-feeding-wear&device=desktop&limit=6" | jq '.'
echo ""

echo -e "${BLUE}Check the output above:${NC}"
echo "- Look for 'Found X products for category'"
echo "- Look for 'Sample product' with categorySlug and images"
echo "- Check if 'images' array has items"
echo ""

# Deploy frontend
echo -e "${YELLOW}📦 Building frontend...${NC}"
cd ../frontend
rm -rf .next
npm run build
pm2 restart frontend
echo -e "${GREEN}✅ Frontend restarted${NC}"
echo ""

echo "========================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo -e "${BLUE}📝 Next Steps:${NC}"
echo "1. Check PM2 logs: pm2 logs backend --lines 50"
echo "2. Look for messages like:"
echo "   - 'Found X products for category: maternity-feeding-wear'"
echo "   - 'Using product image for hero: [product name]'"
echo "3. Test: https://shithaa.in/"
echo "4. Hero cards should now show rotating product images!"
echo ""

