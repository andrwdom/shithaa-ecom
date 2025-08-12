#!/bin/bash

# Shithaa E-commerce Deployment Script
# This script helps manage PM2 processes and deployment

set -e

echo "🚀 Shithaa E-commerce Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "ecosystem.config.js" ]; then
    print_error "ecosystem.config.js not found. Please run this script from the project root."
    exit 1
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    print_status "Creating logs directory..."
    mkdir -p logs
    chmod 755 logs
fi

# Function to build frontend
build_frontend() {
    print_status "Building frontend..."
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    # Build the project
    print_status "Running npm run build..."
    npm run build
    
    # Check if build was successful
    if [ ! -d ".next" ]; then
        print_error "Frontend build failed! .next directory not found."
        exit 1
    fi
    
    print_status "Frontend build completed successfully!"
    cd ..
}

# Function to build admin panel
build_admin() {
    print_status "Building admin panel..."
    cd admin
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing admin dependencies..."
        npm install
    fi
    
    # Build the project
    print_status "Running npm run build..."
    npm run build
    
    print_status "Admin panel build completed successfully!"
    cd ..
}

# Function to start all services
start_services() {
    print_status "Starting all services with PM2..."
    
    # Stop any existing processes
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    
    # Start with ecosystem config
    pm2 start ecosystem.config.js
    
    print_status "All services started successfully!"
    pm2 status
}

# Function to restart all services
restart_services() {
    print_status "Restarting all services..."
    pm2 restart all
    print_status "All services restarted!"
    pm2 status
}

# Function to stop all services
stop_services() {
    print_status "Stopping all services..."
    pm2 stop all
    print_status "All services stopped!"
}

# Function to show logs
show_logs() {
    echo "Choose service to view logs:"
    echo "1) Frontend"
    echo "2) Backend"
    echo "3) Admin"
    echo "4) All"
    read -p "Enter choice (1-4): " choice
    
    case $choice in
        1) pm2 logs shithaa-frontend --lines 50 ;;
        2) pm2 logs shitha-backend --lines 50 ;;
        3) pm2 logs shitha-admin --lines 50 ;;
        4) pm2 logs --lines 50 ;;
        *) print_error "Invalid choice!" ;;
    esac
}

# Function to monitor services
monitor_services() {
    print_status "Opening PM2 monitor..."
    pm2 monit
}

# Function to check service health
check_health() {
    print_status "Checking service health..."
    
    # Check if services are running
    if pm2 list | grep -q "shithaa-frontend"; then
        print_status "Frontend: Running"
    else
        print_error "Frontend: Not running"
    fi
    
    if pm2 list | grep -q "shitha-backend"; then
        print_status "Backend: Running"
    else
        print_error "Backend: Not running"
    fi
    
    if pm2 list | grep -q "shitha-admin"; then
        print_status "Admin: Running"
    else
        print_error "Admin: Not running"
    fi
    
    # Check ports
    print_status "Checking ports..."
    netstat -tlnp | grep -E ":(3000|4000|4173)" || print_warning "No services listening on expected ports"
}

# Main menu
show_menu() {
    echo ""
    echo "Choose an option:"
    echo "1) Build and deploy all services"
    echo "2) Build frontend only"
    echo "3) Build admin panel only"
    echo "4) Start all services"
    echo "5) Restart all services"
    echo "6) Stop all services"
    echo "7) Show service status"
    echo "8) Show logs"
    echo "9) Monitor services"
    echo "10) Check service health"
    echo "11) Exit"
    echo ""
}

# Main execution
case "${1:-}" in
    "deploy")
        build_frontend
        build_admin
        start_services
        ;;
    "build-frontend")
        build_frontend
        ;;
    "build-admin")
        build_admin
        ;;
    "start")
        start_services
        ;;
    "restart")
        restart_services
        ;;
    "stop")
        stop_services
        ;;
    "status")
        pm2 status
        ;;
    "logs")
        show_logs
        ;;
    "monitor")
        monitor_services
        ;;
    "health")
        check_health
        ;;
    *)
        while true; do
            show_menu
            read -p "Enter your choice (1-11): " choice
            
            case $choice in
                1)
                    build_frontend
                    build_admin
                    start_services
                    ;;
                2)
                    build_frontend
                    ;;
                3)
                    build_admin
                    ;;
                4)
                    start_services
                    ;;
                5)
                    restart_services
                    ;;
                6)
                    stop_services
                    ;;
                7)
                    pm2 status
                    ;;
                8)
                    show_logs
                    ;;
                9)
                    monitor_services
                    ;;
                10)
                    check_health
                    ;;
                11)
                    print_status "Goodbye!"
                    exit 0
                    ;;
                *)
                    print_error "Invalid choice! Please enter 1-11."
                    ;;
            esac
            
            echo ""
            read -p "Press Enter to continue..."
        done
        ;;
esac 