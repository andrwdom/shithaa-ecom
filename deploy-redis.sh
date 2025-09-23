#!/bin/bash

# ========================================
# REDIS DEPLOYMENT SCRIPT FOR SHITHAA
# ========================================
# Quick Redis deployment and configuration

set -e  # Exit on any error

echo "🚀 Deploying Redis for Shithaa E-commerce..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root: sudo bash deploy-redis.sh"
    exit 1
fi

print_header "STEP 1: INSTALL REDIS"

# Update package list
print_status "Updating package list..."
apt update

# Install Redis
print_status "Installing Redis server..."
apt install -y redis-server

print_header "STEP 2: CONFIGURE REDIS"

# Create optimized Redis configuration
print_status "Creating optimized Redis configuration..."
cat > /etc/redis/redis.conf << 'EOF'
# Redis configuration for Shithaa E-commerce
bind 127.0.0.1
port 6379
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
EOF

print_header "STEP 3: START REDIS SERVICE"

# Start and enable Redis
print_status "Starting Redis service..."
systemctl start redis-server
systemctl enable redis-server

# Check Redis status
if systemctl is-active --quiet redis-server; then
    print_status "✅ Redis is running successfully"
else
    print_error "❌ Redis failed to start"
    exit 1
fi

print_header "STEP 4: TEST REDIS CONNECTION"

# Test Redis connection
print_status "Testing Redis connection..."
if redis-cli ping | grep -q "PONG"; then
    print_status "✅ Redis connection test successful"
else
    print_error "❌ Redis connection test failed"
    exit 1
fi

print_header "STEP 5: INSTALL NODE.JS REDIS DEPENDENCIES"

# Navigate to backend directory
cd /var/www/shithaa-ecom/backend

# Install Redis dependencies
print_status "Installing Redis dependencies..."
npm install redis ioredis

print_status "✅ Redis dependencies installed"

print_header "STEP 6: UPDATE ENVIRONMENT VARIABLES"

# Update .env file with Redis configuration
print_status "Updating environment variables..."
if [ -f ".env" ]; then
    # Add Redis configuration if not already present
    if ! grep -q "REDIS_HOST" .env; then
        cat >> .env << 'EOF'

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
        print_status "✅ Redis environment variables added"
    else
        print_status "✅ Redis environment variables already present"
    fi
else
    print_warning "⚠️ .env file not found. Please create it manually."
fi

print_header "STEP 7: RESTART BACKEND SERVICES"

# Restart PM2 processes
print_status "Restarting backend services..."
pm2 restart shithaa-backend

# Wait for restart
sleep 5

# Check if backend is healthy
print_status "Checking backend health..."
if curl -s http://localhost:4000/api/health | grep -q "redis.*connected"; then
    print_status "✅ Backend is healthy with Redis connection"
else
    print_warning "⚠️ Backend may not be fully ready yet"
fi

print_header "REDIS DEPLOYMENT COMPLETE! 🎉"

print_status "Redis has been successfully deployed and configured!"
print_status "Configuration file: /etc/redis/redis.conf"
print_status "Log file: /var/log/redis/redis-server.log"

print_status "Useful commands:"
echo "  systemctl status redis-server    - Check Redis status"
echo "  redis-cli ping                   - Test Redis connection"
echo "  redis-cli info                   - Get Redis information"
echo "  pm2 logs shithaa-backend         - Check backend logs"

print_status "Redis is now ready for Shithaa E-commerce! 🚀"

# Test Redis with sample data
print_status "Testing Redis with sample data..."
redis-cli set "test:shithaa" "Redis is working!" EX 60
redis-cli get "test:shithaa"
redis-cli del "test:shithaa"

print_status "Redis deployment completed successfully! 🎉"
