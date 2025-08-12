#!/bin/bash

echo "Building Next.js frontend..."

# Navigate to frontend directory
cd /var/www/shithaa-ecom/frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Clean previous build
echo "Cleaning previous build..."
rm -rf .next

# Build the application
echo "Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Frontend build completed successfully!"
    echo "Build directory: .next"
else
    echo "❌ Frontend build failed!"
    exit 1
fi 