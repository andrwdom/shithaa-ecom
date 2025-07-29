#!/bin/bash

# Diagnostic script for Next.js static file serving issues
echo "🔍 Diagnosing Next.js Static File Serving Issues"
echo "================================================"

# Check if Next.js build exists
echo "1. Checking Next.js build directory..."
if [ -d "/var/www/shithaa-ecom/frontend/.next" ]; then
    echo "✅ .next directory exists"
    echo "   Size: $(du -sh /var/www/shithaa-ecom/frontend/.next | cut -f1)"
else
    echo "❌ .next directory not found!"
    echo "   Run: cd /var/www/shithaa-ecom/frontend && npm run build"
fi

# Check static files
echo ""
echo "2. Checking static files..."
if [ -d "/var/www/shithaa-ecom/frontend/.next/static" ]; then
    echo "✅ Static directory exists"
    echo "   Files: $(find /var/www/shithaa-ecom/frontend/.next/static -name "*.js" | wc -l) JS files"
    echo "   Files: $(find /var/www/shithaa-ecom/frontend/.next/static -name "*.css" | wc -l) CSS files"
    
    # Show a sample file
    echo "   Sample JS file:"
    find /var/www/shithaa-ecom/frontend/.next/static -name "*.js" | head -1
else
    echo "❌ Static directory not found!"
fi

# Check permissions
echo ""
echo "3. Checking file permissions..."
if [ -d "/var/www/shithaa-ecom/frontend/.next" ]; then
    echo "   .next directory permissions: $(stat -c '%a' /var/www/shithaa-ecom/frontend/.next)"
    echo "   Owner: $(stat -c '%U:%G' /var/www/shithaa-ecom/frontend/.next)"
    
    # Check if nginx can read the files
    if [ -r "/var/www/shithaa-ecom/frontend/.next" ]; then
        echo "✅ Directory is readable"
    else
        echo "❌ Directory is not readable by current user"
    fi
fi

# Check Nginx configuration
echo ""
echo "4. Checking Nginx configuration..."
if command -v nginx &> /dev/null; then
    echo "✅ Nginx is installed"
    echo "   Version: $(nginx -v 2>&1)"
    
    # Test nginx config
    if nginx -t &> /dev/null; then
        echo "✅ Nginx configuration is valid"
    else
        echo "❌ Nginx configuration has errors:"
        nginx -t
    fi
else
    echo "❌ Nginx not found"
fi

# Check if processes are running
echo ""
echo "5. Checking running processes..."
if pgrep -f "next" > /dev/null; then
    echo "✅ Next.js process is running"
    echo "   PIDs: $(pgrep -f "next" | tr '\n' ' ')"
else
    echo "❌ Next.js process not running"
fi

if pgrep nginx > /dev/null; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running"
fi

# Test static file serving
echo ""
echo "6. Testing static file access..."
STATIC_FILE=$(find /var/www/shithaa-ecom/frontend/.next/static -name "*.js" | head -1)
if [ -n "$STATIC_FILE" ]; then
    echo "   Testing file: $STATIC_FILE"
    
    # Test direct file access
    if [ -r "$STATIC_FILE" ]; then
        echo "✅ File is readable"
        echo "   Size: $(stat -c '%s' "$STATIC_FILE") bytes"
        echo "   MIME type: $(file --mime-type "$STATIC_FILE" | cut -d: -f2 | xargs)"
    else
        echo "❌ File is not readable"
    fi
    
    # Test HTTP access
    FILENAME=$(basename "$STATIC_FILE")
    echo "   Testing HTTP access..."
    HTTP_RESPONSE=$(curl -s -I "https://shithaa.in/_next/static/chunks/app/layout-${FILENAME}" 2>/dev/null | head -1)
    if [ -n "$HTTP_RESPONSE" ]; then
        echo "   HTTP Response: $HTTP_RESPONSE"
        CONTENT_TYPE=$(curl -s -I "https://shithaa.in/_next/static/chunks/app/layout-${FILENAME}" 2>/dev/null | grep -i "content-type" | cut -d: -f2 | xargs)
        echo "   Content-Type: $CONTENT_TYPE"
    else
        echo "❌ HTTP request failed"
    fi
fi

echo ""
echo "🔧 Recommended Actions:"
echo "======================"

if [ ! -d "/var/www/shithaa-ecom/frontend/.next" ]; then
    echo "1. Build the Next.js application:"
    echo "   cd /var/www/shithaa-ecom/frontend && npm run build"
fi

echo "2. Update Nginx configuration to properly serve static files"
echo "3. Restart Nginx: sudo systemctl restart nginx"
echo "4. Check Nginx error logs: sudo tail -f /var/log/nginx/error.log"

echo ""
echo "📋 Quick Fix Commands:"
echo "====================="
echo "# Fix permissions"
echo "sudo chown -R www-data:www-data /var/www/shithaa-ecom/frontend/.next"
echo "sudo chmod -R 755 /var/www/shithaa-ecom/frontend/.next"
echo ""
echo "# Rebuild and restart"
echo "cd /var/www/shithaa-ecom/frontend"
echo "npm run build"
echo "sudo systemctl restart nginx"
