#!/bin/bash

echo "🚀 Quick Fix for Shithaa Deployment Issues"
echo "=========================================="

# Fix 1: Build Frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Fix 2: Create log directories
echo "📁 Creating log directories..."
mkdir -p frontend/logs backend/logs admin/logs

# Fix 3: Show PM2 commands
echo "⚙️  PM2 Commands to run:"
echo "pm2 stop all"
echo "pm2 delete all" 
echo "pm2 start ecosystem.config.js"
echo "pm2 status"
echo "pm2 logs"

echo "✅ Quick fix script ready!"
