#!/bin/bash

# ⚡ QUICK FIX SCRIPT FOR SHITHAA E-COMMERCE
# This script allows you to make quick fixes without full deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/shithaa-ecom"
BACKUP_DIR="/var/www/quick-fix-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}⚡ SHITHAA QUICK FIX SCRIPT${NC}"
echo -e "${BLUE}===========================${NC}"

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${RED}❌ This script must be run as root${NC}"
        exit 1
    fi
}

# Function to create quick backup
create_quick_backup() {
    echo -e "${YELLOW}📦 Creating quick backup...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup only the specific file being changed
    if [ -n "$1" ]; then
        BACKUP_FILE="$BACKUP_DIR/$(basename $1)_$TIMESTAMP"
        cp "$1" "$BACKUP_FILE"
        echo -e "${GREEN}✅ File backed up: $BACKUP_FILE${NC}"
    fi
}

# Function to restart specific service
restart_service() {
    local service=$1
    echo -e "${YELLOW}🔄 Restarting $service...${NC}"
    
    pm2 restart "$service"
    
    # Wait a moment
    sleep 5
    
    # Check if service is running
    if pm2 list | grep -q "$service.*online"; then
        echo -e "${GREEN}✅ $service restarted successfully${NC}"
    else
        echo -e "${RED}❌ $service restart failed${NC}"
        return 1
    fi
}

# Function to test specific endpoint
test_endpoint() {
    local endpoint=$1
    echo -e "${YELLOW}🧪 Testing $endpoint...${NC}"
    
    if curl -f "$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $endpoint is working${NC}"
    else
        echo -e "${RED}❌ $endpoint is not working${NC}"
        return 1
    fi
}

# Function to apply frontend fix
apply_frontend_fix() {
    echo -e "${YELLOW}🎨 Applying frontend fix...${NC}"
    
    cd "$PROJECT_DIR/frontend"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Build frontend
    npm run build
    
    # Restart frontend
    restart_service "shithaa-frontend"
    
    # Test frontend
    test_endpoint "http://localhost:3000"
}

# Function to apply backend fix
apply_backend_fix() {
    echo -e "${YELLOW}⚙️ Applying backend fix...${NC}"
    
    cd "$PROJECT_DIR/backend"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Restart backend
    restart_service "shithaa-backend"
    
    # Test backend
    test_endpoint "http://localhost:4000/api/health"
}

# Function to apply admin fix
apply_admin_fix() {
    echo -e "${YELLOW}👨‍💼 Applying admin fix...${NC}"
    
    cd "$PROJECT_DIR/admin"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Build admin
    npm run build
    
    # Restart admin
    restart_service "shithaa-admin"
    
    # Test admin
    test_endpoint "http://localhost:4173"
}

# Function to rollback quick fix
rollback_quick_fix() {
    local file=$1
    echo -e "${RED}🔄 Rolling back quick fix...${NC}"
    
    # Find the most recent backup
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/$(basename $file)_* 2>/dev/null | head -1)
    
    if [ -n "$BACKUP_FILE" ]; then
        cp "$BACKUP_FILE" "$file"
        echo -e "${GREEN}✅ Rolled back to: $BACKUP_FILE${NC}"
        
        # Restart appropriate service
        if [[ "$file" == *"frontend"* ]]; then
            apply_frontend_fix
        elif [[ "$file" == *"backend"* ]]; then
            apply_backend_fix
        elif [[ "$file" == *"admin"* ]]; then
            apply_admin_fix
        fi
    else
        echo -e "${RED}❌ No backup found for $file${NC}"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  frontend [file]     - Apply frontend fix (optionally backup specific file)"
    echo "  backend [file]      - Apply backend fix (optionally backup specific file)"
    echo "  admin [file]        - Apply admin fix (optionally backup specific file)"
    echo "  rollback [file]     - Rollback specific file to last backup"
    echo "  status              - Check all services status"
    echo "  test                - Test all endpoints"
    echo ""
    echo "Examples:"
    echo "  $0 frontend                    # Apply frontend fix"
    echo "  $0 frontend src/pages/index.js # Apply frontend fix with file backup"
    echo "  $0 rollback src/pages/index.js # Rollback specific file"
    echo ""
}

# Main script logic
case "${1:-status}" in
    "frontend")
        check_root
        if [ -n "$2" ]; then
            create_quick_backup "$2"
        fi
        apply_frontend_fix
        ;;
    "backend")
        check_root
        if [ -n "$2" ]; then
            create_quick_backup "$2"
        fi
        apply_backend_fix
        ;;
    "admin")
        check_root
        if [ -n "$2" ]; then
            create_quick_backup "$2"
        fi
        apply_admin_fix
        ;;
    "rollback")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Please specify file to rollback${NC}"
            exit 1
        fi
        check_root
        rollback_quick_fix "$2"
        ;;
    "status")
        echo -e "${YELLOW}📊 Service Status:${NC}"
        pm2 status
        ;;
    "test")
        echo -e "${YELLOW}🧪 Testing all endpoints:${NC}"
        test_endpoint "http://localhost:3000"
        test_endpoint "http://localhost:4000/api/health"
        test_endpoint "http://localhost:4173"
        ;;
    *)
        show_usage
        ;;
esac
