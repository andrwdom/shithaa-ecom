#!/bin/bash

# Complete Shithaa E-commerce Startup Script
echo "🚀 Starting Shithaa E-commerce Services..."

# Navigate to root directory
cd /var/www/shithaa-ecom

# Create necessary log directories
echo "📁 Creating log directories..."
mkdir -p backend/logs
mkdir -p frontend/logs
mkdir -p admin/logs
chmod 755 backend/logs frontend/logs admin/logs

# Stop any existing processes
echo "🛑 Stopping existing processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Check if we have the required dependencies
echo "🔍 Checking dependencies..."

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Check if frontend is built
if [ ! -d "frontend/.next" ]; then
    echo "🏗️ Building frontend..."
    cd frontend && npm run build && cd ..
fi

# Check if admin dependencies are installed
if [ ! -d "admin/node_modules" ]; then
    echo "📦 Installing admin dependencies..."
    cd admin && npm install && cd ..
fi

# Check if admin is built
if [ ! -d "admin/dist" ]; then
    echo "🏗️ Building admin..."
    cd admin && npm run build && cd ..
fi

# Start all services
echo "▶️ Starting services with PM2..."

# Choose which ecosystem config to use
if [ -f "ecosystem-production.config.js" ]; then
    echo "Using production-optimized configuration..."
    pm2 start ecosystem-production.config.js
else
    echo "Using standard configuration..."
    pm2 start ecosystem.config.js
fi

# Wait a moment for services to start
sleep 5

# Show status
echo "📊 Service Status:"
pm2 status

# Show logs for a few seconds
echo "📋 Recent logs:"
pm2 logs --lines 5

echo ""
echo "✅ All services started successfully!"
echo ""
echo "🔍 Useful commands:"
echo "  pm2 status          - Check service status"
echo "  pm2 logs            - View all logs"
echo "  pm2 logs [name]     - View specific service logs"
echo "  pm2 monit           - Monitor services in real-time"
echo "  pm2 restart all     - Restart all services"
echo "  pm2 stop all        - Stop all services"
echo ""
echo "🌐 Services should be available at:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:4000"
echo "  Admin:     http://localhost:4173"
echo ""
echo "🔧 Health check: curl http://localhost:4000/api/health"
