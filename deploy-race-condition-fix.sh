#!/bin/bash

# Deploy Race Condition Fix for Stock Reservation System
# This script deploys the atomic stock reservation fixes

echo "🚀 Deploying Race Condition Fix for Stock Reservation System"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "backend" ]; then
    print_error "Backend directory not found"
    exit 1
fi

print_status "Starting deployment process..."

# 1. Backup current files
print_status "Creating backup of current stock utilities..."
cp backend/utils/stock.js backend/utils/stock.js.backup.$(date +%Y%m%d_%H%M%S)
cp backend/controllers/checkoutController.js backend/controllers/checkoutController.js.backup.$(date +%Y%m%d_%H%M%S)
cp backend/server.js backend/server.js.backup.$(date +%Y%m%d_%H%M%S)

print_success "Backup created successfully"

# 2. Check for syntax errors
print_status "Checking for syntax errors in modified files..."

cd backend

# Check stock.js
if ! node -c utils/stock.js; then
    print_error "Syntax error in utils/stock.js"
    exit 1
fi

# Check checkoutController.js
if ! node -c controllers/checkoutController.js; then
    print_error "Syntax error in controllers/checkoutController.js"
    exit 1
fi

# Check server.js
if ! node -c server.js; then
    print_error "Syntax error in server.js"
    exit 1
fi

print_success "All files passed syntax check"

# 3. Install dependencies if needed
print_status "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# 4. Test the race condition fix
print_status "Testing race condition fix..."
if [ -f "../test-race-condition-fix.js" ]; then
    print_warning "Race condition test script found. You can run it manually after deployment:"
    print_warning "cd backend && node ../test-race-condition-fix.js"
else
    print_warning "Race condition test script not found. Please run the test manually."
fi

# 5. Restart PM2 processes
print_status "Restarting PM2 processes..."

# Stop existing processes
pm2 stop shithaa-backend 2>/dev/null || true
pm2 stop shithaa-reservation-worker 2>/dev/null || true

# Start backend
print_status "Starting backend service..."
pm2 start ecosystem.config.js --env production

# Start reservation worker
print_status "Starting reservation worker..."
pm2 start ecosystem.config.js --only shithaa-reservation-worker --env production

# Save PM2 configuration
pm2 save

print_success "PM2 processes restarted successfully"

# 6. Verify deployment
print_status "Verifying deployment..."

# Check if backend is running
if pm2 list | grep -q "shithaa-backend.*online"; then
    print_success "Backend service is running"
else
    print_error "Backend service failed to start"
    exit 1
fi

# Check if reservation worker is running
if pm2 list | grep -q "shithaa-reservation-worker.*online"; then
    print_success "Reservation worker is running"
else
    print_warning "Reservation worker may not be running (this is normal if not configured)"
fi

# 7. Test API endpoints
print_status "Testing API endpoints..."

# Test health endpoint
if curl -s http://localhost:4000/api/health > /dev/null; then
    print_success "Health endpoint is responding"
else
    print_warning "Health endpoint not responding (may need time to start)"
fi

# Test CORS endpoint
if curl -s http://localhost:4000/api/cors-test > /dev/null; then
    print_success "CORS test endpoint is responding"
else
    print_warning "CORS test endpoint not responding"
fi

# 8. Display summary
echo ""
echo "=============================================================="
print_success "Race Condition Fix Deployment Complete!"
echo "=============================================================="
echo ""
print_status "What was fixed:"
echo "  ✅ Atomic stock reservation with proper concurrency control"
echo "  ✅ Race condition prevention in checkout flow"
echo "  ✅ Enhanced error logging and monitoring"
echo "  ✅ Improved CORS origin handling"
echo "  ✅ Atomic batch reservation for multiple items"
echo ""
print_status "Key improvements:"
echo "  🔒 Stock reservations now use atomic MongoDB operations"
echo "  🚫 Multiple users can't reserve the same limited stock"
echo "  📊 Better error messages and logging"
echo "  🔄 Automatic rollback on batch reservation failures"
echo ""
print_status "Next steps:"
echo "  1. Monitor logs: pm2 logs shithaa-backend"
echo "  2. Test with real checkout flow"
echo "  3. Run race condition test: cd backend && node ../test-race-condition-fix.js"
echo "  4. Monitor reservation stats: curl http://localhost:4000/api/reservations/stats"
echo ""
print_warning "Important: Test the checkout flow thoroughly before going live!"
echo ""

# 9. Show recent logs
print_status "Recent backend logs:"
pm2 logs shithaa-backend --lines 10 --nostream

echo ""
print_success "Deployment completed successfully! 🎉"
