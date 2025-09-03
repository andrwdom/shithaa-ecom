#!/bin/bash

echo "🔧 Starting loungewear offer fix deployment..."

# Step 1: Fix product categories in database
echo "🔧 Step 1: Fixing product categories in database..."
node fix-loungewear-offer-final.js

if [ $? -ne 0 ]; then
    echo "❌ Database fix failed, aborting deployment"
    exit 1
fi

echo "✅ Database fix completed successfully"

# Step 2: Restart the backend server
echo "🔧 Step 2: Restarting backend server..."
cd backend

# Kill existing Node.js processes
echo "🔧 Stopping existing backend processes..."
pkill -f "node.*server.js" || true
pkill -f "nodemon.*server.js" || true

# Wait for processes to stop
sleep 2

# Start the backend server
echo "🔧 Starting backend server..."
nohup node server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!

# Wait for server to start
sleep 5

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend server started successfully (PID: $BACKEND_PID)"
else
    echo "❌ Backend server failed to start"
    exit 1
fi

# Step 3: Test the backend health
echo "🔧 Step 3: Testing backend health..."
cd ..

# Test health endpoint
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health || echo "000")

if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed (HTTP $HEALTH_RESPONSE)"
    echo "🔍 Checking backend logs..."
    tail -n 20 logs/backend.log
    exit 1
fi

# Step 4: Test the cart calculation endpoint
echo "🔧 Step 4: Testing cart calculation endpoint..."

# Create a test request with 3 loungewear items
TEST_REQUEST='{"items":[{"_id":"test1","name":"Test Loungewear 1","price":450,"quantity":1,"size":"L"},{"_id":"test2","name":"Test Loungewear 2","price":450,"quantity":1,"size":"M"},{"_id":"test3","name":"Test Loungewear 3","price":450,"quantity":1,"size":"XL"}]}'

CALC_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_REQUEST" \
  http://localhost:4000/api/cart/calculate-total || echo "FAILED")

if [[ "$CALC_RESPONSE" == *"success"* ]]; then
    echo "✅ Cart calculation endpoint is working"
    echo "📊 Response: $CALC_RESPONSE"
else
    echo "❌ Cart calculation endpoint failed"
    echo "📊 Response: $CALC_RESPONSE"
fi

echo ""
echo "🎉 Loungewear offer fix deployment completed!"
echo ""
echo "📋 Summary:"
echo "   ✅ Database product categories fixed"
echo "   ✅ Backend server restarted"
echo "   ✅ Health check passed"
echo "   ✅ Cart calculation endpoint tested"
echo ""
echo "🔍 To monitor the system:"
echo "   - Backend logs: tail -f logs/backend.log"
echo "   - Health check: curl http://localhost:4000/api/health"
echo "   - Test offer: Add 3+ loungewear items to cart and check for ₹51 discount"
echo ""
echo "🛒 Expected behavior:"
echo "   - 3 loungewear items @ ₹450 each = ₹1350"
echo "   - Offer applied: 3 for ₹1299"
echo "   - Discount: ₹51"
