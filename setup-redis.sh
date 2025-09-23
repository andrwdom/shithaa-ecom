#!/bin/bash

# ========================================
# REDIS INSTALLATION AND SETUP SCRIPT
# ========================================
# Install and configure Redis for Shithaa E-commerce

set -e  # Exit on any error

echo "🚀 Starting Redis Installation and Setup..."

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
    print_error "Please run as root: sudo bash setup-redis.sh"
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

# Backup original config
print_status "Backing up original Redis configuration..."
cp /etc/redis/redis.conf /etc/redis/redis.conf.backup

# Configure Redis for production
print_status "Configuring Redis for production..."

# Create optimized Redis configuration
cat > /etc/redis/redis.conf << 'EOF'
# Redis configuration for Shithaa E-commerce
# Optimized for high-performance caching

# Network
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 300

# General
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log

# Memory management
maxmemory 512mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Append only file
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Security
# requirepass your_redis_password_here
# Uncomment and set a strong password for production

# Performance
tcp-backlog 511
databases 16
always-show-logo yes

# Slow log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Latency monitoring
latency-monitor-threshold 100

# Client management
maxclients 10000

# Memory optimization
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
hll-sparse-max-bytes 3000
stream-node-max-bytes 4096
stream-node-max-entries 100
activerehashing yes
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
hz 10
dynamic-hz yes
aof-rewrite-incremental-fsync yes
rdb-save-incremental-fsync yes
EOF

print_header "STEP 3: SECURE REDIS"

# Set Redis password (optional but recommended)
print_warning "Setting up Redis security..."
read -p "Do you want to set a Redis password? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -s -p "Enter Redis password: " redis_password
    echo
    if [ ! -z "$redis_password" ]; then
        # Update config with password
        sed -i "s/# requirepass your_redis_password_here/requirepass $redis_password/" /etc/redis/redis.conf
        print_status "Redis password set successfully"
    fi
fi

print_header "STEP 4: START REDIS SERVICE"

# Start and enable Redis
print_status "Starting Redis service..."
systemctl start redis-server
systemctl enable redis-server

# Check Redis status
print_status "Checking Redis status..."
if systemctl is-active --quiet redis-server; then
    print_status "✅ Redis is running successfully"
else
    print_error "❌ Redis failed to start"
    exit 1
fi

print_header "STEP 5: TEST REDIS CONNECTION"

# Test Redis connection
print_status "Testing Redis connection..."
redis-cli ping

if [ $? -eq 0 ]; then
    print_status "✅ Redis connection test successful"
else
    print_error "❌ Redis connection test failed"
    exit 1
fi

print_header "STEP 6: OPTIMIZE SYSTEM FOR REDIS"

# Optimize system settings for Redis
print_status "Optimizing system settings for Redis..."

# Increase file descriptor limits
echo "redis soft nofile 65535" >> /etc/security/limits.conf
echo "redis hard nofile 65535" >> /etc/security/limits.conf

# Optimize kernel parameters
cat >> /etc/sysctl.conf << 'EOF'
# Redis optimizations
vm.overcommit_memory = 1
net.core.somaxconn = 65535
EOF

# Apply sysctl changes
sysctl -p

print_header "STEP 7: CREATE REDIS MONITORING SCRIPT"

# Create Redis monitoring script
cat > /usr/local/bin/redis-monitor.sh << 'EOF'
#!/bin/bash
# Redis monitoring script for Shithaa E-commerce

echo "=== Redis Status ==="
systemctl status redis-server --no-pager

echo -e "\n=== Redis Memory Usage ==="
redis-cli info memory | grep -E "(used_memory_human|maxmemory_human|mem_fragmentation_ratio)"

echo -e "\n=== Redis Stats ==="
redis-cli info stats | grep -E "(total_connections_received|total_commands_processed|instantaneous_ops_per_sec|keyspace_hits|keyspace_misses)"

echo -e "\n=== Redis Keys ==="
redis-cli dbsize

echo -e "\n=== Redis Clients ==="
redis-cli client list | wc -l
echo "Active clients: $(redis-cli client list | wc -l)"
EOF

chmod +x /usr/local/bin/redis-monitor.sh

print_header "STEP 8: SETUP LOG ROTATION"

# Setup log rotation for Redis
cat > /etc/logrotate.d/redis << 'EOF'
/var/log/redis/redis-server.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 redis redis
    postrotate
        systemctl reload redis-server > /dev/null 2>&1 || true
    endscript
}
EOF

print_header "REDIS SETUP COMPLETE! 🎉"

print_status "Redis has been successfully installed and configured!"
print_status "Configuration file: /etc/redis/redis.conf"
print_status "Log file: /var/log/redis/redis-server.log"
print_status "Data directory: /var/lib/redis"

print_status "Useful commands:"
echo "  systemctl status redis-server    - Check Redis status"
echo "  systemctl restart redis-server   - Restart Redis"
echo "  redis-cli ping                   - Test Redis connection"
echo "  redis-cli info                   - Get Redis information"
echo "  redis-monitor.sh                 - Monitor Redis performance"

print_status "Redis is now ready for Shithaa E-commerce! 🚀"

# Test Redis with a simple operation
print_status "Testing Redis with sample data..."
redis-cli set "test:shithaa" "Redis is working!" EX 60
redis-cli get "test:shithaa"
redis-cli del "test:shithaa"

print_status "Redis setup completed successfully! 🎉"
