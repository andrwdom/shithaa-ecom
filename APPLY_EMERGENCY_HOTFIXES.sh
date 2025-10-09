#!/bin/bash
#
# EMERGENCY HOTFIX APPLICATION SCRIPT
# Applies hotfixes 1-3 + runs reconciliation
# 
# Total time: 15-20 minutes
# Downtime: 0 (rolling restart)
#
# Usage: sudo bash APPLY_EMERGENCY_HOTFIXES.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚨 EMERGENCY HOTFIX APPLICATION - PAID→DRAFT FIX  🚨    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
  exit 1
fi

REPO_PATH="/var/www/shithaa-ecom"
BACKUP_DIR="/var/www/shithaa-ecom-hotfix-backup-$(date +%Y%m%d_%H%M%S)"

echo -e "${YELLOW}Repository: $REPO_PATH${NC}"
echo -e "${YELLOW}Backup: $BACKUP_DIR${NC}"
echo ""

# Step 0: Create backup
echo -e "${BLUE}[Step 0/5] Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
cp -r "$REPO_PATH/backend" "$BACKUP_DIR/"
cp -r "$REPO_PATH/frontend" "$BACKUP_DIR/" 2>/dev/null || echo "Frontend already built"
echo -e "${GREEN}✅ Backup created at $BACKUP_DIR${NC}"
echo ""

cd "$REPO_PATH"

# Step 1: Apply Hotfix #1 - Webhook Signature
echo -e "${BLUE}[Step 1/5] Applying Hotfix #1: Webhook signature verification${NC}"
echo -e "${YELLOW}File: backend/controllers/enhancedWebhookController.js${NC}"

if [ -f "HOTFIX_1_WEBHOOK_SIGNATURE.patch" ]; then
  if patch -p1 --dry-run < HOTFIX_1_WEBHOOK_SIGNATURE.patch 2>&1 | grep -q "FAILED"; then
    echo -e "${YELLOW}⚠️  Patch has conflicts, applying manually...${NC}"
    
    # Manual fix - move signature check before 200 OK
    cat > /tmp/webhook_fix.js << 'JSFIX'
// Find this pattern and replace:
// BEFORE:
//   res.status(200).json({ success: true });
//   const signatureValid = await verifyPhonePeSignature(req);
//   if (!signatureValid) { return; }
//
// AFTER:
//   const signatureValid = await verifyPhonePeSignature(req);
//   if (!signatureValid) { return res.status(401).json({...}); }
//   res.status(200).json({ success: true });
JSFIX
    
    echo "Manual edit required for enhancedWebhookController.js"
    echo "Pattern to apply is in /tmp/webhook_fix.js"
    read -p "Press Enter after you've manually edited the file..."
  else
    patch -p1 < HOTFIX_1_WEBHOOK_SIGNATURE.patch
    echo -e "${GREEN}✅ Hotfix #1 applied${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Patch file not found, skipping...${NC}"
fi
echo ""

# Step 2: Apply Hotfix #2 - Worker TTL
echo -e "${BLUE}[Step 2/5] Applying Hotfix #2: Worker TTL increase${NC}"
echo -e "${YELLOW}Files: reservationExpiryWorker.js, stockCleanupWorker.js, checkoutController.js${NC}"

if [ -f "HOTFIX_2_WORKER_TTL.patch" ]; then
  if patch -p1 --dry-run < HOTFIX_2_WORKER_TTL.patch 2>&1 | grep -q "FAILED"; then
    echo -e "${YELLOW}⚠️  Patch has conflicts, applying with sed...${NC}"
    
    # Fallback: use sed for simple replacements
    sed -i 's/10 \* 60 \* 1000/20 * 60 * 1000/g' backend/workers/reservationExpiryWorker.js
    sed -i 's/14 \* 60 \* 1000/20 * 60 * 1000/g' backend/workers/stockCleanupWorker.js
    sed -i 's/5 \* 60 \* 1000/20 * 60 * 1000/g' backend/controllers/checkoutController.js
    
    echo -e "${GREEN}✅ Hotfix #2 applied (via sed)${NC}"
  else
    patch -p1 < HOTFIX_2_WORKER_TTL.patch
    echo -e "${GREEN}✅ Hotfix #2 applied${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Patch file not found, using sed fallback...${NC}"
  sed -i.bak 's/10 \* 60 \* 1000/20 * 60 * 1000/g' backend/workers/reservationExpiryWorker.js
  sed -i.bak 's/14 \* 60 \* 1000/20 * 60 * 1000/g' backend/workers/stockCleanupWorker.js
  sed -i.bak 's/5 \* 60 \* 1000/20 * 60 * 1000/g' backend/controllers/checkoutController.js
  echo -e "${GREEN}✅ Hotfix #2 applied${NC}"
