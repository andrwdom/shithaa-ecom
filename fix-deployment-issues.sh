#!/bin/bash

echo "🔧 Fixing Shithaa E-commerce Deployment Issues"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Issues to fix:${NC}"
echo "1. Frontend: Missing .next directory (production build)"
echo "2. Backend: PM2 worker configuration updated"
echo ""

# Step 1: Build Frontend
echo -e "${YELLOW}🚀 Step 1: Building Frontend for Production${NC}"
echo "=============================================="

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
        exit 1
    fi
fi

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf .next
rm -rf out

# Set production environment variables
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://shithaa.in

# Build the application
echo -e "${YELLOW}🔨 Building Next.js application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build completed successfully!${NC}"
    
    # Verify build files exist
    if [ -d ".next" ] && [ -f ".next/BUILD_ID" ]; then
        echo -e "${GREEN}✅ Production build verified!${NC}"
        echo "📁 Build files created in .next directory"
    else
        echo -e "${RED}❌ Build verification failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

cd ..

# Step 2: Check Backend Dependencies
echo ""
echo -e "${YELLOW}🔧 Step 2: Checking Backend Dependencies${NC}"
echo "=============================================="

cd backend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install backend dependencies${NC}"
        exit 1
    fi
fi

cd ..

# Step 3: Create Log Directories
echo ""
echo -e "${YELLOW}📁 Step 3: Creating Log Directories${NC}"
echo "=============================================="

mkdir -p frontend/logs
mkdir -p backend/logs
mkdir -p admin/logs

echo -e "${GREEN}✅ Log directories created${NC}"

# Step 4: Update PM2 Configuration
echo ""
echo -e "${YELLOW}⚙️  Step 4: PM2 Configuration Updated${NC}"
echo "=============================================="
echo -e "${GREEN}✅ Added reservation worker to ecosystem.config.js${NC}"
echo "   - Worker will run every 5 minutes"
echo "   - Auto-restart on crashes"
echo "   - Separate log files for monitoring"

# Step 5: Instructions for Deployment
echo ""
echo -e "${BLUE}🚀 Step 5: Deployment Instructions${NC}"
echo "=============================================="
echo ""
echo "To deploy the fixes:"
echo ""
echo "1. Stop current PM2 processes:"
echo "   pm2 stop all"
echo ""
echo "2. Delete old processes:"
echo "   pm2 delete all"
echo ""
echo "3. Start with new configuration:"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "4. Check status:"
echo "   pm2 status"
echo ""
echo "5. Monitor logs:"
echo "   pm2 logs"
echo ""
echo "6. Save PM2 configuration:"
echo "   pm2 save"
echo "   pm2 startup"
echo ""

echo -e "${GREEN}🎉 Fix script completed!${NC}"
echo ""
echo -e "${BLUE}📝 Summary of fixes:${NC}"
echo "✅ Frontend production build created"
echo "✅ PM2 worker configuration added"
echo "✅ Log directories created"
echo "✅ Dependencies verified"
echo ""
echo -e "${YELLOW}⚠️  Next steps:${NC}"
echo "1. Run the deployment commands above"
echo "2. Test the application"
echo "3. Monitor logs for any issues"
