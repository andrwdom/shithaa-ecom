#!/bin/bash

# Clear Orders Script for Shithaa E-commerce
# This script clears all order history to prepare for site launch

echo "🚀 Shithaa Order Cleanup Script"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    print_warning "MongoDB doesn't appear to be running. Please start MongoDB first."
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "Choose cleanup option:"
echo "1) Clear orders with backup (RECOMMENDED)"
echo "2) Clear orders without backup (FAST)"
echo "3) Exit"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        print_status "Running backup and clear script..."
        cd backend
        node scripts/backup-and-clear-orders.js
        ;;
    2)
        print_warning "This will permanently delete all order data without backup!"
        read -p "Are you sure? Type 'yes' to continue: " confirm
        if [ "$confirm" = "yes" ]; then
            print_status "Running clear script..."
            cd backend
            node scripts/clear-all-orders.js
        else
            print_status "Operation cancelled."
            exit 0
        fi
        ;;
    3)
        print_status "Operation cancelled."
        exit 0
        ;;
    *)
        print_error "Invalid choice!"
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    print_status "✅ Order cleanup completed successfully!"
    print_status "🎉 Your database is now ready for launch!"
else
    print_error "❌ Order cleanup failed!"
    exit 1
fi
