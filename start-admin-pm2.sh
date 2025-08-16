#!/bin/bash

# Simple script to start admin panel with PM2
echo "🚀 Starting Admin Panel with PM2..."

# Navigate to admin directory
cd /var/www/shithaa-ecom/admin

# Check if admin panel is already running
if pm2 list | grep -q "admin-panel"; then
    echo "🔄 Admin panel already running, restarting..."
    pm2 restart admin-panel
else
    echo "🚀 Starting new admin panel process..."
    pm2 start npm --name "admin-panel" -- run dev
fi

# Save PM2 configuration
pm2 save

echo "✅ Admin panel started!"
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs admin-panel"
echo "🛑 Stop: pm2 stop admin-panel"
