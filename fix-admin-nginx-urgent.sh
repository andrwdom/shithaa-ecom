#!/bin/bash

echo "🚨 URGENT: Fixing Admin Panel Domain Misconfiguration"
echo "======================================================="
echo ""

# Check current nginx config for admin.shithaa.in
echo "1. Checking nginx configuration for admin.shithaa.in:"
if [ -f "/etc/nginx/sites-available/admin.shithaa.in" ]; then
    echo "✅ Found config file"
    echo ""
    echo "Current configuration:"
    cat /etc/nginx/sites-available/admin.shithaa.in
    echo ""
else
    echo "❌ Config file not found at /etc/nginx/sites-available/admin.shithaa.in"
    echo ""
    echo "Checking for any config with 'admin.shithaa':"
    grep -r "admin.shithaa" /etc/nginx/sites-available/ 2>/dev/null || echo "Not found"
fi

echo ""
echo "2. Checking what directory admin.shithaa.in is serving:"
echo "Looking for 'root' directive in nginx config..."
if [ -f "/etc/nginx/sites-available/admin.shithaa.in" ]; then
    grep "root\|server_name" /etc/nginx/sites-available/admin.shithaa.in
fi

echo ""
echo "3. Checking Shithaa admin directory:"
if [ -d "/var/www/shithaa-ecom/admin" ]; then
    echo "✅ Shithaa admin directory exists: /var/www/shithaa-ecom/admin"
    ls -lah /var/www/shithaa-ecom/admin/ | head -10
else
    echo "❌ Shithaa admin directory not found"
fi

echo ""
echo "4. Checking for JJ Textiles directory (wrong one being served):"
find /var/www -name "*jjtextiles*" -o -name "*textile*" 2>/dev/null | head -10

echo ""
echo "5. Current working directory listings:"
echo "Shithaa project:"
ls -la /var/www/shithaa-ecom/ 2>/dev/null | grep admin

echo ""
echo "6. Checking nginx symlinks:"
if [ -L "/etc/nginx/sites-enabled/admin.shithaa.in" ]; then
    echo "Symlink exists, pointing to:"
    ls -l /etc/nginx/sites-enabled/admin.shithaa.in
else
    echo "❌ No symlink in sites-enabled for admin.shithaa.in"
fi

echo ""
echo "============================================"
echo "🔍 DIAGNOSIS COMPLETE"
echo "============================================"

