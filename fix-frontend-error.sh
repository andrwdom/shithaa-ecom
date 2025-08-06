#!/bin/bash

echo "🔧 FIXING FRONTEND ERROR: n.default is not a constructor"
echo "======================================================="

# Navigate to frontend directory
cd /var/www/shithaa-ecom/frontend

echo "🗑️ Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building frontend..."
npm run build

echo "🔄 Restarting frontend..."
pm2 restart shithaa-frontend

echo "⏳ Waiting 5 seconds..."
sleep 5

echo "🔍 Checking frontend status..."
pm2 status

echo "✅ Frontend error fix completed!"
echo "🌐 Test the website: https://shithaa.in"