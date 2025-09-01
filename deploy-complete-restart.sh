#!/bin/bash

echo "🔄 FORCING COMPLETE RESTART..."
echo "================================"

# Stop all PM2 processes
echo "🛑 Stopping all PM2 processes..."
pm2 stop all

# Delete PM2 processes
echo "🗑️ Deleting PM2 processes..."
pm2 delete all

# Clear PM2 logs
echo "🧹 Clearing PM2 logs..."
pm2 flush

# Clear Node.js module cache (if possible)
echo "🧹 Clearing module cache..."
cd /var/www/shithaa-ecom
rm -rf node_modules/.cache 2>/dev/null || true

# Start services again
echo "🚀 Starting services..."
pm2 start ecosystem.config.js

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Show recent logs
echo "📝 Recent backend logs:"
pm2 logs shithaa-backend --lines 15

echo "✅ Complete restart completed!"
echo ""
echo "🔧 ACTIONS TAKEN:"
echo "- Stopped all PM2 processes"
echo "- Deleted PM2 processes"
echo "- Cleared PM2 logs"
echo "- Cleared module cache"
echo "- Restarted all services"
echo ""
echo "🎯 EXPECTED RESULTS:"
echo "- Fresh module loading"
echo "- No cached import errors"
echo "- All services running properly"
