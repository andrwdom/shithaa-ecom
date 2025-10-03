#!/bin/bash

# Redis Distributed Locking Setup Script
# This script helps configure Redis for distributed webhook locking

echo "🔧 Setting up Redis for distributed webhook locking..."

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "❌ Redis is not installed. Please install Redis first:"
    echo "   Ubuntu/Debian: sudo apt-get install redis-server"
    echo "   CentOS/RHEL: sudo yum install redis"
    echo "   macOS: brew install redis"
    exit 1
fi

# Check if Redis is running
if ! redis-cli ping &> /dev/null; then
    echo "⚠️  Redis is not running. Starting Redis..."
    sudo systemctl start redis-server 2>/dev/null || sudo service redis start 2>/dev/null || redis-server --daemonize yes
    sleep 2
    
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis started successfully"
    else
        echo "❌ Failed to start Redis. Please start Redis manually."
        exit 1
    fi
else
    echo "✅ Redis is running"
fi

# Test Redis connection
echo "🔍 Testing Redis connection..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis connection test passed"
else
    echo "❌ Redis connection test failed"
    exit 1
fi

# Create Redis configuration for production
echo "📝 Creating Redis configuration for webhook locking..."

# Redis configuration for webhook locking
REDIS_CONFIG="
# Redis configuration for webhook distributed locking
# Add these settings to your redis.conf or environment variables

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence (optional for locks - can be disabled for better performance)
save 900 1
save 300 10
save 60 10000

# Network settings
timeout 300
tcp-keepalive 60

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Security (recommended for production)
# requirepass your_strong_password_here
"

echo "$REDIS_CONFIG" > redis-webhook-locks.conf
echo "✅ Redis configuration saved to redis-webhook-locks.conf"

# Environment variables setup
echo "🔧 Setting up environment variables..."

ENV_VARS="
# Redis configuration for webhook distributed locking
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
# REDIS_PASSWORD=your_strong_password_here

# Optional: Redis cluster configuration
# REDIS_CLUSTER_NODES=localhost:7000,localhost:7001,localhost:7002
"

echo "$ENV_VARS" >> .env.example
echo "✅ Environment variables added to .env.example"

# Test the locks utility
echo "🧪 Testing distributed locks utility..."
if node -e "
const { isRedisHealthy } = require('./utils/locks.js');
isRedisHealthy().then(healthy => {
  if (healthy) {
    console.log('✅ Distributed locks utility test passed');
    process.exit(0);
  } else {
    console.log('❌ Distributed locks utility test failed');
    process.exit(1);
  }
}).catch(err => {
  console.log('❌ Distributed locks utility test error:', err.message);
  process.exit(1);
});
" 2>/dev/null; then
    echo "✅ Distributed locks utility test passed"
else
    echo "⚠️  Distributed locks utility test failed - this is normal if dependencies aren't installed yet"
fi

echo ""
echo "🎉 Redis distributed locking setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy environment variables from .env.example to your .env file"
echo "2. Install npm dependencies: npm install ioredis redlock"
echo "3. Restart your application: pm2 reload ecosystem.config.js"
echo "4. Monitor Redis: redis-cli monitor"
echo ""
echo "🔍 Monitoring commands:"
echo "  - Check Redis status: redis-cli ping"
echo "  - Monitor Redis commands: redis-cli monitor"
echo "  - Check Redis info: redis-cli info"
echo "  - List active keys: redis-cli keys 'lock:*'"
echo ""
echo "⚠️  Security recommendations:"
echo "  - Set a strong Redis password in production"
echo "  - Configure Redis to only accept connections from localhost"
echo "  - Use Redis AUTH in production environments"
echo "  - Monitor Redis memory usage and set appropriate limits"
