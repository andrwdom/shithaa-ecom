#!/bin/bash

# 🚀 Quick Backend Start Script
echo "🔧 Starting Shithaa Backend Server..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Navigate to backend directory
cd /var/www/shithaa-ecom/backend

# Set basic environment variables if not set
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-4000}
export MONGODB_URI=${MONGODB_URI:-mongodb://127.0.0.1:27017/shitha-maternity}
export JWT_SECRET=${JWT_SECRET:-shitha-maternity-jwt-secret-2024}

echo -e "${BLUE}Environment:${NC}"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "MONGODB_URI: $MONGODB_URI"

# Check if MongoDB is running
echo -e "${BLUE}Checking MongoDB...${NC}"
if systemctl is-active --quiet mongod; then
    echo -e "${GREEN}MongoDB is running${NC}"
else
    echo -e "${YELLOW}MongoDB is not running. Starting it...${NC}"
    sudo systemctl start mongod
    sleep 3
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Start the server
echo -e "${BLUE}Starting backend server...${NC}"
echo -e "${GREEN}Server will be accessible on port $PORT${NC}"
echo -e "${GREEN}Press Ctrl+C to stop${NC}"

# Start the server
node server.js
