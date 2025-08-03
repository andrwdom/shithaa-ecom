#!/bin/bash

# Quick Server Fix Script
echo "🚀 Starting quick server fix..."

# Navigate to backend directory
cd /var/www/shithaa-ecom/backend

# Install sharp package
echo "📦 Installing sharp package..."
npm install sharp@^0.33.2

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Sharp package installed successfully"
else
    echo "❌ Failed to install sharp package"
    exit 1
fi

# Restart PM2 processes
echo "🔄 Restarting PM2 processes..."
pm2 stop all
pm2 delete all
pm2 start ecosystem.config.js

# Check PM2 status
echo "📊 Checking PM2 status..."
pm2 status

# Test backend locally
echo "🧪 Testing backend..."
sleep 3
curl -s http://localhost:4000/api/cors-test

echo "✅ Quick fix completed!"
echo "📝 Next steps:"
echo "1. Check if backend is responding: curl http://localhost:4000/api/cors-test"
echo "2. Test external access: curl https://shithaa.in/api/cors-test"
echo "3. Check admin panel: https://admin.shithaa.in" 