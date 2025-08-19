#!/bin/bash

echo "🧹 Test Data Cleanup Script for shithaa.in"
echo "=========================================="
echo ""

echo "⚠️  WARNING: This will permanently delete all test orders and users!"
echo "   Make sure you have a backup if needed."
echo ""

read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo ""
echo "🚀 Starting cleanup..."

# Navigate to backend directory
cd backend

# Run the SAFE cleanup script (only deletes orders, keeps users)
echo "📦 Running SAFE cleanup (orders only)..."
node scripts/safe-orders-cleanup.js

echo ""
echo "✅ Cleanup completed!"
echo "   Your database is now clean and ready for production."
echo ""
echo "🎉 You can now launch your site with a clean database!"
