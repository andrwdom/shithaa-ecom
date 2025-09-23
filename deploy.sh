#!/bin/bash

# ========================================
# SHITHAA E-COMMERCE DEPLOYMENT SCRIPT
# ========================================
# Run this after VPS setup to deploy the application

set -e  # Exit on any error

echo "🚀 Starting Shithaa E-commerce Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root: sudo bash deploy.sh"
    exit 1
fi

print_header "STEP 1: STOP ALL PROCESSES"

# Stop all PM2 processes
print_status "Stopping all PM2 processes..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

print_header "STEP 2: BACKUP EXISTING CODE"

# Create backup
print_status "Creating backup..."
BACKUP_DIR="/var/www/shithaa-ecom-backup-$(date +%Y%m%d-%H%M%S)"
if [ -d "/var/www/shithaa-ecom" ]; then
    print_status "Backing up existing code to $BACKUP_DIR"
    cp -r /var/www/shithaa-ecom "$BACKUP_DIR"
fi

print_header "STEP 3: PREPARE DIRECTORY STRUCTURE"

# Create directories
print_status "Creating directory structure..."
mkdir -p /var/www/shithaa-ecom/backend/logs
mkdir -p /var/www/shithaa-ecom/frontend/logs
mkdir -p /var/www/shithaa-ecom/admin/logs
mkdir -p /var/www/shithaa-ecom/uploads
mkdir -p /var/www/shithaa-ecom/scripts

print_header "STEP 4: INSTALL REDIS"

# Install Redis if not already installed
print_status "Checking Redis installation..."
if ! command -v redis-server &> /dev/null; then
    print_status "Installing Redis..."
    apt update
    apt install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
    print_status "✅ Redis installed and started"
else
    print_status "✅ Redis is already installed"
fi

print_header "STEP 5: INSTALL BACKEND DEPENDENCIES"

# Install backend dependencies
print_status "Installing backend dependencies..."
cd /var/www/shithaa-ecom/backend

# Install PhonePe SDK
print_status "Installing PhonePe SDK..."
npm install https://phonepe.mycloudrepo.io/public/repositories/phonepe-pg-sdk-node/releases/v2/phonepe-pg-sdk-node.tgz

# Install other dependencies
print_status "Installing other backend dependencies..."
npm install

print_header "STEP 6: INSTALL FRONTEND DEPENDENCIES"

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd /var/www/shithaa-ecom/frontend
npm install

print_header "STEP 7: INSTALL ADMIN DEPENDENCIES"

# Install admin dependencies
print_status "Installing admin dependencies..."
cd /var/www/shithaa-ecom/admin
npm install

print_header "STEP 8: BUILD FRONTEND"

# Build frontend
print_status "Building frontend..."
cd /var/www/shithaa-ecom/frontend
npm run build

print_header "STEP 9: BUILD ADMIN"

# Build admin
print_status "Building admin..."
cd /var/www/shithaa-ecom/admin
npm run build

print_header "STEP 10: START APPLICATION"

# Start the application
print_status "Starting application..."
cd /var/www/shithaa-ecom
pm2 start ecosystem.config.js

print_header "STEP 11: VERIFY DEPLOYMENT"

# Wait a moment for services to start
print_status "Waiting for services to start..."
sleep 10

# Check status
print_status "Checking PM2 status..."
pm2 status

# Check backend health
print_status "Checking backend health..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    print_status "✅ Backend is healthy"
else
    print_error "❌ Backend is not responding (HTTP $BACKEND_STATUS)"
fi

# Check frontend health
print_status "Checking frontend health..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_status "✅ Frontend is healthy"
else
    print_error "❌ Frontend is not responding (HTTP $FRONTEND_STATUS)"
fi

print_header "DEPLOYMENT COMPLETE! 🎉"

print_status "Deployment completed successfully!"
print_status "Application URLs:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:4000"
echo "  Admin Panel: http://localhost:4173"

print_status "Useful commands:"
echo "  pm2 status          - Check application status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart all applications"
echo "  pm2 stop all        - Stop all applications"

print_status "Deployment completed! 🚀"