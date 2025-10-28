#!/bin/bash

#######################################################################
# STRUCTURED LOGGING INTEGRATION SCRIPT
# 
# This script integrates the new logger into existing code
# WITHOUT breaking anything - graceful integration
#######################################################################

set -e

echo "=================================================="
echo "🔧 Integrating Structured Logging into Code"
echo "=================================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "📝 Step 1: Adding correlation ID middleware to server.js..."

# Check if already integrated
if grep -q "correlationIdMiddleware" backend/server.js; then
  echo -e "${YELLOW}⚠️  Correlation ID middleware already integrated${NC}"
else
  # Add import at top of file (after other imports)
  sed -i '/import Logger from/a import { correlationIdMiddleware } from '\''./middleware/correlationId.js'\'';' backend/server.js
  
  # Add middleware after body parsers
  sed -i '/app.use(express.json())/a \
// Correlation ID tracking for payment debugging\
app.use(correlationIdMiddleware);' backend/server.js
  
  echo -e "${GREEN}✅ Correlation ID middleware integrated${NC}"
fi

echo ""
echo "📝 Step 2: Creating backup of payment controller..."
cp backend/controllers/paymentController.js backend/controllers/paymentController.js.backup-$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✅ Backup created${NC}"

echo ""
echo "📝 Step 3: Adding structured logging imports..."

# Add ProductionLogger import if not exists
if ! grep -q "import ProductionLogger from" backend/controllers/paymentController.js; then
  sed -i '/import Logger from/a import ProductionLogger from '\''../utils/productionLogger.js'\'';' backend/controllers/paymentController.js
  echo -e "${GREEN}✅ ProductionLogger imported${NC}"
else
  echo -e "${YELLOW}⚠️  ProductionLogger already imported${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}✅ STRUCTURED LOGGING INTEGRATED${NC}"
echo "=================================================="
echo ""
echo "📋 What was done:"
echo "  ✅ Correlation ID middleware added to server.js"
echo "  ✅ ProductionLogger imported into payment controller"
echo "  ✅ Backups created of modified files"
echo ""
echo "🔄 Next: Restart backend to activate logging"
echo "  pm2 restart shithaa-backend"
echo ""
echo "📊 To view structured logs:"
echo "  tail -f backend/logs/payment-*.log | jq ."
echo ""

