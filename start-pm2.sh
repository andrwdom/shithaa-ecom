#!/bin/bash

# Quick PM2 Startup Script for Shithaa E-commerce
echo "🚀 Starting Shithaa E-commerce Services..."

# Create logs directory
mkdir -p logs
chmod 755 logs

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start all services
echo "▶️ Starting services with PM2..."
pm2 start ecosystem.config.js

# Show status
echo "📊 Service Status:"
pm2 status

echo "✅ All services started successfully!"
echo "🔍 Use 'pm2 logs' to view logs"
echo "📱 Use 'pm2 monit' to monitor services" 