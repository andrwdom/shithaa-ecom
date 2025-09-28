#!/bin/bash

# Comprehensive Fix and Start Script for Shithaa E-commerce
echo "🔧 Shithaa E-commerce Fix and Start Script"
echo "=========================================="

# Navigate to root directory
cd /var/www/shithaa-ecom
echo "📍 Current directory: $(pwd)"

# Create log directories
echo "📁 Creating log directories..."
mkdir -p backend/logs frontend/logs admin/logs
chmod 755 backend/logs frontend/logs admin/logs

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Test configuration
echo "🔍 Testing configuration..."
node test-pm2-config.js

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    echo "❌ ERROR: Not in the correct directory. Please run from /var/www/shithaa-ecom"
    exit 1
fi

# Check if backend server exists
if [ ! -f "backend/server.js" ]; then
    echo "❌ ERROR: backend/server.js not found"
    echo "Available files in backend/:"
    ls -la backend/
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."

# Backend dependencies
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend && npm install && cd ..
else
    echo "Backend dependencies already installed"
fi

# Frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
else
    echo "Frontend dependencies already installed"
fi

# Admin dependencies
if [ ! -d "admin/node_modules" ]; then
    echo "Installing admin dependencies..."
    cd admin && npm install && cd ..
else
    echo "Admin dependencies already installed"
fi

# Build frontend
if [ ! -d "frontend/.next" ]; then
    echo "🏗️ Building frontend..."
    cd frontend && npm run build && cd ..
else
    echo "Frontend already built"
fi

# Build admin
if [ ! -d "admin/dist" ]; then
    echo "🏗️ Building admin..."
    cd admin && npm run build && cd ..
else
    echo "Admin already built"
fi

# Test PM2 configuration
echo "🧪 Testing PM2 configuration..."
pm2 start ecosystem-simple.config.js --dry-run

if [ $? -eq 0 ]; then
    echo "✅ PM2 configuration test passed"
    
    # Start services
    echo "▶️ Starting services..."
    pm2 start ecosystem-simple.config.js
    
    # Wait for services to start
    sleep 5
    
    # Show status
    echo "📊 Service Status:"
    pm2 status
    
    # Show logs
    echo "📋 Recent logs:"
    pm2 logs --lines 5
    
    echo ""
    echo "✅ Services started successfully!"
    echo ""
    echo "🔍 Useful commands:"
    echo "  pm2 status"
    echo "  pm2 logs"
    echo "  pm2 monit"
    echo ""
    echo "🌐 Services should be available at:"
    echo "  Frontend:  http://localhost:3000"
    echo "  Backend:   http://localhost:4000"
    echo "  Admin:     http://localhost:4173"
    
else
    echo "❌ PM2 configuration test failed"
    echo "Trying with original ecosystem.config.js..."
    
    pm2 start ecosystem.config.js --dry-run
    
    if [ $? -eq 0 ]; then
        echo "✅ Original configuration works"
        pm2 start ecosystem.config.js
        pm2 status
    else
        echo "❌ Both configurations failed"
        echo "Please check the error messages above"
        exit 1
    fi
fi
