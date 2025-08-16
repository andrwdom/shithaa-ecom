#!/bin/bash

# Frontend startup script for PM2
cd /var/www/shithaa-ecom/frontend

# Check if .next directory exists and has build files
if [ ! -d ".next" ] || [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ Build files not found. Building the application..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Exiting..."
        exit 1
    fi
    echo "✅ Build completed successfully"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Dependency installation failed. Exiting..."
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
fi

# Start the application
echo "🚀 Starting Shithaa Frontend..."
npm start
