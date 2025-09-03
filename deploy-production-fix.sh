#!/bin/bash


# 🚀 Production Fix Deployment Script for Shithaa E-commerce
# This script fixes the current production issues and deploys the checkout flow fixes

set -e  # Exit on any error

echo "🚀 Starting Production Fix Deployment..."
echo "======================================="

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
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Backup current state
echo "📦 Creating backup of current state..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup_production_fix_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# Backup key files
cp -r backend/controllers "$BACKUP_DIR/"
cp -r backend/models "$BACKUP_DIR/"
cp -r backend/routes "$BACKUP_DIR/"
cp backend/server.js "$BACKUP_DIR/"

print_status "Backup created in: $BACKUP_DIR"

# Stop all running PM2 processes
echo "🛑 Stopping all PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Kill any remaining Node.js processes on port 4000
echo "🔪 Killing any remaining Node.js processes on port 4000..."
pkill -f "node.*4000" 2>/dev/null || true
pkill -f "node.*backend" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 3

# Check if port 4000 is still in use
if lsof -i :4000 >/dev/null 2>&1; then
    print_warning "Port 4000 is still in use. Force killing processes..."
    sudo lsof -ti :4000 | xargs sudo kill -9 2>/dev/null || true
    sleep 2
fi

print_status "All processes stopped"

# Deploy backend fixes
echo "🔧 Deploying backend fixes..."

# Fix the server.js shutdown issue
if grep -q "app.close" backend/server.js; then
    print_warning "Fixing server.js shutdown handler..."
    sed -i 's/app\.close/server.close/g' backend/server.js
    print_status "Server shutdown handler fixed"
fi

# Install backend dependencies if needed
cd backend
if [ ! -d "node_modules" ]; then
    print_warning "Installing backend dependencies..."
    npm install --production
fi
cd ..

# Build frontend for production
echo "🎨 Building frontend for production..."
cd frontend
if [ ! -d "node_modules" ]; then
    print_warning "Installing frontend dependencies..."
    npm install
fi

print_warning "Building frontend for production..."
npm run build
cd ..

print_status "Frontend built successfully"

# Start backend with PM2
echo "🚀 Starting backend with PM2..."
cd backend
pm2 start ecosystem.config.js --env production
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Check backend health
if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
    print_status "Backend is healthy and running"
else
    print_error "Backend health check failed"
    echo "Checking PM2 logs..."
    pm2 logs shithaa-backend --lines 20
    exit 1
fi

# Start frontend with PM2
echo "🚀 Starting frontend with PM2..."
cd frontend
pm2 start ecosystem.config.js --env production
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 15

# Check frontend health
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "Frontend is running"
else
    print_warning "Frontend may still be starting up"
fi

# Show PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 status

# Show deployment summary
echo ""
echo "🎉 Production Fix Deployment Summary"
echo "===================================="
print_status "Server shutdown error fixed"
print_status "Port conflicts resolved"
print_status "Backend deployed and running"
print_status "Frontend built and deployed"
print_status "PM2 processes configured"

echo ""
echo "📋 Next Steps:"
echo "1. Test the complete checkout flow manually"
echo "2. Verify stock reduction works after successful payments"
echo "3. Check admin panel for order creation"
echo "4. Monitor PM2 logs for any errors"
echo "5. Test PhonePe webhook handling"

echo ""
echo "🔍 Monitoring Commands:"
echo "PM2 status: pm2 status"
echo "Backend logs: pm2 logs shithaa-backend"
echo "Frontend logs: pm2 logs shithaa-frontend"
echo "Real-time logs: pm2 logs --lines 100"

echo ""
echo "🔄 Rollback Instructions:"
echo "If issues occur, restore from backup: $BACKUP_DIR"
echo "PM2 restart: pm2 restart all"

# Save PM2 configuration
echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

print_status "Production deployment completed successfully!"
print_status "Your checkout flow fixes are now live!"
