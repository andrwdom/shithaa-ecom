#!/bin/bash

echo "🚨 QUICK SERVER FIX - Resolving Duplicate CustomId Error"
echo "======================================================="

# Navigate to backend directory
cd /var/www/shithaa-ecom/backend

echo "📦 Installing dependencies..."
npm install

echo "🔧 Running duplicate customId cleanup..."
node scripts/fix-duplicate-custom-ids.js

echo "🔄 Restarting backend server..."
pm2 restart shitha-backend

echo "⏳ Waiting 5 seconds for server to start..."
sleep 5

echo "🔍 Checking server status..."
pm2 status

echo "🧪 Testing backend API..."
curl -s http://localhost:4000/api/cors-test

echo "✅ Fix completed!"
echo "🌐 Test the website: https://shithaa.in"
echo "💡 Admin can now add products without duplicate customId errors" 