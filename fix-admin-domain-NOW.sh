#!/bin/bash

echo "🚨 FIXING ADMIN PANEL DOMAIN - URGENT"
echo "======================================="
echo ""

# Backup existing config
echo "1. Backing up current nginx config..."
if [ -f "/etc/nginx/sites-available/admin.shithaa.in" ]; then
    cp /etc/nginx/sites-available/admin.shithaa.in /etc/nginx/sites-available/admin.shithaa.in.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup created"
fi

# Create correct nginx config for admin.shithaa.in
echo ""
echo "2. Creating correct nginx configuration..."
cat > /etc/nginx/sites-available/admin.shithaa.in << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name admin.shithaa.in;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.shithaa.in;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/shithaa.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shithaa.in/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # CORRECT: Point to Shithaa admin, NOT JJ Textiles!
    root /var/www/shithaa-ecom/admin/dist;
    index index.html index.htm;

    # Logging
    access_log /var/log/nginx/admin.shithaa.in.access.log;
    error_log /var/log/nginx/admin.shithaa.in.error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 256;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API proxy to backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }

    # Image uploads
    location /images/ {
        alias /var/www/shithaa-ecom/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
}
EOF

echo "✅ Nginx config created"

# Enable the site
echo ""
echo "3. Enabling site..."
ln -sf /etc/nginx/sites-available/admin.shithaa.in /etc/nginx/sites-enabled/admin.shithaa.in
echo "✅ Symlink created"

# Test nginx config
echo ""
echo "4. Testing nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    echo "✅ Nginx config is valid"
    
    # Reload nginx
    echo ""
    echo "5. Reloading nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded"
    
    echo ""
    echo "======================================="
    echo "✅ FIX APPLIED!"
    echo "======================================="
    echo ""
    echo "🎯 What was changed:"
    echo "   - admin.shithaa.in now points to: /var/www/shithaa-ecom/admin/dist"
    echo "   - Previously was pointing to JJ Textiles admin (wrong!)"
    echo ""
    echo "📝 Test now:"
    echo "   1. Clear browser cache (Ctrl+Shift+Delete)"
    echo "   2. Go to: https://admin.shithaa.in/"
    echo "   3. Should show SHITHAA admin panel, not JJ Textiles"
    echo ""
    echo "🔄 If still showing wrong site:"
    echo "   - Wait 30 seconds for nginx reload"
    echo "   - Try incognito/private window"
    echo "   - Hard refresh: Ctrl+Shift+R"
else
    echo "❌ Nginx config has errors!"
    echo "Rolling back..."
    if [ -f "/etc/nginx/sites-available/admin.shithaa.in.backup."* ]; then
        LATEST_BACKUP=$(ls -t /etc/nginx/sites-available/admin.shithaa.in.backup.* | head -1)
        cp "$LATEST_BACKUP" /etc/nginx/sites-available/admin.shithaa.in
        echo "Backup restored"
    fi
    exit 1
fi

