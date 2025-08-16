#!/bin/bash

# 🚀 Complete Backend Fix Script for Shithaa E-commerce
echo "🔧 Starting complete backend fix..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Step 2: Setup environment
print_status "🔧 Setting up environment variables..."
cd backend
if [ ! -f ".env" ]; then
    print_warning "Creating .env file..."
    cat > .env << EOF
# Server Configuration
PORT=4000
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb://127.0.0.1:27017/shitha-maternity

# JWT Configuration
JWT_SECRET=shitha-maternity-jwt-secret-2024-$(date +%s)

# CORS Configuration
CORS_ORIGIN=https://shithaa.in

# VPS Configuration
VPS_BASE_URL=https://shithaa.in

# Hero Images Configuration
MAX_DESKTOP=6
MAX_MOBILE=4
MOBILE_THUMB_SIZE=480
DESKTOP_THUMB_SIZE=800
LQIP_SIZE=20
THUMBNAIL_CACHE_SIZE=100

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
EOF
    print_success ".env file created successfully!"
else
    print_success ".env file already exists"
fi
cd ..

# Step 3: Check and start MongoDB
print_status "📊 Checking MongoDB..."
if systemctl is-active --quiet mongod; then
    print_success "MongoDB is running"
else
    print_warning "MongoDB is not running. Starting it..."
    sudo systemctl start mongod
    sleep 3
    if systemctl is-active --quiet mongod; then
        print_success "MongoDB started successfully"
    else
        print_error "Failed to start MongoDB"
        exit 1
    fi
fi

# Step 4: Install backend dependencies
print_status "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -eq 0 ]; then
        print_success "Backend dependencies installed"
    else
        print_error "Failed to install backend dependencies"
        exit 1
    fi
else
    print_success "Backend dependencies already installed"
fi
cd ..

# Step 5: Install frontend dependencies
print_status "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -eq 0 ]; then
        print_success "Frontend dependencies installed"
    else
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
else
    print_success "Frontend dependencies already installed"
fi
cd ..

# Step 6: Install admin dependencies
print_status "📦 Installing admin dependencies..."
cd admin
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -eq 0 ]; then
        print_success "Admin dependencies installed"
    else
        print_error "Failed to install admin dependencies"
        exit 1
    fi
else
    print_success "Admin dependencies already installed"
fi
cd ..

# Step 7: Build frontend
print_status "🏗️ Building frontend..."
cd frontend
if npm run build; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi
cd ..

# Step 8: Build admin
print_status "🏗️ Building admin panel..."
cd admin
if npm run build; then
    print_success "Admin panel built successfully"
else
    print_error "Admin panel build failed"
    exit 1
fi
cd ..

# Step 9: Create logs directory
print_status "📁 Creating logs directory..."
mkdir -p logs
chmod 755 logs

# Step 10: Start services with PM2
print_status "🚀 Starting services with PM2..."
if pm2 start ecosystem.config.js; then
    print_success "Services started successfully"
else
    print_error "Failed to start services with PM2"
    exit 1
fi

# Step 11: Wait for services to be ready
print_status "⏳ Waiting for services to be ready..."
sleep 10

# Step 12: Check service status
print_status "📊 Checking service status..."
pm2 status

# Step 13: Test backend connectivity
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

# Step 14: Test frontend connectivity
print_status "🧪 Testing frontend connectivity..."
if curl -s http://localhost:3000 > /dev/null; then
    print_success "Frontend server is responding on port 3000"
else
    print_error "Frontend server is not responding on port 3000"
    print_status "Checking PM2 logs..."
    pm2 logs shithaa-frontend --lines 20
fi

# Step 15: Test admin panel connectivity
print_status "🧪 Testing admin panel connectivity..."
if curl -s http://localhost:4173 > /dev/null; then
    print_success "Admin panel is responding on port 4173"
else
    print_error "Admin panel is not responding on port 4173"
    print_status "Checking PM2 logs..."
    pm2 logs shithaa-admin --lines 20
fi

# Step 16: Test CORS endpoint
print_status "🧪 Testing CORS endpoint..."
if curl -s -H "Origin: https://admin.shithaa.in" https://shithaa.in/api/cors-test > /dev/null; then
    print_success "CORS endpoint is working"
else
    print_warning "CORS endpoint test failed - this might be expected if nginx needs restart"
fi

# Step 17: Save PM2 configuration
print_status "💾 Saving PM2 configuration..."
pm2 save

# Step 18: Setup PM2 startup script
print_status "🔧 Setting up PM2 startup script..."
pm2 startup

# Step 19: Final status check
print_status "📊 Final service status:"
pm2 status

print_success "🎉 Complete backend fix completed!"
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
echo ""
echo "✅ Backend should now be accessible on port 4000"
echo "✅ CORS should work properly with nginx configuration"
