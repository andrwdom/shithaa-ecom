#!/bin/bash

# Quick fix script to update nginx for PM2 admin panel
echo "🔧 Fixing nginx configuration for PM2 admin panel..."

# Backup current nginx config
echo "📋 Backing up current nginx config..."
cp /etc/nginx/sites-available/shithaa.conf /etc/nginx/sites-available/shithaa.conf.backup.$(date +%Y%m%d_%H%M%S)

# Update the admin section in the main nginx config
echo "📝 Updating nginx configuration..."

# Create a temporary file with the updated admin section
cat > /tmp/admin-section.txt << 'EOF'
# Admin subdomain configuration for PM2
server {
    listen 80;
    server_name admin.shithaa.in;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.shithaa.in;
    
    # SSL Configuration (adjust paths as needed)
    ssl_certificate /etc/letsencrypt/live/shithaa.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shithaa.in/privkey.pem;
    
    # SSL Security Settings (same as main site)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Proxy all requests to PM2 admin panel process
    location / {
        proxy_pass http://127.0.0.1:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        
        # Handle WebSocket connections for Vite HMR
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Handle API requests for admin
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
        proxy_read_timeout 86400;
    }
    
    # Error pages
    error_page 500 502 503 504 /50x.html;
}
EOF

# Replace the admin section in the main config
echo "🔄 Replacing admin section in nginx config..."
sed -i '/# Admin subdomain configuration/,/^}/d' /etc/nginx/sites-available/shithaa.conf
cat /tmp/admin-section.txt >> /etc/nginx/sites-available/shithaa.conf

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid!"
    
    # Restart nginx
    echo "🔄 Restarting nginx..."
    systemctl restart nginx
    
    if [ $? -eq 0 ]; then
        echo "✅ Nginx restarted successfully!"
        echo "🌐 Admin panel should now work at https://admin.shithaa.in"
        echo "📊 Check PM2 status: pm2 status"
        echo "📝 Check PM2 logs: pm2 logs admin-panel"
    else
        echo "❌ Failed to restart nginx!"
        echo "🔍 Check nginx status: systemctl status nginx"
    fi
else
    echo "❌ Nginx configuration is invalid!"
    echo "🔍 Please check the configuration manually"
    echo "📋 Backup saved at: /etc/nginx/sites-available/shithaa.conf.backup.*"
fi

# Clean up
rm -f /tmp/admin-section.txt
