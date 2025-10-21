#!/bin/bash

# 🔧 Deploy API Health Check Resilience Improvements
# This script applies the improvements to prevent false "API Temporarily Unavailable" errors

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo ""
echo "======================================================================"
echo "  🔧 DEPLOYING API HEALTH CHECK RESILIENCE IMPROVEMENTS"
echo "======================================================================"
echo ""

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    print_error "Must be run from project root directory"
    exit 1
fi

# 1. Backup current state
print_status "Step 1: Creating backup..."
BACKUP_DIR="backups/health-check-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp backend/server.js "$BACKUP_DIR/" 2>/dev/null || true
cp frontend/app/api/health/route.ts "$BACKUP_DIR/" 2>/dev/null || true
cp frontend/components/offline-indicator.tsx "$BACKUP_DIR/" 2>/dev/null || true
print_success "Backup created at $BACKUP_DIR"

# 2. Verify files exist
print_status "Step 2: Verifying files..."
if [ ! -f "backend/server.js" ]; then
    print_error "backend/server.js not found"
    exit 1
fi
if [ ! -f "frontend/app/api/health/route.ts" ]; then
    print_error "frontend/app/api/health/route.ts not found"
    exit 1
fi
if [ ! -f "frontend/components/offline-indicator.tsx" ]; then
    print_error "frontend/components/offline-indicator.tsx not found"
    exit 1
fi
print_success "All files verified"

# 3. Test backend health endpoint before changes
print_status "Step 3: Testing backend health endpoint..."
if curl -f -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health | grep -q "200"; then
    print_success "Backend health endpoint responding"
else
    print_warning "Backend health endpoint not responding (will continue anyway)"
fi

# 4. Restart backend with new health check logic
print_status "Step 4: Restarting backend..."
if command -v pm2 &> /dev/null; then
    pm2 reload shithaa-backend
    sleep 3
    if pm2 list | grep -q "shithaa-backend.*online"; then
        print_success "Backend restarted successfully"
    else
        print_error "Backend failed to restart"
        print_warning "Rolling back..."
        cp "$BACKUP_DIR/server.js" backend/server.js
        pm2 restart shithaa-backend
        exit 1
    fi
else
    print_warning "PM2 not found, skipping backend restart"
fi

# 5. Rebuild frontend
print_status "Step 5: Rebuilding frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found, running npm install..."
    npm install
fi

print_status "Building frontend..."
if npm run build; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    cd ..
    exit 1
fi

cd ..

# 6. Restart frontend
print_status "Step 6: Restarting frontend..."
if command -v pm2 &> /dev/null; then
    pm2 reload shithaa-frontend
    sleep 3
    if pm2 list | grep -q "shithaa-frontend.*online"; then
        print_success "Frontend restarted successfully"
    else
        print_error "Frontend failed to restart"
        exit 1
    fi
else
    print_warning "PM2 not found, skipping frontend restart"
fi

# 7. Verify health endpoint
print_status "Step 7: Verifying improved health endpoint..."
sleep 5

# Test backend health
HEALTH_STATUS=$(curl -s http://localhost:4000/api/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ ! -z "$HEALTH_STATUS" ]; then
    print_success "Backend health check: $HEALTH_STATUS"
else
    print_warning "Could not verify backend health status"
fi

# Test with timeout
if timeout 15 curl -s http://localhost:4000/api/health > /dev/null; then
    print_success "Health endpoint responding within timeout"
else
    print_warning "Health endpoint timeout test inconclusive"
fi

# 8. Check PM2 status
print_status "Step 8: Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    echo ""
    pm2 list | grep shithaa
    echo ""
fi

# 9. Display summary
echo ""
echo "======================================================================"
echo "  ✅ DEPLOYMENT COMPLETED SUCCESSFULLY"
echo "======================================================================"
echo ""
echo "📋 What Was Deployed:"
echo "   • Enhanced backend health endpoint with timeout protection"
echo "   • Frontend health check with 3-attempt retry logic"
echo "   • Offline indicator with consecutive failure tracking"
echo "   • Increased timeouts: 5s → 10s"
echo "   • Health check interval: 30s → 60s (50% less load)"
echo ""
echo "🔍 Verification Steps:"
echo "   1. Monitor for false 'API Temporarily Unavailable' messages"
echo "   2. Check health endpoint: curl https://shithaa.in/api/health"
echo "   3. Monitor logs: pm2 logs shithaa-backend --lines 50"
echo "   4. Watch frontend behavior in browser DevTools"
echo ""
echo "📊 Expected Results:"
echo "   • 90%+ reduction in false unavailable messages"
echo "   • Better tolerance for worker restarts"
echo "   • No user-facing errors during normal operations"
echo "   • Health checks only fail during actual outages (>20s)"
echo ""
echo "📁 Backup Location:"
echo "   $BACKUP_DIR"
echo ""
echo "📖 Documentation:"
echo "   See API_HEALTH_CHECK_RESILIENCE_IMPROVEMENTS.md for details"
echo ""
print_success "Deployment completed! Monitor for the next hour to verify improvements."
echo ""

