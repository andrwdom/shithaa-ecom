#!/bin/bash
#
# DEPLOY NAVBAR/FOOTER DUPLICATE FIX
# This fixes the double navbar and footer rendering issue
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           DEPLOYING NAVBAR/FOOTER DUPLICATE FIX        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}🔧 FIXING: Duplicate navbar and footer rendering${NC}"
echo -e "${YELLOW}📋 ISSUE: Product pages showing double navbar and footer${NC}"
echo -e "${YELLOW}💡 ROOT CAUSE: ProductPageClient was rendering its own navbar/footer${NC}"
echo -e "${YELLOW}✅ SOLUTION: Removed duplicate components, LayoutClient handles them${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
  echo -e "${RED}Error: Not in project root directory${NC}"
  echo "Please run from: /var/www/shithaa-ecom"
  exit 1
fi

echo -e "${BLUE}1. Pulling latest changes...${NC}"
git pull origin develop

echo -e "${BLUE}2. Building frontend...${NC}"
cd frontend
npm run build
cd ..

echo -e "${BLUE}3. Restarting services...${NC}"
pm2 restart all

echo -e "${BLUE}4. Verifying deployment...${NC}"
sleep 3

echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo ""
echo -e "${BLUE}📊 WHAT'S FIXED:${NC}"
echo "• Product pages now show single navbar (not double)"
echo "• Product pages now show single footer (not double)"
echo "• Layout is cleaner and more professional"
echo "• No more duplicate navigation elements"
echo ""
echo -e "${BLUE}🧪 TESTING:${NC}"
echo "• Visit any product page: https://shithaa.in/product/[product-id]"
echo "• Check that navbar appears only once at the top"
echo "• Check that footer appears only once at the bottom"
echo "• Verify navigation and cart functionality works"
echo ""
echo -e "${GREEN}🎯 EXPECTED RESULT:${NC}"
echo "• Clean, single navbar at the top"
echo "• Clean, single footer at the bottom"
echo "• No duplicate elements"
echo "• Better user experience"
echo ""
