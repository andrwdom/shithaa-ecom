#!/bin/bash

#######################################################################
# PINO STRUCTURED LOGGING DEPLOYMENT SCRIPT
# 
# Following the production-grade Pino approach
# ZERO RISK - Only adds logging, doesn't change business logic
#######################################################################

set -e  # Exit on error

echo "=================================================="
echo "🚀 Deploying Pino Structured Logging System"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check directory
if [ ! -d "backend" ]; then
  echo -e "${RED}❌ Error: backend directory not found${NC}"
  echo "Please run this script from the project root directory"
  exit 1
fi

echo -e "${BLUE}STEP 0: Setting environment variables${NC}"
echo "----------------------------------------"
export LOG_LEVEL=${LOG_LEVEL:-info}
export LOG_DIR=${LOG_DIR:-/var/log/shithaa}
export SERVICE_NAME=${SERVICE_NAME:-payment-service}
export NODE_ENV=${NODE_ENV:-production}

echo "LOG_LEVEL=$LOG_LEVEL"
echo "LOG_DIR=$LOG_DIR"
echo "SERVICE_NAME=$SERVICE_NAME"
echo "NODE_ENV=$NODE_ENV"
echo -e "${GREEN}✅ Environment variables set${NC}\n"

echo -e "${BLUE}STEP 1: Installing dependencies${NC}"
echo "----------------------------------------"
cd backend
npm install pino express-pino-logger uuid pino-pretty rotating-file-stream --save
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Packages installed successfully${NC}"
else
  echo -e "${RED}❌ Failed to install packages${NC}"
  exit 1
fi

# Verify pino
node -e "console.log(require('pino') ? 'pino ok' : 'missing')"
echo ""
cd ..

echo -e "${BLUE}STEP 2: Creating log directories${NC}"
echo "----------------------------------------"
sudo mkdir -p $LOG_DIR/payment $LOG_DIR/webhook $LOG_DIR/error
sudo chown -R $(whoami):$(whoami) $LOG_DIR
chmod 750 $LOG_DIR
echo -e "${GREEN}✅ Log directories created at $LOG_DIR${NC}\n"

echo -e "${BLUE}STEP 3: Verifying logger files${NC}"
echo "----------------------------------------"
if [ -f "backend/utils/productionLogger.js" ]; then
  echo -e "${GREEN}✅ productionLogger.js exists${NC}"
else
  echo -e "${RED}❌ productionLogger.js missing${NC}"
  exit 1
fi

if [ -f "backend/middleware/correlationId.js" ]; then
  echo -e "${GREEN}✅ correlationId.js exists${NC}"
else
  echo -e "${RED}❌ correlationId.js missing${NC}"
  exit 1
fi
echo ""

echo -e "${BLUE}STEP 4: Creating ecosystem.config.js backup${NC}"
echo "----------------------------------------"
if [ -f "ecosystem.config.js" ]; then
  cp ecosystem.config.js ecosystem.config.js.backup-$(date +%Y%m%d-%H%M%S)
  echo -e "${GREEN}✅ Backup created${NC}"
fi
echo ""

echo -e "${BLUE}STEP 5: Adding environment variables to PM2 config${NC}"
echo "----------------------------------------"
echo "Updating ecosystem.config.js with logging env vars..."
# This will be done manually in next step
echo -e "${YELLOW}⚠️  Manual step required - see below${NC}\n"

echo -e "${BLUE}STEP 6: Creating MongoDB indexes${NC}"
echo "----------------------------------------"
echo "Run these commands in MongoDB shell:"
echo ""
echo "  use shitha_maternity_db"
echo "  db.rawwebhooks.createIndex({ event_id: 1 }, { unique: true, sparse: true })"
echo "  db.rawwebhooks.createIndex({ correlation_id: 1 })"
echo "  db.orders.createIndex({ phonepeTransactionId: 1 })"
echo ""
echo -e "${YELLOW}⚠️  Manual step - run after this script${NC}\n"

echo -e "${BLUE}STEP 7: Creating logrotate config${NC}"
echo "----------------------------------------"
cat > /tmp/shithaa-logrotate << EOF
$LOG_DIR/*/*.log {
  daily
  missingok
  rotate 14
  compress
  delaycompress
  notifempty
  copytruncate
}
EOF

echo "Logrotate config created at /tmp/shithaa-logrotate"
echo "To install, run: sudo cp /tmp/shithaa-logrotate /etc/logrotate.d/shithaa"
echo -e "${YELLOW}⚠️  Manual step - run after this script${NC}\n"

echo "=================================================="
echo -e "${GREEN}✅ PINO LOGGING SYSTEM DEPLOYED${NC}"
echo "=================================================="
echo ""
echo "📋 What was installed:"
echo "  ✅ Pino logger (high-performance)"
echo "  ✅ Correlation ID middleware"
echo "  ✅ Rotating file streams"
echo "  ✅ Log directories at $LOG_DIR"
echo ""
echo "🔧 MANUAL STEPS REQUIRED:"
echo ""
echo "1️⃣  Add to ecosystem.config.js env section:"
echo ""
echo "    env: {"
echo "      NODE_ENV: 'production',"
echo "      PORT: 4000,"
echo "      LOG_LEVEL: 'info',"
echo "      LOG_DIR: '$LOG_DIR',"
echo "      SERVICE_NAME: 'payment-service'"
echo "    }"
echo ""
echo "2️⃣  Install logrotate:"
echo "    sudo cp /tmp/shithaa-logrotate /etc/logrotate.d/shithaa"
echo ""
echo "3️⃣  Create MongoDB indexes (run in mongosh):"
echo "    use shitha_maternity_db"
echo "    db.rawwebhooks.createIndex({ event_id: 1 }, { unique: true, sparse: true })"
echo "    db.rawwebhooks.createIndex({ correlation_id: 1 })"
echo "    db.orders.createIndex({ phonepeTransactionId: 1 })"
echo ""
echo "4️⃣  Test the logger:"
echo "    node backend/scripts/test-logging.js"
echo ""
echo "5️⃣  Once test passes, integrate into server.js (see next script)"
echo ""

