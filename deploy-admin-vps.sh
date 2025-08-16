#!/bin/bash

# Admin Panel VPS Deployment Script
echo "🚀 Starting Admin Panel VPS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Set variables
ADMIN_DIR="/var/www/shithaa-ecom/admin"
PM2_LOG_DIR="/var/log/pm2"

echo -e "${YELLOW}📁 Setting up admin panel directory...${NC}"
mkdir -p $ADMIN_DIR
mkdir -p $PM2_LOG_DIR

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd $ADMIN_DIR
npm install --production

echo -e "${YELLOW}🔧 Building admin panel...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Admin panel built successfully!${NC}"
    
    # Create favicon.ico if it doesn't exist
    if [ ! -f "dist/favicon.ico" ]; then
        echo -e "${YELLOW}🔧 Creating favicon.ico...${NC}"
        cp dist/favicon.png dist/favicon.ico
    fi
    
    # Set proper permissions
    echo -e "${YELLOW}🔐 Setting permissions...${NC}"
    chown -R www-data:www-data $ADMIN_DIR
    chmod -R 755 $ADMIN_DIR
    
    echo -e "${GREEN}📁 Admin panel ready at $ADMIN_DIR/dist${NC}"
    
    # Ask user which method they want to use
    echo -e "${YELLOW}Choose deployment method:${NC}"
    echo "1) Serve as static files with nginx (recommended)"
    echo "2) Run as PM2 process"
    read -p "Enter choice (1 or 2): " choice
    
    case $choice in
        1)
            echo -e "${YELLOW}🔄 Restarting nginx...${NC}"
            systemctl restart nginx
            echo -e "${GREEN}✅ Admin panel deployed as static files!${NC}"
            echo -e "${GREEN}🌐 Access at: https://admin.shithaa.in${NC}"
            ;;
        2)
            echo -e "${YELLOW}🚀 Starting admin panel with PM2...${NC}"
            # Copy ecosystem config
            cp /var/www/shithaa-ecom/ecosystem-admin.config.js $ADMIN_DIR/
            
            # Start with PM2
            cd $ADMIN_DIR
            pm2 start ecosystem-admin.config.js
            
            # Save PM2 configuration
            pm2 save
            pm2 startup
            
            echo -e "${GREEN}✅ Admin panel started with PM2!${NC}"
            echo -e "${GREEN}🌐 Access at: https://admin.shithaa.in${NC}"
            echo -e "${YELLOW}📊 PM2 Status: pm2 status${NC}"
            echo -e "${YELLOW}📝 PM2 Logs: pm2 logs admin-panel${NC}"
            ;;
        *)
            echo -e "${RED}Invalid choice. Please run the script again.${NC}"
            exit 1
            ;;
    esac
    
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
