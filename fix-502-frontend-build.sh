#!/bin/bash

echo "🔧 Fixing 502 Bad Gateway - Frontend Build Issue"
echo "=================================================="

# Navigate to frontend directory
cd /var/www/shithaa-ecom/frontend

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building frontend for production..."
npm run build

echo "🔄 Restarting PM2 processes..."
pm2 restart shithaa-frontend

echo "📊 Checking PM2 status..."
pm2 status

echo "🌐 Testing frontend..."
curl -I http://localhost:3000

echo "✅ Frontend build completed!"
echo "The site should now be accessible at https://shithaa.in"
