#!/bin/bash

echo "🔍 Checking Image File Locations on VPS"
echo "========================================="
echo ""

# Check if uploads directory exists
echo "1. Checking uploads directory structure:"
if [ -d "/var/www/shithaa-ecom/backend/uploads" ]; then
    echo "✅ Found: /var/www/shithaa-ecom/backend/uploads"
    ls -lah /var/www/shithaa-ecom/backend/uploads/
    echo ""
    
    # Check products subdirectory
    if [ -d "/var/www/shithaa-ecom/backend/uploads/products" ]; then
        echo "✅ Found: /var/www/shithaa-ecom/backend/uploads/products"
        echo "Total files: $(find /var/www/shithaa-ecom/backend/uploads/products -type f | wc -l)"
        echo "Sample files:"
        ls -lh /var/www/shithaa-ecom/backend/uploads/products/ | head -10
    else
        echo "❌ Missing: /var/www/shithaa-ecom/backend/uploads/products"
    fi
else
    echo "❌ Missing: /var/www/shithaa-ecom/backend/uploads"
fi

echo ""
echo "2. Checking alternative locations:"

# Check if images are in /var/www/html
if [ -d "/var/www/html/images/products" ]; then
    echo "✅ Found: /var/www/html/images/products"
    echo "Total files: $(find /var/www/html/images/products -type f | wc -l)"
else
    echo "❌ Not found: /var/www/html/images/products"
fi

# Check nginx serving location
if [ -d "/var/www/shithaa-ecom/uploads" ]; then
    echo "✅ Found: /var/www/shithaa-ecom/uploads"
    ls -lah /var/www/shithaa-ecom/uploads/
else
    echo "❌ Not found: /var/www/shithaa-ecom/uploads"
fi

echo ""
echo "3. Checking nginx configuration:"
if [ -f "/etc/nginx/sites-available/shithaa.in" ]; then
    echo "Looking for /images/ location directive:"
    grep -A 5 "location /images" /etc/nginx/sites-available/shithaa.in || echo "No /images/ location found"
fi

echo ""
echo "4. Test specific file from error:"
TEST_FILE="/var/www/shithaa-ecom/backend/uploads/products/1754590055195-870170921.webp"
if [ -f "$TEST_FILE" ]; then
    echo "✅ Found test file: $TEST_FILE"
    ls -lh "$TEST_FILE"
else
    echo "❌ Missing test file: $TEST_FILE"
    
    # Search for it elsewhere
    echo "Searching for file in other locations..."
    find /var/www -name "1754590055195-870170921.webp" 2>/dev/null || echo "File not found anywhere"
fi

echo ""
echo "5. Database vs Filesystem check:"
echo "Products in DB expect images at: /images/products/*.webp"
echo "Need to ensure files exist and nginx serves them correctly"

