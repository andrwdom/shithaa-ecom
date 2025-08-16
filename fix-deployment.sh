#!/bin/bash

# 🚀 Shithaa E-commerce Deployment Fix Script
# This script fixes the CORS and backend server issues

echo "🔧 Starting Shithaa E-commerce deployment fix..."

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Navigate to project directory
cd /var/www/shithaa-ecom || {
    print_error "Project directory not found. Please run this script from the correct location."
    exit 1
}

print_status "Current directory: $(pwd)"

# Step 1: Stop all existing PM2 processes
print_status "🛑 Stopping existing PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Step 2: Check if backend dependencies are installed
print_status "📦 Checking backend dependencies..."
if [ ! -d "backend/node_modules" ]; then
    print_warning "Backend node_modules not found. Installing dependencies..."
    cd backend
    npm install
    cd ..
else
    print_success "Backend dependencies already installed"
fi

# Step 3: Check if frontend dependencies are installed
print_status "📦 Checking frontend dependencies..."
if [ ! -d "frontend/node_modules" ]; then
    print_warning "Frontend node_modules not found. Installing dependencies..."
    cd frontend
    npm install
    cd ..
else
    print_success "Frontend dependencies already installed"
fi

# Step 4: Check if admin dependencies are installed
print_status "📦 Checking admin dependencies..."
if [ ! -d "admin/node_modules" ]; then
    print_warning "Admin node_modules not found. Installing dependencies..."
    cd admin
    npm install
    cd ..
else
    print_success "Admin dependencies already installed"
fi

# Step 5: Build frontend
print_status "🏗️ Building frontend..."
cd frontend
if npm run build; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi
cd ..

# Step 6: Build admin
print_status "🏗️ Building admin panel..."
cd admin
if npm run build; then
    print_success "Admin panel built successfully"
else
    print_error "Admin panel build failed"
    exit 1
fi
cd ..

# Step 7: Create logs directory
print_status "📁 Creating logs directory..."
mkdir -p logs
chmod 755 logs

# Step 8: Start services with PM2
print_status "🚀 Starting services with PM2..."
if pm2 start ecosystem.config.js; then
    print_success "Services started successfully"
else
    print_error "Failed to start services with PM2"
    exit 1
fi

# Step 9: Wait for services to be ready
print_status "⏳ Waiting for services to be ready..."
sleep 10

# Step 10: Check service status
print_status "📊 Checking service status..."
pm2 status

# Step 11: Test backend connectivity
print_status "🧪 Testing backend connectivity..."
sleep 5

# Test if backend is responding
if curl -s http://localhost:4000/api/health > /dev/null; then
    print_success "Backend server is responding on port 4000"
else
    print_error "Backend server is not responding on port 4000"
    print_status "Checking PM2 logs..."
    pm2 logs shithaa-backend --lines 20
fi

# Step 12: Test frontend connectivity
print_status "🧪 Testing frontend connectivity..."
if curl -s http://localhost:3000 > /dev/null; then
    print_success "Frontend server is responding on port 3000"
else
    print_error "Frontend server is not responding on port 3000"
    print_status "Checking PM2 logs..."
    pm2 logs shithaa-frontend --lines 20
fi

# Step 13: Test admin panel connectivity
print_status "🧪 Testing admin panel connectivity..."
if curl -s http://localhost:4173 > /dev/null; then
    print_success "Admin panel is responding on port 4173"
else
    print_error "Admin panel is not responding on port 4173"
    print_status "Checking PM2 logs..."
    pm2 logs shithaa-admin --lines 20
fi

# Step 14: Test CORS endpoint
print_status "🧪 Testing CORS endpoint..."
if curl -s -H "Origin: https://admin.shithaa.in" https://shithaa.in/api/cors-test > /dev/null; then
    print_success "CORS endpoint is working"
else
    print_warning "CORS endpoint test failed - this might be expected if nginx needs restart"
fi

# Step 15: Save PM2 configuration
print_status "💾 Saving PM2 configuration..."
pm2 save

# Step 16: Setup PM2 startup script
print_status "🔧 Setting up PM2 startup script..."
pm2 startup

# Step 17: Final status check
print_status "📊 Final service status:"
pm2 status

print_success "🎉 Deployment fix completed!"
echo ""
echo "📋 Next steps:"
echo "1. Restart nginx: sudo systemctl restart nginx"
echo "2. Test the admin panel: https://admin.shithaa.in"
echo "3. Check logs: pm2 logs"
echo "4. Monitor services: pm2 monit"
echo ""
echo "🔍 If issues persist, check:"
echo "- PM2 logs: pm2 logs"
echo "- Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "- Backend logs: pm2 logs shithaa-backend"
echo "- Frontend logs: pm2 logs shithaa-frontend"
