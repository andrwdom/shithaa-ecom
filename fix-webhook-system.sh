#!/bin/bash

echo "🔧 FIXING WEBHOOK SYSTEM - ENTERPRISE GRADE"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    print_error "ecosystem.config.js not found. Please run this script from the project root."
    exit 1
fi

print_status "Starting webhook system fix..."

# Step 1: Stop all PM2 processes
echo ""
echo "🛑 Step 1: Stopping PM2 processes..."
pm2 stop all
if [ $? -eq 0 ]; then
    print_status "PM2 processes stopped"
else
    print_warning "Some PM2 processes may not have stopped properly"
fi

# Step 2: Delete the problematic webhook processor
echo ""
echo "🗑️  Step 2: Removing problematic webhook processor..."
pm2 delete shithaa-webhook-processor 2>/dev/null || true
print_status "Old webhook processor removed"

# Step 3: Check if the fixed webhook processor exists
echo ""
echo "🔍 Step 3: Checking webhook processor files..."
if [ -f "backend/jobs/processRawWebhooks.js" ]; then
    print_status "Fixed webhook processor found"
else
    print_error "Fixed webhook processor not found!"
    exit 1
fi

# Step 4: Test the webhook processor
echo ""
echo "🧪 Step 4: Testing webhook processor..."
cd /var/www/shithaa-ecom
node backend/scripts/testWebhookProcessor.js
if [ $? -eq 0 ]; then
    print_status "Webhook processor test passed"
else
    print_error "Webhook processor test failed!"
    exit 1
fi

# Step 5: Reload PM2 configuration
echo ""
echo "🔄 Step 5: Reloading PM2 configuration..."
pm2 reload ecosystem.config.js
if [ $? -eq 0 ]; then
    print_status "PM2 configuration reloaded"
else
    print_error "Failed to reload PM2 configuration!"
    exit 1
fi

# Step 6: Start all processes
echo ""
echo "🚀 Step 6: Starting all processes..."
pm2 start ecosystem.config.js
if [ $? -eq 0 ]; then
    print_status "All processes started"
else
    print_error "Failed to start some processes!"
    exit 1
fi

# Step 7: Check PM2 status
echo ""
echo "📊 Step 7: Checking PM2 status..."
pm2 status

# Step 8: Monitor webhook processor for 30 seconds
echo ""
echo "👀 Step 8: Monitoring webhook processor (30 seconds)..."
timeout 30s pm2 logs shithaa-webhook-processor --lines 0 --raw || true

# Step 9: Final status check
echo ""
echo "🏁 Step 9: Final status check..."
pm2 status | grep shithaa-webhook-processor

echo ""
echo "🎉 WEBHOOK SYSTEM FIX COMPLETED!"
echo "================================"
echo ""
echo "✅ Fixed webhook processor"
echo "✅ Updated PM2 configuration"
echo "✅ Tested webhook processing"
echo "✅ Started all processes"
echo ""
echo "🔍 Monitor the system with:"
echo "   pm2 logs shithaa-webhook-processor"
echo "   pm2 status"
echo ""
echo "🧪 Test webhook processing with:"
echo "   node backend/scripts/testWebhookProcessor.js"
echo ""
print_status "Your webhook system is now ENTERPRISE-READY! 🚀"
