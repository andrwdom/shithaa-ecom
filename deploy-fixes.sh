#!/bin/bash

# Bash Deployment Script for Shithaa E-commerce
# This script fixes the log issues and redeploys the application

echo "🚀 Starting Shithaa E-commerce deployment fixes..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if PM2 is installed
if ! command_exists pm2; then
    echo "❌ PM2 is not installed. Installing PM2..."
    npm install -g pm2
else
    echo "✅ PM2 is already installed"
fi

# Stop all PM2 processes
echo "🛑 Stopping all PM2 processes..."
pm2 stop all
pm2 delete all

# Clean up logs
echo "🧹 Cleaning up old logs..."
if [ -d "logs" ]; then
    rm -rf logs/*
    echo "✅ Logs cleaned"
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    mkdir -p logs
    echo "✅ Logs directory created"
fi

# Fix frontend build
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build

# Check if build was successful
if [ -f ".next/BUILD_ID" ]; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed!"
    exit 1
fi

# Go back to root
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

# Install admin dependencies
echo "📦 Installing admin dependencies..."
cd admin
npm install
cd ..

# Start PM2 processes
echo "🚀 Starting PM2 processes..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Show status
echo "📊 PM2 Status:"
pm2 status

echo "✅ Deployment fixes completed!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:4000"
echo "👨‍💼 Admin: http://localhost:4173"

# Monitor logs for any errors
echo "📝 Monitoring logs for errors..."
echo "Press Ctrl+C to stop monitoring"
pm2 logs --lines 50 