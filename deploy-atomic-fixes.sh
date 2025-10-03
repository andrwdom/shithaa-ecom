#!/bin/bash

echo "🚨 DEPLOYING ATOMIC STOCK FIXES"
echo "==============================="
echo ""

# Check if we're in the right directory
if [ ! -f "backend/utils/atomicStockOperations.js" ]; then
    echo "❌ Error: atomicStockOperations.js not found"
    echo "   Please run this script from the project root directory"
    exit 1
fi

echo "✅ Atomic stock operations file found"

# Check if backend is running
if ! pgrep -f "shithaa-backend" > /dev/null; then
    echo "⚠️  Warning: Backend not running. Starting backend..."
    pm2 start ecosystem.config.js --only shithaa-backend
    sleep 5
fi

echo "🔄 Restarting backend to apply atomic fixes..."
pm2 restart shithaa-backend

echo "⏳ Waiting for backend to start..."
sleep 10

# Check if backend is healthy
echo "🔍 Checking backend health..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed (HTTP $HEALTH_CHECK)"
    echo "   Check logs: pm2 logs shithaa-backend"
    exit 1
fi

# Test atomic operations
echo ""
echo "🧪 Testing atomic stock operations..."
if [ -f "test-atomic-stock.js" ]; then
    node test-atomic-stock.js
    if [ $? -eq 0 ]; then
        echo "✅ Atomic operations test passed"
    else
        echo "❌ Atomic operations test failed"
        echo "   Check the test output above for details"
    fi
else
    echo "⚠️  Test script not found, skipping atomic operations test"
fi

# Run K6 race condition test if available
echo ""
echo "🏃 Running race condition test..."
if command -v k6 &> /dev/null && [ -f "k6-race-stock.js" ]; then
    echo "   Running K6 race condition test (this may take a few minutes)..."
    k6 run k6-race-stock.js
    if [ $? -eq 0 ]; then
        echo "✅ Race condition test passed"
    else
        echo "❌ Race condition test failed"
        echo "   Check the test output above for details"
    fi
else
    echo "⚠️  K6 not available or test script not found, skipping race condition test"
    echo "   To install K6: https://k6.io/docs/getting-started/installation/"
fi

echo ""
echo "📊 Checking logs for atomic operations..."
echo "   Run: pm2 logs shithaa-backend --lines 50 | grep 'STOCK:'"
echo "   Should see atomic operation logs like: STOCK:RESERVE:ATOMIC:SUCCESS"

echo ""
echo "🎯 DEPLOYMENT SUMMARY"
echo "===================="
echo "✅ Atomic stock operations deployed"
echo "✅ Backend restarted with new code"
echo "✅ Health check passed"
echo ""
echo "Next steps:"
echo "1. Monitor logs: pm2 logs shithaa-backend --lines 200 | grep 'STOCK:'"
echo "2. Test with real traffic to verify no race conditions"
echo "3. Check that only one success per SKU in concurrent scenarios"
echo ""
echo "🚨 CRITICAL: Emergency deduction is still DISABLED"
echo "   To re-enable: export ENABLE_EMERGENCY_DEDUCTION=true && pm2 restart shithaa-backend"
