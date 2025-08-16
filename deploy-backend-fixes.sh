#!/bin/bash

echo "🚀 Deploying Backend Fixes to VPS..."

# SSH into VPS and deploy fixes
ssh root@145.223.19.218 << 'EOF'

echo "📁 Navigating to project directory..."
cd /var/www/shithaa-ecom

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
cd backend
npm install

echo "🔄 Restarting backend service..."
pm2 restart shithaa-backend

echo "⏳ Waiting for service to start..."
sleep 5

echo "🔍 Checking service status..."
pm2 status

echo "🌐 Checking if backend is listening on all interfaces..."
netstat -tlnp | grep :4000

echo "✅ Backend fixes deployed successfully!"

EOF

echo "🎉 Deployment complete! Check the output above for any errors."
