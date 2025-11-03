#!/bin/bash

# 🔧 Fix PM2 Environment Variables After Delete All
# The issue: PM2 doesn't support env_file option. Server.js loads .env directly via dotenv.

echo "🔧 Fixing PM2 environment variable loading..."

# Navigate to project root
cd /var/www/shithaa-ecom || exit 1

# Verify .env file exists and has JWT_SECRET
echo "📋 Checking .env file..."
if [ -f "backend/.env" ]; then
    if grep -q "JWT_SECRET=" backend/.env; then
        echo "✅ JWT_SECRET found in backend/.env"
        # Show value (redacted)
        grep "JWT_SECRET=" backend/.env | sed 's/=.*/=[REDACTED]/'
    else
        echo "❌ JWT_SECRET not found in backend/.env"
        exit 1
    fi
else
    echo "❌ backend/.env file not found!"
    exit 1
fi

echo ""
echo "🔄 Deleting all PM2 processes..."
pm2 delete all 2>/dev/null || true

# Clear PM2 saved state to ensure fresh start
echo "🔄 Clearing PM2 saved state..."
pm2 kill 2>/dev/null || true
pm2 resurrect 2>/dev/null || true

echo ""
echo "🔄 Starting PM2 with ecosystem config (fresh start)..."
# CRITICAL: Use 'start' not 'restart' - restart uses saved config, start uses ecosystem.config.js
pm2 start ecosystem.config.js

echo ""
echo "⏳ Waiting 5 seconds for processes to initialize..."
sleep 5

echo ""
echo "📋 PM2 Status:"
pm2 list

echo ""
echo "📋 Checking backend logs..."
echo "Looking for .env loading messages..."

# Check if server.js is finding and loading .env
if pm2 logs shithaa-backend --lines 50 --nostream 2>&1 | grep -q "Loading .env from"; then
    ENV_PATH=$(pm2 logs shithaa-backend --lines 50 --nostream 2>&1 | grep "Loading .env from" | tail -1 | sed 's/.*Loading .env from: //')
    EXISTS=$(pm2 logs shithaa-backend --lines 50 --nostream 2>&1 | grep "\.env file exists" | tail -1)
    echo "✅ Found .env loading message: $ENV_PATH"
    echo "   $EXISTS"
else
    echo "⚠️  Didn't see .env loading message in logs"
fi

echo ""
echo "Checking for JWT_SECRET errors..."
if pm2 logs shithaa-backend --lines 50 --nostream 2>&1 | grep -q "JWT_SECRET.*not defined"; then
    echo "❌ ERROR: Still seeing JWT_SECRET errors!"
    echo ""
    echo "📋 Recent backend error logs:"
    pm2 logs shithaa-backend --err --lines 15 --nostream
    echo ""
    echo "💡 The server.js should load .env automatically. Check the path resolution."
    echo "💡 Try running: node backend/server.js manually to test"
else
    echo "✅ No JWT_SECRET errors found!"
fi

echo ""
echo "📋 Recent backend output (last 10 lines):"
pm2 logs shithaa-backend --out --lines 10 --nostream

echo ""
echo "✅ Done! Monitor with: pm2 logs shithaa-backend"
echo ""
echo "💡 TIP: If still having issues, try:"
echo "   cd /var/www/shithaa-ecom/backend && node server.js"
echo "   This will test if .env loads correctly outside of PM2"
