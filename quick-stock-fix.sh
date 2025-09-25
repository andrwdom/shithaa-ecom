#!/bin/bash

# Quick Stock Health Fix
echo "🚨 QUICK STOCK HEALTH FIX"
echo "========================="

# 1. Stop the problematic worker
echo "🔧 Stopping problematic worker..."
pm2 stop shithaa-reservation-expiry-worker 2>/dev/null || true

# 2. Restart backend with CORS fix
echo "🔧 Restarting backend with CORS fix..."
pm2 restart shithaa-backend

# 3. Run emergency cleanup
echo "🔧 Running emergency cleanup..."
cd backend
node scripts/force-cleanup.js
cd ..

# 4. Start workers properly
echo "🔧 Starting workers with proper config..."
pm2 start ecosystem.config.js --only shithaa-reservation-expiry-worker
pm2 restart shithaa-stock-cleanup-worker
pm2 restart shithaa-stock-monitoring-worker

echo "✅ Quick fix completed!"
echo "Monitor with: pm2 logs --lines 10"
