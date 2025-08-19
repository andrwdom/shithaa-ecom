#!/bin/bash

echo "🧹 Quick Orders Cleanup - Keeping Users & Functionality"
echo "========================================================"
echo ""

echo "⚠️  This will delete ALL orders but keep:"
echo "   ✅ User accounts (Google accounts)"
echo "   ✅ Cart functionality"
echo "   ✅ Wishlist functionality"
echo "   ✅ All other features"
echo ""

read -p "Proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo ""
echo "🚀 Starting safe cleanup..."

cd backend
node scripts/safe-orders-cleanup.js

echo ""
echo "✅ Orders cleaned! Users can still login and order normally."
