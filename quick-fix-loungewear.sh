#!/bin/bash

echo "🔧 Quick loungewear offer fix..."

# Set MongoDB URI if not already set
export MONGODB_URI=${MONGODB_URI:-"mongodb://127.0.0.1:27017/shitha"}

echo "🔧 Using MongoDB URI: $MONGODB_URI"

# Try to run the production fix script
echo "🔧 Running loungewear offer fix..."
node fix-loungewear-offer-production.js

if [ $? -eq 0 ]; then
    echo "✅ Database fix completed successfully"
    
    # Restart backend if it's running
    echo "🔧 Checking if backend needs restart..."
    if pgrep -f "node.*server.js" > /dev/null; then
        echo "🔧 Backend is running, restarting..."
        pkill -f "node.*server.js"
        sleep 2
        cd backend
        nohup node server.js > ../logs/backend.log 2>&1 &
        echo "✅ Backend restarted"
        cd ..
    else
        echo "ℹ️ Backend not running, skipping restart"
    fi
    
    echo ""
    echo "🎉 Loungewear offer fix completed!"
    echo "📋 Next steps:"
    echo "   1. Test by adding 3+ loungewear items to cart"
    echo "   2. Verify ₹51 discount appears in checkout"
    echo "   3. Check backend logs: tail -f logs/backend.log"
    
else
    echo "❌ Fix failed. Please check the error messages above."
    exit 1
fi
