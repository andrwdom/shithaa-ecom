#!/bin/bash

# Deploy reservation system fix
# This script fixes the stock reservation issue by adding automatic cleanup

echo "🔧 Deploying reservation system fix..."

# Stop existing PM2 processes
echo "⏹️  Stopping existing PM2 processes..."
pm2 stop all

# Install/update PM2 if needed
echo "📦 Ensuring PM2 is up to date..."
npm install -g pm2

# Start PM2 with new configuration (includes reservation worker)
echo "🚀 Starting PM2 with new configuration..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
echo "🔄 Setting up PM2 startup script..."
pm2 startup

echo "✅ Reservation system fix deployed successfully!"
echo ""
echo "📋 What was fixed:"
echo "   - Added automatic reservation expiry worker (runs every 5 minutes)"
echo "   - Added automatic checkout session cleanup"
echo "   - Stock reservations will now be released when sessions expire"
echo ""
echo "🔍 Monitor the logs:"
echo "   pm2 logs shithaa-reservation-worker"
echo ""
echo "📊 Check PM2 status:"
echo "   pm2 status"