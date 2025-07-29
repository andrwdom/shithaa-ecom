#!/bin/bash

# Quick fix script for Next.js static file serving issues
echo "🔧 Fixing Next.js Static File Serving Issues"
echo "============================================="

# Set variables
FRONTEND_DIR="/var/www/shithaa-ecom/frontend"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

# Step 1: Ensure frontend is built
echo "1. Building Next.js application..."
cd $FRONTEND_DIR
if [ -f "package.json" ]; then
    npm run build
    echo "✅ Build completed"
else
    echo "❌ package.json not found in $FRONTEND_DIR"
    exit 1
fi

# Step 2: Fix permissions
echo ""
echo "2. Fixing file permissions..."
sudo chown -R www-data:www-data $FRONTEND_DIR/.next
sudo chmod -R 755 $FRONTEND_DIR/.next
echo "✅ Permissions fixed"

# Step 3: Create/update Nginx configuration
echo ""
echo "3. Updating Nginx configuration..."

# Backup existing config if it exists
if [ -f "$NGINX_SITES_DIR/shithaa" ]; then
    sudo cp "$NGINX_SITES_DIR/shithaa" "$NGINX_SITES_DIR/shithaa.backup.$(date +%Y%m%d_%H%M%S)"
    echo "✅ Existing config backed up"
fi

# Create the new configuration
sudo tee "$NGINX_SITES_DIR/shithaa" > /dev/null << 'EOF'
server {
    listen 80;
    server_name shithaa.in www.shithaa.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shithaa.in www.shithaa.in;
    
    # SSL Configuration (adjust paths as needed)
    ssl_certificate /etc/letsencrypt/live/shithaa.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shithaa.in/privkey.pem;
    
    # Handle Next.js static files with proper MIME types
    location /_next/static/ {
        alias /var/www/shithaa-ecom/frontend/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Ensure proper MIME types for JavaScript files
        location ~* \.(js)$ {
            add_header Content-Type "application/javascript; charset=utf-8";
        }
        
        # Ensure proper MIME types for CSS files
        location ~* \.(css)$ {
            add_header Content-Type "text/css; charset=utf-8";
        }
        
        # Ensure proper MIME types for JSON files
        location ~* \.(json)$ {
            add_header Content-Type "application/json; charset=utf-8";
        }
    }
    
    # Handle public static files
    location /static/ {
        alias /var/www/shithaa-ecom/frontend/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Handle uploaded images
    location /images/ {
        alias /var/www/shithaa-ecom/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Handle API requests - proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Handle all other requests - proxy to Next.js frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

echo "✅ Nginx configuration updated"

# Step 4: Enable the site
echo ""
echo "4. Enabling Nginx site..."
sudo ln -sf "$NGINX_SITES_DIR/shithaa" "$NGINX_ENABLED_DIR/shithaa"
echo "✅ Site enabled"

# Step 5: Test Nginx configuration
echo ""
echo "5. Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Step 6: Restart services
echo ""
echo "6. Restarting services..."
sudo systemctl restart nginx
echo "✅ Nginx restarted"

# Restart PM2 processes
pm2 restart all
echo "✅ PM2 processes restarted"

# Step 7: Test the fix
echo ""
echo "7. Testing the fix..."
sleep 3

# Test static file serving
echo "Testing static file serving..."
RESPONSE=$(curl -s -I "https://shithaa.in/_next/static/chunks/main.js" 2>/dev/null | head -1)
if echo "$RESPONSE" | grep -q "200 OK"; then
    echo "✅ Static files are being served correctly"
else
    echo "⚠️  Static file test inconclusive. Check manually."
fi

echo ""
echo "🎉 Fix completed!"
echo "=================="
echo "Please test your website now:"
echo "1. Visit https://shithaa.in"
echo "2. Check browser console for any remaining errors"
echo "3. Test product pages"
echo ""
echo "If issues persist, check:"
echo "- Nginx error logs: sudo tail -f /var/log/nginx/error.log"
echo "- PM2 logs: pm2 logs"
