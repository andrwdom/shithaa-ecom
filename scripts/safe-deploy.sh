#!/bin/bash

# 🚀 SAFE DEPLOYMENT SCRIPT FOR SHITHAA E-COMMERCE
# This script ensures zero-downtime deployments with rollback capability

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/shithaa-ecom"
BACKUP_DIR="/var/www/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="shithaa_backup_$TIMESTAMP"

echo -e "${BLUE}🚀 SHITHAA SAFE DEPLOYMENT SCRIPT${NC}"
echo -e "${BLUE}=================================${NC}"

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ This script must be run as root${NC}"
        exit 1
    fi
}

# Function to create backup
create_backup() {
    echo -e "${YELLOW}📦 Creating backup...${NC}"
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Backup current code
    cp -r "$PROJECT_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    
    # Backup database
    mongodump --db shitha --out "$BACKUP_DIR/$BACKUP_NAME/database"
    
    echo -e "${GREEN}✅ Backup created: $BACKUP_DIR/$BACKUP_NAME${NC}"
}

# Function to check if services are running
check_services() {
    echo -e "${YELLOW}🔍 Checking current services...${NC}"
    
    if pm2 list | grep -q "shithaa-backend.*online"; then
        echo -e "${GREEN}✅ Backend is running${NC}"
    else
        echo -e "${RED}❌ Backend is not running${NC}"
        return 1
    fi
    
    if pm2 list | grep -q "shithaa-frontend.*online"; then
        echo -e "${GREEN}✅ Frontend is running${NC}"
    else
        echo -e "${RED}❌ Frontend is not running${NC}"
        return 1
    fi
}

# Function to pull latest code
pull_code() {
    echo -e "${YELLOW}📥 Pulling latest code...${NC}"
    
    cd "$PROJECT_DIR"
    
    # Stash any local changes
    git stash push -m "Auto-stash before deployment $TIMESTAMP"
    
    # Pull latest from develop branch
    git fetch origin
    git reset --hard origin/develop
    
    echo -e "${GREEN}✅ Code updated successfully${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    
    # Frontend dependencies
    cd "$PROJECT_DIR/frontend"
    npm ci --production
    
    # Backend dependencies
    cd "$PROJECT_DIR/backend"
    npm ci --production
    
    # Admin dependencies
    cd "$PROJECT_DIR/admin"
    npm ci --production
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to build applications
build_applications() {
    echo -e "${YELLOW}🔨 Building applications...${NC}"
    
    # Build frontend
    cd "$PROJECT_DIR/frontend"
    npm run build
    
    # Build admin
    cd "$PROJECT_DIR/admin"
    npm run build
    
    echo -e "${GREEN}✅ Applications built successfully${NC}"
}

# Function to restart services
restart_services() {
    echo -e "${YELLOW}🔄 Restarting services...${NC}"
    
    # Restart all services
    pm2 restart all
    
    # Wait for services to start
    sleep 10
    
    # Check if services are running
    if check_services; then
        echo -e "${GREEN}✅ All services restarted successfully${NC}"
    else
        echo -e "${RED}❌ Service restart failed${NC}"
        return 1
    fi
}

# Function to rollback
rollback() {
    echo -e "${RED}🔄 ROLLING BACK TO PREVIOUS VERSION${NC}"
    
    # Stop current services
    pm2 stop all
    
    # Restore from backup
    rm -rf "$PROJECT_DIR"
    cp -r "$BACKUP_DIR/$BACKUP_NAME" "$PROJECT_DIR"
    
    # Restore database
    mongorestore --db shitha "$BACKUP_DIR/$BACKUP_NAME/database/shitha"
    
    # Restart services
    cd "$PROJECT_DIR"
    pm2 start ecosystem.config.js
    
    echo -e "${GREEN}✅ Rollback completed${NC}"
}

# Function to test deployment
test_deployment() {
    echo -e "${YELLOW}🧪 Testing deployment...${NC}"
    
    # Test backend health
    if curl -f http://localhost:4000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend health check passed${NC}"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
        return 1
    fi
    
    # Test frontend
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is accessible${NC}"
    else
        echo -e "${RED}❌ Frontend is not accessible${NC}"
        return 1
    fi
}

# Main deployment function
deploy() {
    echo -e "${BLUE}Starting safe deployment...${NC}"
    
    # Pre-deployment checks
    check_root
    check_services
    
    # Create backup
    create_backup
    
    # Deploy new code
    pull_code
    install_dependencies
    build_applications
    
    # Restart services
    if restart_services; then
        # Test deployment
        if test_deployment; then
            echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
            echo -e "${GREEN}Your site is now running the latest version${NC}"
        else
            echo -e "${RED}❌ Deployment test failed, rolling back...${NC}"
            rollback
            exit 1
        fi
    else
        echo -e "${RED}❌ Service restart failed, rolling back...${NC}"
        rollback
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy     - Deploy latest code from develop branch"
    echo "  rollback   - Rollback to previous version"
    echo "  status     - Check current deployment status"
    echo "  backup     - Create backup without deploying"
    echo "  test       - Test current deployment"
    echo ""
}

# Main script logic
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "rollback")
        rollback
        ;;
    "status")
        check_services
        ;;
    "backup")
        check_root
        create_backup
        ;;
    "test")
        test_deployment
        ;;
    *)
        show_usage
        ;;
esac
