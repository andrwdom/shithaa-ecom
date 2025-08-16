#!/bin/bash

# Frontend deployment script for Shithaa Maternity
echo "🚀 Starting frontend deployment..."

# Navigate to the project directory
cd /var/www/shithaa-ecom

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ Error: ecosystem.config.js not found. Please run this script from the project root."
    exit 1
fi

# Stop the existing frontend process
echo "🛑 Stopping existing frontend process..."
pm2 stop shithaa-frontend 2>/dev/null || echo "No existing frontend process to stop"

# Delete the existing process
echo "🗑️  Deleting existing frontend process..."
pm2 delete shithaa-frontend 2>/dev/null || echo "No existing frontend process to delete"

# Navigate to frontend directory
cd frontend

# Check if build files exist
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
    echo "📦 Building frontend application..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Exiting..."
        exit 1
    fi
    echo "✅ Build completed successfully"
else
    echo "✅ Build files already exist"
fi

# Make start script executable
chmod +x start.sh

# Go back to project root
cd ..

# Start the frontend using PM2 ecosystem
echo "🚀 Starting frontend with PM2..."
pm2 start ecosystem.config.js --only shithaa-frontend

# Check if the process started successfully
if pm2 list | grep -q "shithaa-frontend.*online"; then
    echo "✅ Frontend started successfully!"
    echo "📊 PM2 Status:"
    pm2 list | grep shithaa-frontend
else
    echo "❌ Frontend failed to start. Checking logs..."
    pm2 logs shithaa-frontend --lines 20
    exit 1
fi

echo "🎉 Frontend deployment completed!"
