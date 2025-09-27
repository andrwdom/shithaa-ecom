#!/bin/bash

# Maintenance Mode Toggle Script
# Usage: ./toggle-maintenance.sh [enable|disable] [full|checkout|payments]

MODE=${1:-status}
TYPE=${2:-full}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
if [ ! -f "backend/package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

case $MODE in
    "enable")
        case $TYPE in
            "full")
                print_status "Enabling FULL maintenance mode..."
                echo "MAINTENANCE_MODE=true" >> backend/.env
                print_success "MAINTENANCE_MODE=true added to .env"
                ;;
            "checkout")
                print_status "Disabling CHECKOUT only..."
                echo "DISABLE_CHECKOUT=true" >> backend/.env
                print_success "DISABLE_CHECKOUT=true added to .env"
                ;;
            "payments")
                print_status "Disabling PAYMENTS only..."
                echo "DISABLE_PAYMENTS=true" >> backend/.env
                print_success "DISABLE_PAYMENTS=true added to .env"
                ;;
            *)
                print_error "Invalid type. Use: full, checkout, or payments"
                exit 1
                ;;
        esac
        
        print_status "Restarting backend service..."
        pm2 restart shithaa-backend
        
        print_success "Maintenance mode enabled!"
        print_warning "Users will now see maintenance messages"
        ;;
        
    "disable")
        print_status "Disabling maintenance mode..."
        
        # Remove maintenance mode variables from .env
        sed -i '/MAINTENANCE_MODE=true/d' backend/.env
        sed -i '/DISABLE_CHECKOUT=true/d' backend/.env
        sed -i '/DISABLE_PAYMENTS=true/d' backend/.env
        
        print_success "Maintenance mode variables removed from .env"
        
        print_status "Restarting backend service..."
        pm2 restart shithaa-backend
        
        print_success "Maintenance mode disabled!"
        print_success "System is now fully operational"
        ;;
        
    "status")
        print_status "Checking maintenance status..."
        
        echo ""
        echo "📊 CURRENT STATUS:"
        echo "=================="
        
        # Check environment variables
        if grep -q "MAINTENANCE_MODE=true" backend/.env 2>/dev/null; then
            echo "🚨 FULL MAINTENANCE MODE: ACTIVE"
        else
            echo "✅ FULL MAINTENANCE MODE: INACTIVE"
        fi
        
        if grep -q "DISABLE_CHECKOUT=true" backend/.env 2>/dev/null; then
            echo "🚨 CHECKOUT DISABLED: ACTIVE"
        else
            echo "✅ CHECKOUT DISABLED: INACTIVE"
        fi
        
        if grep -q "DISABLE_PAYMENTS=true" backend/.env 2>/dev/null; then
            echo "🚨 PAYMENTS DISABLED: ACTIVE"
        else
            echo "✅ PAYMENTS DISABLED: INACTIVE"
        fi
        
        echo ""
        echo "🔧 PM2 STATUS:"
        pm2 status shithaa-backend
        
        echo ""
        echo "🌐 API STATUS:"
        curl -s http://localhost:3000/api/maintenance/status | jq . 2>/dev/null || echo "API not responding"
        ;;
        
    *)
        echo "Usage: $0 [enable|disable|status] [full|checkout|payments]"
        echo ""
        echo "Commands:"
        echo "  enable <type>  - Enable maintenance mode"
        echo "  disable        - Disable all maintenance modes"
        echo "  status         - Check current status"
        echo ""
        echo "Types (for enable):"
        echo "  full           - Full maintenance mode (blocks everything except browsing)"
        echo "  checkout       - Disable checkout only"
        echo "  payments       - Disable payments only"
        echo ""
        echo "Examples:"
        echo "  $0 enable checkout    # Disable checkout only"
        echo "  $0 enable full        # Enable full maintenance mode"
        echo "  $0 disable            # Disable all maintenance modes"
        echo "  $0 status             # Check current status"
        ;;
esac
