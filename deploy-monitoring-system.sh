#!/bin/bash

echo "🚀 DEPLOYING COMPREHENSIVE MONITORING SYSTEM"
echo "=============================================="

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

# Step 1: Check if we're in the right directory
print_status "Checking current directory..."
if [ ! -f "package.json" ]; then
    print_error "Not in the project root directory. Please run from the project root."
    exit 1
fi
print_success "In correct directory"

# Step 2: Check git status
print_status "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Uncommitted changes detected. Committing them..."
    git add .
    git commit -m "feat: Add comprehensive monitoring and recovery system

- Add system health check script
- Add order recovery script  
- Add payment system audit script
- Add monitoring API endpoints
- Add comprehensive logging and alerting
- Fix missing orders issue with enhanced monitoring"
    print_success "Changes committed"
else
    print_success "No uncommitted changes"
fi

# Step 3: Push to repository
print_status "Pushing to repository..."
git push origin develop
if [ $? -eq 0 ]; then
    print_success "Code pushed to repository"
else
    print_error "Failed to push to repository"
    exit 1
fi

# Step 4: Instructions for VPS deployment
echo ""
echo "🎯 VPS DEPLOYMENT INSTRUCTIONS:"
echo "================================"
echo ""
echo "1. SSH into your VPS:"
echo "   ssh root@your-vps-ip"
echo ""
echo "2. Navigate to project directory:"
echo "   cd /var/www/shithaa-ecom"
echo ""
echo "3. Pull latest changes:"
echo "   git pull origin develop"
echo ""
echo "4. Install dependencies:"
echo "   cd backend && npm install"
echo ""
echo "5. Restart backend service:"
echo "   pm2 restart shithaa-backend"
echo ""
echo "6. Run system health check:"
echo "   node backend/scripts/system-health-check.js"
echo ""
echo "7. If missing orders found, run recovery:"
echo "   node backend/scripts/recover-orders.js"
echo ""
echo "8. Start monitoring (optional):"
echo "   nohup node backend/scripts/monitor-payments.js > monitoring.log 2>&1 &"
echo ""
echo "9. Check monitoring API endpoints:"
echo "   curl http://localhost:3000/api/monitoring/health"
echo "   curl http://localhost:3000/api/monitoring/missing-orders"
echo "   curl http://localhost:3000/api/monitoring/metrics"
echo ""
echo "10. Check logs:"
echo "    ls -la backend/logs/"
echo "    tail -f backend/logs/payment-$(date +%Y-%m-%d).log"
echo ""

print_success "Deployment script completed!"
print_status "Follow the VPS instructions above to complete the deployment."
