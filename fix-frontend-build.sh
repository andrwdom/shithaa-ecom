#!/bin/bash

# Fix Frontend Build Issues
echo "🔧 Fixing Frontend Build Issues..."

# Navigate to frontend directory
cd /var/www/shithaa-ecom/frontend

# Stop PM2 frontend process
echo "⏹️ Stopping frontend process..."
pm2 stop shithaa-frontend

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🏗️ Building Next.js application..."
npm run build

# Check if build was successful
if [ -f ".next/server/middleware-manifest.json" ]; then
    echo "✅ Build successful! middleware-manifest.json created."
else
    echo "❌ Build failed! middleware-manifest.json not found."
    exit 1
fi

# Start PM2 frontend process
echo "▶️ Starting frontend process..."
pm2 start shithaa-frontend

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

echo "🎯 Frontend build fix completed!"