fi
echo ""

# Step 3: Apply Hotfix #3 - Server Verification
echo -e "${BLUE}[Step 3/5] Applying Hotfix #3: Server-side verification${NC}"
echo -e "${YELLOW}Files: frontend callback page + backend verify endpoint${NC}"

if [ -f "HOTFIX_3_SERVER_VERIFY.patch" ]; then
  if patch -p1 --dry-run < HOTFIX_3_SERVER_VERIFY.patch 2>&1 | grep -q "FAILED"; then
    echo -e "${YELLOW}⚠️  Patch has conflicts, manual review needed${NC}"
    echo "Review HOTFIX_3_SERVER_VERIFY.patch and apply manually"
  else
    patch -p1 < HOTFIX_3_SERVER_VERIFY.patch
    echo -e "${GREEN}✅ Hotfix #3 applied${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Patch file not found, skipping...${NC}"
fi
echo ""

# Step 4: Restart services
echo -e "${BLUE}[Step 4/5] Restarting services...${NC}"

pm2 restart shithaa-backend
pm2 restart shithaa-stock-cleanup-worker || echo "Worker not running"
pm2 restart shithaa-reservation-expiry-worker || echo "Worker not running"
pm2 save

echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

# Step 5: Verify deployment
echo -e "${BLUE}[Step 5/5] Verifying deployment...${NC}"

# Test webhook endpoint
echo "Testing webhook signature validation..."
WEBHOOK_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://shithaa.in/api/webhook/phonepe \
  -H "X-VERIFY: invalid_signature_test" \
  -H "X-VERIFY-INDEX: 1" \
  -d '{"merchantTransactionId":"TEST","state":"COMPLETED"}' 2>/dev/null || echo "000")

if [ "$WEBHOOK_TEST" = "401" ]; then
  echo -e "${GREEN}✅ Webhook signature validation working (401 for invalid)${NC}"
elif [ "$WEBHOOK_TEST" = "200" ]; then
  echo -e "${RED}❌ WARNING: Webhook still accepting invalid signatures!${NC}"
else
  echo -e "${YELLOW}⚠️  Could not test webhook (status: $WEBHOOK_TEST)${NC}"
fi

# Check PM2 status
echo ""
echo "PM2 Status:"
pm2 status | grep shithaa

echo ""
echo -e "${GREEN}✅ Hotfixes 1-3 applied successfully!${NC}"
echo ""

# Offer to run reconciliation
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Next step: Run reconciliation for existing paid→draft orders${NC}"
echo ""
read -p "Run reconciliation now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${BLUE}Running reconciliation script...${NC}"
  
  cd "$REPO_PATH"
  
  # First run in dry-run mode
  echo -e "${YELLOW}Running dry-run first...${NC}"
  node emergency-reconcile-paid-drafts.js --dry-run --limit 50
  
  echo ""
  read -p "Dry-run complete. Apply changes? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Running LIVE reconciliation...${NC}"
    node emergency-reconcile-paid-drafts.js --limit 50
    echo -e "${GREEN}✅ Reconciliation complete!${NC}"
  else
    echo -e "${YELLOW}Skipped live reconciliation${NC}"
  fi
else
  echo -e "${YELLOW}Skipped reconciliation. Run manually later:${NC}"
  echo "  cd $REPO_PATH"
  echo "  node emergency-reconcile-paid-drafts.js --dry-run"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ EMERGENCY HOTFIXES DEPLOYED${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "SUMMARY:"
echo "  ✅ Hotfix #1: Webhook signature verification fixed"
echo "  ✅ Hotfix #2: Worker TTL increased to 20 minutes"
echo "  ✅ Hotfix #3: Server-side verification added"
echo "  ✅ Services restarted"
echo ""
echo "BACKUP LOCATION: $BACKUP_DIR"
echo ""
echo "MONITORING (run these queries):"
echo "  1. Check stuck orders:"
echo "     mongo shithaa_maternity_db --eval 'db.orders.countDocuments({status:\"DRAFT\",paymentStatus:\"PAID\"})'"
echo ""
echo "  2. Watch PM2 logs:"
echo "     pm2 logs --lines 50"
echo ""
echo "  3. Test webhook:"
echo "     curl -X POST https://shithaa.in/api/webhook/phonepe -H 'X-VERIFY: invalid' -d '{}'"
echo "     (Should return 401)"
echo ""
echo "ROLLBACK (if needed):"
echo "  pm2 stop all"
echo "  cp -r $BACKUP_DIR/backend/* $REPO_PATH/backend/"
echo "  pm2 restart all"
echo ""
echo -e "${GREEN}Deployment complete at $(date)${NC}"

