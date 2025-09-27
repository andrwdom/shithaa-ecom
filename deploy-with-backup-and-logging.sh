#!/bin/bash

# Deploy with Backup and Enhanced Logging
# Creates backups, enables logging, and deploys critical fixes

set -e

echo "🚀 DEPLOYING WITH BACKUP AND ENHANCED LOGGING"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
if [ ! -f "backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# 1. CREATE IMMEDIATE BACKUPS
print_status "Step 1: Creating immediate backups..."
chmod +x create-backups.sh
./create-backups.sh

if [ $? -eq 0 ]; then
    print_success "Backups created successfully!"
else
    print_error "Backup creation failed!"
    exit 1
fi

# 2. ENABLE MAINTENANCE MODE
print_status "Step 2: Enabling maintenance mode to prevent new orders..."
echo "DISABLE_CHECKOUT=true" >> backend/.env
print_success "Maintenance mode enabled (checkout disabled)"

# 3. INSTALL DEPENDENCIES
print_status "Step 3: Installing/updating dependencies..."
cd backend
npm install
cd ..

# 4. CREATE LOG DIRECTORIES
print_status "Step 4: Setting up logging directories..."
mkdir -p backend/logs
mkdir -p /var/log/shithaa
chmod 755 backend/logs
chmod 755 /var/log/shithaa
print_success "Log directories created"

# 5. RESTART BACKEND WITH ENHANCED LOGGING
print_status "Step 5: Restarting backend with enhanced logging..."
pm2 restart shithaa-backend --update-env

if [ $? -eq 0 ]; then
    print_success "Backend restarted successfully!"
else
    print_error "Backend restart failed!"
    exit 1
fi

# 6. VERIFY LOGGING IS WORKING
print_status "Step 6: Verifying enhanced logging is working..."
sleep 3

# Test the logging by making a test request
echo "Testing request logging..."
curl -s http://localhost:3000/api/health > /dev/null

# Check if log files are being created
if [ -f "backend/logs/requests-$(date +%Y-%m-%d).log" ]; then
    print_success "Request logging is working!"
    echo "Log file: backend/logs/requests-$(date +%Y-%m-%d).log"
else
    print_warning "Request logging file not found yet (may take a moment)"
fi

# 7. SHOW CURRENT STATUS
print_status "Step 7: Current system status..."
echo ""
echo "📊 SYSTEM STATUS:"
echo "=================="
echo "Maintenance Mode: ENABLED (checkout disabled)"
echo "Enhanced Logging: ENABLED"
echo "Backend Status: $(pm2 jlist | jq -r '.[] | select(.name=="shithaa-backend") | .pm2_env.status')"
echo "Log Directory: backend/logs/"
echo "Request Log: backend/logs/requests-$(date +%Y-%m-%d).log"
echo ""

# 8. SHOW MONITORING COMMANDS
print_status "Step 8: Monitoring commands available..."
echo ""
echo "🔍 MONITORING COMMANDS:"
echo "======================="
echo "View request logs: tail -f backend/logs/requests-$(date +%Y-%m-%d).log"
echo "View webhook logs: tail -f backend/logs/webhook-$(date +%Y-%m-%d).log"
echo "View payment logs: tail -f backend/logs/payment-$(date +%Y-%m-%d).log"
echo "Check system health: node backend/scripts/system-health-check.js"
echo "Check missing orders: node backend/scripts/audit-payment-system.js"
echo "Recover orders: node backend/scripts/recover-orders.js"
echo ""

# 9. SHOW NEXT STEPS
print_status "Step 9: Next steps..."
echo ""
echo "🎯 NEXT STEPS:"
echo "=============="
echo "1. Monitor logs for any new checkout attempts:"
echo "   tail -f backend/logs/requests-$(date +%Y-%m-%d).log | grep checkout"
echo ""
echo "2. Check for missing orders:"
echo "   node backend/scripts/audit-payment-system.js"
echo ""
echo "3. If missing orders found, recover them:"
echo "   node backend/scripts/recover-orders.js"
echo ""
echo "4. Test the fix with a test order (if needed)"
echo ""
echo "5. When ready, disable maintenance mode:"
echo "   sed -i '/DISABLE_CHECKOUT=true/d' backend/.env"
echo "   pm2 restart shithaa-backend"
echo ""

print_success "Deployment with backup and logging completed!"
print_warning "System is now in maintenance mode with enhanced logging enabled."
print_warning "Remember to disable maintenance mode when fixes are complete!"
