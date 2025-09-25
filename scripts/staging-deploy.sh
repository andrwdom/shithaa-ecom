#!/bin/bash

# 🧪 STAGING DEPLOYMENT SCRIPT FOR SHITHAA E-COMMERCE
# This script deploys to a staging environment for testing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/shithaa-ecom-staging"
STAGING_PORT_FRONTEND=3001
STAGING_PORT_BACKEND=4001
STAGING_PORT_ADMIN=4174

echo -e "${BLUE}🧪 SHITHAA STAGING DEPLOYMENT SCRIPT${NC}"
echo -e "${BLUE}====================================${NC}"

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ This script must be run as root${NC}"
        exit 1
    fi
}

# Function to setup staging environment
setup_staging() {
    echo -e "${YELLOW}🔧 Setting up staging environment...${NC}"
    
    # Create staging directory
    mkdir -p "$PROJECT_DIR"
    
    # Clone or update staging repo
    if [ -d "$PROJECT_DIR/.git" ]; then
        cd "$PROJECT_DIR"
        git fetch origin
        git reset --hard origin/develop
    else
        git clone https://github.com/andrwdom/shithaa-ecom.git "$PROJECT_DIR"
        cd "$PROJECT_DIR"
        git checkout develop
    fi
    
    echo -e "${GREEN}✅ Staging environment setup complete${NC}"
}

# Function to create staging ecosystem config
create_staging_config() {
    echo -e "${YELLOW}📝 Creating staging ecosystem config...${NC}"
    
    cat > "$PROJECT_DIR/ecosystem.staging.config.js" << EOF
export default {
  apps: [
    {
      name: 'shithaa-backend-staging',
      script: 'backend/server.js',
      cwd: '$PROJECT_DIR',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '$PROJECT_DIR/backend/.env.staging',
      env: {
        NODE_ENV: 'staging',
        PORT: $STAGING_PORT_BACKEND
      },
      error_file: './backend/logs/backend-staging-err.log',
      out_file: './backend/logs/backend-staging-out.log',
      log_file: './backend/logs/backend-staging-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'shithaa-frontend-staging',
      script: 'npm',
      args: 'start',
      cwd: '$PROJECT_DIR/frontend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'staging',
        PORT: $STAGING_PORT_FRONTEND,
        NEXT_PUBLIC_API_URL: 'http://localhost:$STAGING_PORT_BACKEND/api'
      },
      error_file: './frontend/logs/frontend-staging-err.log',
      out_file: './frontend/logs/frontend-staging-out.log',
      log_file: './frontend/logs/frontend-staging-combined.log',
      time: true
    },
    {
      name: 'shithaa-admin-staging',
      script: 'npm',
      args: 'run preview',
      cwd: '$PROJECT_DIR/admin',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'staging',
        PORT: $STAGING_PORT_ADMIN,
        VITE_API_URL: 'http://localhost:$STAGING_PORT_BACKEND/api'
      },
      error_file: './admin/logs/admin-staging-err.log',
      out_file: './admin/logs/admin-staging-out.log',
      log_file: './admin/logs/admin-staging-combined.log',
      time: true
    }
  ]
};
EOF

    echo -e "${GREEN}✅ Staging ecosystem config created${NC}"
}

# Function to create staging environment files
create_staging_env() {
    echo -e "${YELLOW}📝 Creating staging environment files...${NC}"
    
    # Backend staging env
    cat > "$PROJECT_DIR/backend/.env.staging" << EOF
MONGODB_URI=mongodb://localhost:27017/shitha_staging
JWT_SECRET=staging_jwt_secret_$(date +%s)
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
NODE_ENV=staging
PORT=$STAGING_PORT_BACKEND
EOF

    # Frontend staging env
    cat > "$PROJECT_DIR/frontend/.env.staging" << EOF
NEXT_PUBLIC_API_URL=http://localhost:$STAGING_PORT_BACKEND/api
NEXT_PUBLIC_SITE_URL=http://localhost:$STAGING_PORT_FRONTEND
NODE_ENV=staging
EOF

    # Admin staging env
    cat > "$PROJECT_DIR/admin/.env.staging" << EOF
VITE_API_URL=http://localhost:$STAGING_PORT_BACKEND/api
NODE_ENV=staging
EOF

    echo -e "${GREEN}✅ Staging environment files created${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    
    # Frontend dependencies
    cd "$PROJECT_DIR/frontend"
    npm install
    
    # Backend dependencies
    cd "$PROJECT_DIR/backend"
    npm install
    
    # Admin dependencies
    cd "$PROJECT_DIR/admin"
    npm install
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to build applications
build_applications() {
    echo -e "${YELLOW}🔨 Building applications...${NC}"
    
    # Build frontend
    cd "$PROJECT_DIR/frontend"
    cp .env.staging .env.local
    npm run build
    
    # Build admin
    cd "$PROJECT_DIR/admin"
    cp .env.staging .env
    npm run build
    
    echo -e "${GREEN}✅ Applications built successfully${NC}"
}

# Function to start staging services
start_staging() {
    echo -e "${YELLOW}🚀 Starting staging services...${NC}"
    
    cd "$PROJECT_DIR"
    
    # Stop any existing staging services
    pm2 stop shithaa-backend-staging 2>/dev/null || true
    pm2 stop shithaa-frontend-staging 2>/dev/null || true
    pm2 stop shithaa-admin-staging 2>/dev/null || true
    pm2 delete shithaa-backend-staging 2>/dev/null || true
    pm2 delete shithaa-frontend-staging 2>/dev/null || true
    pm2 delete shithaa-admin-staging 2>/dev/null || true
    
    # Start staging services
    pm2 start ecosystem.staging.config.js
    
    # Wait for services to start
    sleep 15
    
    echo -e "${GREEN}✅ Staging services started${NC}"
}

# Function to test staging
test_staging() {
    echo -e "${YELLOW}🧪 Testing staging environment...${NC}"
    
    # Test backend
    if curl -f "http://localhost:$STAGING_PORT_BACKEND/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Staging backend is running${NC}"
    else
        echo -e "${RED}❌ Staging backend failed${NC}"
        return 1
    fi
    
    # Test frontend
    if curl -f "http://localhost:$STAGING_PORT_FRONTEND" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Staging frontend is running${NC}"
    else
        echo -e "${RED}❌ Staging frontend failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}🎉 Staging environment is ready!${NC}"
    echo -e "${BLUE}Frontend: http://localhost:$STAGING_PORT_FRONTEND${NC}"
    echo -e "${BLUE}Backend API: http://localhost:$STAGING_PORT_BACKEND/api${NC}"
    echo -e "${BLUE}Admin: http://localhost:$STAGING_PORT_ADMIN${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup      - Setup staging environment"
    echo "  deploy     - Deploy to staging"
    echo "  start      - Start staging services"
    echo "  stop       - Stop staging services"
    echo "  test       - Test staging environment"
    echo "  status     - Check staging status"
    echo ""
}

# Main script logic
case "${1:-deploy}" in
    "setup")
        check_root
        setup_staging
        create_staging_config
        create_staging_env
        install_dependencies
        build_applications
        start_staging
        test_staging
        ;;
    "deploy")
        check_root
        setup_staging
        install_dependencies
        build_applications
        start_staging
        test_staging
        ;;
    "start")
        start_staging
        ;;
    "stop")
        pm2 stop shithaa-backend-staging shithaa-frontend-staging shithaa-admin-staging
        ;;
    "test")
        test_staging
        ;;
    "status")
        pm2 status | grep staging
        ;;
    *)
        show_usage
        ;;
esac
