#!/bin/bash

echo "🚀 Building Shithaa Frontend for Production"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Clean previous builds
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf .next
rm -rf out
rm -rf dist

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Set production environment
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://shithaa.in

# Build the application
echo -e "${YELLOW}🔨 Building Next.js application...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    
    # Export static files (optional - for static hosting)
    echo -e "${YELLOW}📤 Exporting static files...${NC}"
    npm run export
    
    echo -e "${GREEN}🎉 Production build ready!${NC}"
    echo ""
    echo "📁 Build output: .next/"
    echo "📁 Static export: out/"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Deploy .next/ folder to your server"
    echo "2. Ensure nginx/apache serves static files correctly"
    echo "3. Check that /_next/static/ URLs return proper MIME types"
    
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
