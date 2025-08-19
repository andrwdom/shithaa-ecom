#!/bin/bash

echo "🔍 CHECKING CURRENT NGINX CONFIGURATION ON VPS"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Checking nginx service status...${NC}"
systemctl status nginx --no-pager -l

echo ""
echo -e "${YELLOW}🔧 Testing nginx configuration syntax...${NC}"
nginx -t

echo ""
echo -e "${YELLOW}📁 Checking nginx configuration files...${NC}"
echo "Main config:"
ls -la /etc/nginx/nginx.conf

echo ""
echo "Available sites:"
ls -la /etc/nginx/sites-available/

echo ""
echo "Enabled sites:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo -e "${YELLOW}🔍 Checking for shithaa.conf specifically...${NC}"
if [ -f "/etc/nginx/sites-available/shithaa.conf" ]; then
    echo -e "${GREEN}✅ shithaa.conf found in sites-available${NC}"
    echo "File size: $(ls -lh /etc/nginx/sites-available/shithaa.conf | awk '{print $5}')"
    echo "Last modified: $(ls -lh /etc/nginx/sites-available/shithaa.conf | awk '{print $6, $7, $8}')"
else
    echo -e "${RED}❌ shithaa.conf NOT found in sites-available${NC}"
fi

if [ -L "/etc/nginx/sites-enabled/shithaa.conf" ]; then
    echo -e "${GREEN}✅ shithaa.conf is enabled (symlinked)${NC}"
    echo "Symlink target: $(readlink /etc/nginx/sites-enabled/shithaa.conf)"
else
    echo -e "${RED}❌ shithaa.conf is NOT enabled${NC}"
fi

echo ""
echo -e "${YELLOW}📊 Checking nginx processes...${NC}"
ps aux | grep nginx | grep -v grep

echo ""
echo -e "${YELLOW}🌐 Checking listening ports...${NC}"
netstat -tlnp | grep :80
netstat -tlnp | grep :443

echo ""
echo -e "${YELLOW}📝 Recent nginx error logs (last 10 lines)...${NC}"
if [ -f "/var/log/nginx/error.log" ]; then
    tail -10 /var/log/nginx/error.log
else
    echo -e "${RED}❌ Error log file not found${NC}"
fi

echo ""
echo -e "${YELLOW}📝 Recent nginx access logs (last 5 lines)...${NC}"
if [ -f "/var/log/nginx/access.log" ]; then
    tail -5 /var/log/nginx/access.log
else
    echo -e "${RED}❌ Access log file not found${NC}"
fi

echo ""
echo -e "${GREEN}🎯 SUMMARY:${NC}"
echo "1. Check if shithaa.conf exists in sites-available"
echo "2. Check if it's enabled in sites-enabled"
echo "3. Verify nginx configuration syntax is valid"
echo "4. Check for any error logs"

echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "1. If shithaa.conf doesn't exist, we'll create it"
echo "2. If it exists but is different, we'll update it"
echo "3. If nginx config is invalid, we'll fix it"
echo "4. We'll restart nginx after making changes"
