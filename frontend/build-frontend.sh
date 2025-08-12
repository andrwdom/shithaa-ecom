#!/bin/bash

echo "🚀 Starting frontend build process..."

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf .next
rm -rf out

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building Next.js application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Build files created in .next directory"
    
    # Verify build files exist
    if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
        echo "✅ Production build verified!"
        echo "🚀 Ready to start production server"
    else
        echo "❌ Build verification failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi 