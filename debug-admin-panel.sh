#!/bin/bash

# Comprehensive Admin Panel Debugging Script
echo "🔍 Admin Panel Debugging Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Checking PM2 Status...${NC}"
pm2 status

echo -e "\n${BLUE}2. Checking if admin panel is listening on port 5174...${NC}"
netstat -tlnp | grep :5174 || echo -e "${RED}❌ Port 5174 not listening${NC}"

echo -e "\n${BLUE}3. Testing local access to admin panel...${NC}"
if curl -s http://localhost:5174 > /dev/null; then
    echo -e "${GREEN}✅ Admin panel accessible locally on port 5174${NC}"
else
    echo -e "${RED}❌ Admin panel NOT accessible locally on port 5174${NC}"
fi

echo -e "\n${BLUE}4. Checking nginx configuration...${NC}"
nginx -t

echo -e "\n${BLUE}5. Checking nginx status...${NC}"
systemctl status nginx --no-pager -l

echo -e "\n${BLUE}6. Checking nginx error logs...${NC}"
echo "Last 10 nginx error log entries:"
tail -10 /var/log/nginx/error.log

echo -e "\n${BLUE}7. Checking nginx access logs for admin.shithaa.in...${NC}"
echo "Last 10 access log entries for admin.shithaa.in:"
grep "admin.shithaa.in" /var/log/nginx/access.log | tail -10 || echo "No access logs found for admin.shithaa.in"

echo -e "\n${BLUE}8. Checking if admin.shithaa.in resolves correctly...${NC}"
nslookup admin.shithaa.in

echo -e "\n${BLUE}9. Testing admin.shithaa.in from server...${NC}"
curl -I https://admin.shithaa.in 2>/dev/null || echo -e "${RED}❌ Cannot access admin.shithaa.in from server${NC}"

echo -e "\n${BLUE}10. Checking firewall status...${NC}"
ufw status

echo -e "\n${BLUE}11. Checking if port 5174 is open...${NC}"
ss -tlnp | grep :5174

echo -e "\n${BLUE}12. Checking PM2 logs for admin panel...${NC}"
echo "Last 20 lines of admin panel logs:"
pm2 logs admin-panel --lines 20 --nostream

echo -e "\n${YELLOW}==================================${NC}"
echo -e "${YELLOW}Debugging Complete!${NC}"
echo -e "${YELLOW}Check the output above for any issues.${NC}"
