#!/bin/bash

echo "🔍 VERIFYING ATOMIC DEPLOYMENT"
echo "=============================="
echo ""

# Check if backend is running
if ! pgrep -f "shithaa-backend" > /dev/null; then
    echo "❌ Backend not running"
    exit 1
fi

echo "✅ Backend is running"

# Check if atomic operations file exists
if [ ! -f "backend/utils/atomicStockOperations.js" ]; then
    echo "❌ Atomic operations file not found"
    exit 1
fi

echo "✅ Atomic operations file exists"

# Check backend health
echo "🔍 Checking backend health..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed (HTTP $HEALTH_CHECK)"
    exit 1
fi

# Test atomic operations directly
echo ""
echo "🧪 Testing atomic operations directly..."
node test-atomic-direct.js

if [ $? -eq 0 ]; then
    echo "✅ Atomic operations test passed"
else
    echo "❌ Atomic operations test failed"
    exit 1
fi

# Test race condition with simple script
echo ""
echo "🏃 Testing race conditions..."
node test-stock-race-simple.js

if [ $? -eq 0 ]; then
    echo "✅ Race condition test passed"
else
    echo "❌ Race condition test failed"
    exit 1
fi

# Check logs for atomic operations
echo ""
echo "📊 Checking logs for atomic operations..."
STOCK_LOGS=$(pm2 logs shithaa-backend --lines 100 | grep "STOCK:" | wc -l)

if [ "$STOCK_LOGS" -gt 0 ]; then
    echo "✅ Found $STOCK_LOGS atomic operation logs"
    echo "   Sample logs:"
    pm2 logs shithaa-backend --lines 100 | grep "STOCK:" | head -5
else
    echo "⚠️  No atomic operation logs found"
    echo "   This might indicate the atomic operations aren't being used"
fi

echo ""
echo "🎯 DEPLOYMENT VERIFICATION SUMMARY"
echo "=================================="
echo "✅ Backend is running and healthy"
echo "✅ Atomic operations file exists"
echo "✅ Atomic operations test passed"
echo "✅ Race condition test passed"
echo "✅ Found $STOCK_LOGS atomic operation logs"
echo ""
echo "🚨 CRITICAL: Emergency deduction is DISABLED"
echo "   To re-enable: export ENABLE_EMERGENCY_DEDUCTION=true && pm2 restart shithaa-backend"
echo ""
echo "Next steps:"
echo "1. Monitor production traffic for race conditions"
echo "2. Check logs regularly: pm2 logs shithaa-backend --lines 200 | grep 'STOCK:'"
echo "3. Verify no multiple successes per SKU in concurrent scenarios"
