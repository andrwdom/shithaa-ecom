#!/bin/bash

# Emergency Response Script for Shithaa E-commerce
# Handles critical issues with immediate backup and logging

set -e

echo "🚨 EMERGENCY RESPONSE SCRIPT"
echo "============================"

# Colors
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

# 1. IMMEDIATE BACKUP
print_status "Step 1: Creating emergency backup..."
chmod +x create-backups.sh
./create-backups.sh

# 2. ENABLE MAINTENANCE MODE
print_status "Step 2: Enabling maintenance mode..."
echo "DISABLE_CHECKOUT=true" >> backend/.env
echo "MAINTENANCE_MODE=true" >> backend/.env
print_success "Full maintenance mode enabled"

# 3. ENABLE ENHANCED LOGGING
print_status "Step 3: Enabling enhanced logging..."
mkdir -p backend/logs
mkdir -p /var/log/shithaa
chmod 755 backend/logs
chmod 755 /var/log/shithaa

# 4. RESTART SERVICES
print_status "Step 4: Restarting services with enhanced logging..."
pm2 restart shithaa-backend --update-env
pm2 restart shithaa-frontend
pm2 restart shithaa-admin

# 5. IMMEDIATE DIAGNOSIS
print_status "Step 5: Running immediate diagnosis..."

echo ""
echo "🔍 IMMEDIATE DIAGNOSIS:"
echo "======================="

# Check for missing orders
echo "Checking for missing orders..."
node backend/scripts/audit-payment-system.js

# Check system health
echo ""
echo "Checking system health..."
node backend/scripts/system-health-check.js

# 6. SHOW MONITORING COMMANDS
echo ""
echo "🔍 MONITORING COMMANDS:"
echo "======================="
echo "Real-time monitoring: ./monitor-critical-endpoints.sh"
echo "View request logs: tail -f backend/logs/requests-$(date +%Y-%m-%d).log"
echo "View webhook logs: tail -f backend/logs/webhook-$(date +%Y-%m-%d).log"
echo "View payment logs: tail -f backend/logs/payment-$(date +%Y-%m-%d).log"
echo ""

# 7. SHOW RECOVERY OPTIONS
echo "🔧 RECOVERY OPTIONS:"
echo "===================="
echo "Recover missing orders: node backend/scripts/recover-orders.js"
echo "Check payment flow: node backend/scripts/monitor-payments.js"
echo "System health check: node backend/scripts/system-health-check.js"
echo ""

# 8. SHOW DISABLE MAINTENANCE COMMANDS
echo "🚀 DISABLE MAINTENANCE MODE:"
echo "============================"
echo "When ready to resume operations:"
echo "  sed -i '/MAINTENANCE_MODE=true/d' backend/.env"
echo "  sed -i '/DISABLE_CHECKOUT=true/d' backend/.env"
echo "  pm2 restart shithaa-backend"
echo ""

print_success "Emergency response completed!"
print_warning "System is now in full maintenance mode with enhanced logging."
print_warning "Monitor logs and fix issues before disabling maintenance mode."
