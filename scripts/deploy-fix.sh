#!/bin/bash

echo "🚀 Starting deployment fix for Shitha Maternity..."

# Stop all PM2 processes
echo "⏹️  Stopping all PM2 processes..."
pm2 stop all
pm2 delete all

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build admin panel
echo "🔨 Building admin panel..."
cd admin
npm install
npm run build
cd ..

# Build backend (install dependencies)
echo "🔨 Installing backend dependencies..."
cd backend
npm install
cd ..

# Start all services with PM2
echo "🚀 Starting all services with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show status
echo "📊 PM2 Status:"
pm2 status

echo "✅ Deployment fix completed!"
echo "🌐 Services should now be running on:"
echo "   - Backend: http://localhost:4000"
echo "   - Frontend: http://localhost:3000"
echo "   - Admin: http://localhost:4173"
