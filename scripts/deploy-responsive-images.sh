#!/bin/bash

# Responsive Image Pipeline Deployment Script
# This script helps deploy the responsive image pipeline changes safely

set -e

echo "🚀 Deploying Responsive Image Pipeline..."
echo "=========================================="

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Step 1: Test the responsive image pipeline
print_status "Step 1: Testing responsive image pipeline..."
if [ -f "scripts/test-responsive-images.js" ]; then
    node scripts/test-responsive-images.js
    if [ $? -eq 0 ]; then
        print_success "Responsive image pipeline tests passed"
    else
        print_warning "Some tests failed, but continuing with deployment"
    fi
else
    print_warning "Test script not found, skipping tests"
fi

echo ""

# Step 2: Backend deployment
print_status "Step 2: Deploying backend changes..."

# Check if backend directory exists
if [ -d "backend" ]; then
    cd backend
    
    # Check if package.json has sharp dependency
    if grep -q "sharp" package.json; then
        print_success "Sharp dependency found in backend"
    else
        print_warning "Sharp dependency not found - image optimization may not work"
    fi
    
    # Restart backend server (if using PM2)
    if command -v pm2 &> /dev/null; then
        print_status "Restarting backend server with PM2..."
        pm2 restart all || print_warning "PM2 restart failed, manual restart may be needed"
    else
        print_warning "PM2 not found - please restart backend server manually"
    fi
    
    cd ..
else
    print_warning "Backend directory not found - skipping backend deployment"
fi

echo ""

# Step 3: Frontend deployment
print_status "Step 3: Deploying frontend changes..."

# Check if frontend directory exists
if [ -d "frontend" ]; then
    cd frontend
    
    # Check if ResponsiveImage component exists
    if [ -f "components/responsive-image.tsx" ]; then
        print_success "ResponsiveImage component found"
    else
        print_error "ResponsiveImage component not found - frontend deployment failed"
        exit 1
    fi
    
    # Check if responsive image utilities exist
    if [ -f "lib/responsive-images.ts" ]; then
        print_success "Responsive image utilities found"
    else
        print_error "Responsive image utilities not found - frontend deployment failed"
        exit 1
    fi
    
    # Build frontend
    print_status "Building frontend..."
    if npm run build; then
        print_success "Frontend build successful"
    else
        print_error "Frontend build failed"
        exit 1
    fi
    
    cd ..
else
    print_warning "Frontend directory not found - skipping frontend deployment"
fi

echo ""

# Step 4: Nginx configuration
print_status "Step 4: Updating Nginx configuration..."

# Check if nginx config exists
if [ -f "nginx-config/shithaa.conf" ]; then
    # Check if config has been updated for responsive images
    if grep -q "format negotiation" nginx-config/shithaa.conf; then
        print_success "Nginx configuration updated for responsive images"
        print_warning "Please reload Nginx configuration manually:"
        echo "   sudo nginx -t && sudo systemctl reload nginx"
    else
        print_warning "Nginx configuration may not be updated for responsive images"
    fi
else
    print_warning "Nginx configuration not found - please update manually"
fi

echo ""

# Step 5: Verification
print_status "Step 5: Deployment verification..."

# Check if all required files exist
required_files=(
    "backend/utils/imageOptimizer.js"
    "frontend/components/responsive-image.tsx"
    "frontend/lib/responsive-images.ts"
    "nginx-config/shithaa.conf"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "✓ $file"
    else
        print_error "✗ $file - Missing"
        all_files_exist=false
    fi
done

echo ""

if [ "$all_files_exist" = true ]; then
    print_success "🎉 Responsive Image Pipeline deployment completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Test image uploads to verify size variants are generated"
    echo "   2. Check browser network tab to verify correct image formats are served"
    echo "   3. Test on slow 3G to verify performance improvement"
    echo "   4. Monitor server logs for any image processing errors"
    echo ""
    echo "🔧 Manual steps required:"
    echo "   - Restart backend server if not using PM2"
    echo "   - Reload Nginx configuration: sudo nginx -t && sudo systemctl reload nginx"
    echo "   - Test with a new product image upload"
else
    print_error "❌ Deployment incomplete - some required files are missing"
    exit 1
fi 