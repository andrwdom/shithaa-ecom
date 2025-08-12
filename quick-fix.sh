#!/bin/bash

# Quick Fix Script for Shithaa E-commerce
# This script fixes the immediate log issues

echo "🔧 Quick fix for Shithaa E-commerce..."

# 1. Fix the backend import issue
echo "🔧 Fixing backend import issue..."
cd backend

# Check if the import is already fixed
if grep -q "import { adminAuth }" "routes/shippingRulesRoute.js"; then
    echo "✅ Import issue found, fixing..."
    sed -i 's/import { adminAuth } from '\''\.\.\/middleware\/adminAuth\.js'\'';/import adminAuth from '\''\.\.\/middleware\/adminAuth\.js'\'';/' "routes/shippingRulesRoute.js"
    echo "✅ Import fixed"
else
    echo "✅ Import already correct"
fi

cd ..

# 2. Build frontend if .next is missing
echo "🔨 Checking frontend build..."
cd frontend

if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
    echo "⚠️  Frontend build missing, building now..."
    npm install
    npm run build
    
    if [ -f ".next/BUILD_ID" ]; then
        echo "✅ Frontend build successful"
    else
        echo "❌ Frontend build failed!"
        exit 1
    fi
else
    echo "✅ Frontend build exists"
fi

cd ..

# 3. Restart PM2 processes
echo "🔄 Restarting PM2 processes..."
pm2 restart all

echo "✅ Quick fix completed!"
echo "📊 Check status: pm2 status"
echo "📝 Check logs: pm2 logs" 