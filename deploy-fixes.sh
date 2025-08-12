#!/bin/bash

echo "🚀 Deploying fixes for Shithaa E-commerce..."

# Set the base directory
BASE_DIR="/var/www/shithaa-ecom"
cd $BASE_DIR

echo "📁 Working directory: $(pwd)"

# 1. Fix Backend Issues
echo "🔧 Fixing backend issues..."

# Check if cartController has the removeFromCart function
if grep -q "removeFromCart" "$BASE_DIR/backend/controllers/cartController.js"; then
    echo "✅ removeFromCart function found in cartController"
else
    echo "❌ removeFromCart function missing - please check the controller file"
fi

# Check if cartRoute imports removeFromCart
if grep -q "removeFromCart" "$BASE_DIR/backend/routes/cartRoute.js"; then
    echo "✅ removeFromCart import found in cartRoute"
else
    echo "❌ removeFromCart import missing - please check the route file"
fi

# 2. Build Frontend
echo "🏗️  Building frontend..."

cd "$BASE_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next

# Build the application
echo "🔨 Building Next.js application..."
npm run build

# Check build status
if [ $? -eq 0 ]; then
    echo "✅ Frontend build completed successfully!"
    
    # Check if .next directory exists and has content
    if [ -d ".next" ] && [ "$(ls -A .next)" ]; then
        echo "✅ .next directory created with build files"
    else
        echo "❌ .next directory is empty or missing"
        exit 1
    fi
else
    echo "❌ Frontend build failed!"
    exit 1
fi

# 3. Restart Services
echo "🔄 Restarting services..."

cd "$BASE_DIR"

# Restart backend services
echo "🔄 Restarting backend services..."
pm2 restart shitha-b

# Restart frontend services
echo "🔄 Restarting frontend services..."
pm2 restart shithaa-

echo "✅ Deployment completed!"
echo "📊 Check service status with: pm2 status"
echo "📋 Check logs with: pm2 logs" 