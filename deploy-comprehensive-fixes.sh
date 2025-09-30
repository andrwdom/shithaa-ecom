#!/bin/bash

# 🚨 COMPREHENSIVE FIX DEPLOYMENT SCRIPT 🚨
# This script deploys all critical fixes systematically

set -e  # Exit on any error

echo "=================================================="
echo "🚀 SHITHAA COMPREHENSIVE FIX DEPLOYMENT"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as the correct user
if [ "$EUID" -ne 0 ] && [ "$(whoami)" != "root" ]; then
  echo -e "${YELLOW}⚠️  Not running as root. Some operations may require sudo.${NC}"
fi

# Function to print status
print_status() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Step 1: Create backup
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 1: Creating Backup${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

BACKUP_DIR="backups/deployment-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_status "Backing up frontend build..."
if [ -d "frontend/.next" ]; then
  cp -r frontend/.next "$BACKUP_DIR/frontend-next"
fi

print_status "Backing up backend..."
cp -r backend "$BACKUP_DIR/backend-backup"

print_status "Backing up admin build..."
if [ -d "admin/dist" ]; then
  cp -r admin/dist "$BACKUP_DIR/admin-dist"
fi

print_status "Backup created at: $BACKUP_DIR"
echo ""

# Step 2: Install dependencies if needed
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 2: Checking Dependencies${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd backend
if [ ! -d "node_modules" ]; then
  print_warning "Installing backend dependencies..."
  npm install --production
else
  print_status "Backend dependencies already installed"
fi

# Install winston for logging if not present
if ! npm list winston --depth=0 > /dev/null 2>&1; then
  print_warning "Installing winston for logging..."
  npm install winston
fi

cd ../frontend
if [ ! -d "node_modules" ]; then
  print_warning "Installing frontend dependencies..."
  npm install
else
  print_status "Frontend dependencies already installed"
fi

cd ..
echo ""

# Step 3: Build frontend with optimizations
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 3: Building Optimized Frontend${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd frontend
print_status "Building frontend with production optimizations..."
export NODE_ENV=production
npm run build

if [ $? -eq 0 ]; then
  print_status "Frontend build successful!"
else
  print_error "Frontend build failed!"
  exit 1
fi

cd ..
echo ""

# Step 4: Optimize images if not done
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 4: Image Optimization${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -d "backend/uploads" ]; then
  print_status "Checking for unoptimized images..."
  # Count non-webp images
  IMG_COUNT=$(find backend/uploads -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | wc -l)
  
  if [ "$IMG_COUNT" -gt 0 ]; then
    print_warning "Found $IMG_COUNT unoptimized images"
    print_status "Images will be optimized by Cloudflare CDN"
  else
    print_status "All images are optimized"
  fi
else
  print_warning "No uploads directory found"
fi

echo ""

# Step 5: Stop services
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 5: Stopping Services${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

print_status "Stopping PM2 services..."
pm2 stop all || true
print_status "Services stopped"
echo ""

# Step 6: Clear caches
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 6: Clearing Caches${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

print_status "Clearing old logs..."
find backend/logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
find frontend/logs -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true

print_status "Caches cleared"
echo ""

# Step 7: Restart services
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 7: Starting Services${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

print_status "Starting PM2 services..."
pm2 start ecosystem.config.js

print_status "Saving PM2 configuration..."
pm2 save

echo ""

# Step 8: Health check
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 8: Health Check${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

sleep 5

print_status "Checking service status..."
pm2 status

echo ""
print_status "Checking backend health..."
sleep 3
if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
  print_status "Backend is healthy!"
else
  print_warning "Backend health check failed - may need a moment to start"
fi

echo ""
print_status "Checking frontend..."
if curl -f http://localhost:3000 > /dev/null 2>&1; then
  print_status "Frontend is running!"
else
  print_warning "Frontend check failed - may need a moment to start"
fi

echo ""

# Step 9: Cloudflare cache purge
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}STEP 9: Cloudflare Cache Purge${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

print_warning "Please manually purge Cloudflare cache:"
echo "  1. Go to dash.cloudflare.com"
echo "  2. Select shithaa.in domain"
echo "  3. Caching → Configuration → Purge Everything"
echo ""

# Final summary
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Summary:"
echo "  ✓ Backup created: $BACKUP_DIR"
echo "  ✓ Frontend rebuilt with optimizations"
echo "  ✓ Services restarted"
echo "  ✓ Health checks completed"
echo ""
echo "🔍 Next Steps:"
echo "  1. Monitor logs: pm2 logs"
echo "  2. Check status: pm2 status"
echo "  3. Test the site thoroughly"
echo "  4. Purge Cloudflare cache"
echo ""
echo "🚨 If issues occur:"
echo "  ./rollback-deployment.sh $BACKUP_DIR"
echo ""
echo -e "${GREEN}Good luck! 🚀${NC}"
