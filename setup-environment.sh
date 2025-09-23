#!/bin/bash

# 🔧 Environment Setup Script for Shithaa Backend
echo "🔧 Setting up environment variables..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Navigate to backend directory
cd /var/www/shithaa-ecom/backend

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
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

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_PRODUCTS_TTL=300
REDIS_CATEGORIES_TTL=3600
REDIS_CART_TTL=3600
REDIS_USER_TTL=86400
REDIS_SESSIONS_TTL=86400
REDIS_STATIC_TTL=7200
EOF
    echo -e "${GREEN}.env file created successfully!${NC}"
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

# Display current environment
echo -e "${BLUE}Current environment variables:${NC}"
echo "PORT: ${PORT:-4000}"
echo "NODE_ENV: ${NODE_ENV:-production}"
echo "MONGODB_URI: ${MONGODB_URI:-mongodb://127.0.0.1:27017/shitha-maternity}"

echo -e "${GREEN}Environment setup completed!${NC}"
echo -e "${BLUE}You can now start the backend server${NC}"
