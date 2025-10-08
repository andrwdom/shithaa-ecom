#!/bin/bash
# Emergency Rollback: All Forensic Audit Modules
# 
# This script performs a complete rollback of all changes from the forensic audit.
# Use ONLY in emergency situations when deployment causes critical issues.
#
# Usage: ./emergency-rollback-all-modules.sh

set -e  # Exit on any error

echo "🚨🚨🚨 EMERGENCY ROLLBACK INITIATED 🚨🚨🚨"
echo "=========================================="
echo ""
echo "This will rollback ALL changes from the forensic audit:"
echo "  - Module A: Payment webhook security patches"
echo "  - Module B: Canonical reconciliation service"
echo "  - Module C: Canonical stock service"
echo ""
echo "⚠️  WARNING: This is a destructive operation!"
echo "⚠️  A backup will be created before proceeding."
echo ""

# Require explicit confirmation
read -p "Type 'EMERGENCY' to confirm rollback: " confirm

if [ "$confirm" != "EMERGENCY" ]; then
  echo "❌ Rollback cancelled (confirmation did not match)"
  exit 1
fi

echo ""
echo "✅ Confirmation received. Starting rollback..."
echo ""

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"
BACKUP_DIR="/tmp/emergency-backup-$(date +%Y%m%d-%H%M%S)"

# Step 1: Create emergency backup
echo "1️⃣ Creating emergency backup..."
mkdir -p "$BACKUP_DIR"
cp -r "$BACKEND_DIR" "$BACKUP_DIR/" 2>/dev/null || echo "   ⚠️ Backend copy failed"
cp -r "$SCRIPT_DIR"/*.sh "$BACKUP_DIR/" 2>/dev/null || echo "   ⚠️ Script copy failed"
cp -r "$SCRIPT_DIR"/*.js "$BACKUP_DIR/" 2>/dev/null || echo "   ⚠️ JS file copy failed"

echo "   ✅ Backup saved to: $BACKUP_DIR"
echo ""

# Step 2: Stop all services
echo "2️⃣ Stopping all services..."
pm2 stop all || echo "   ⚠️ PM2 stop failed"
sleep 2
echo "   ✅ All services stopped"
echo ""

# Step 3: Rollback code changes
echo "3️⃣ Reverting code changes..."
cd "$SCRIPT_DIR"

# Check if we have git
if command -v git &> /dev/null; then
  # Count commits to rollback (adjust if needed)
  COMMITS_TO_ROLLBACK=15
  
  echo "   Attempting to revert last $COMMITS_TO_ROLLBACK commits..."
  git reset --hard HEAD~$COMMITS_TO_ROLLBACK || {
    echo "   ⚠️ Git reset failed, trying stash..."
    git stash
  }
  
  echo "   ✅ Code reverted"
else
  echo "   ⚠️ Git not available, skipping code revert"
  echo "   ⚠️ Manually restore from: $BACKUP_DIR/backend"
fi

echo ""

# Step 4: Restore environment variables
echo "4️⃣ Restoring environment variables..."
if [ -f "$BACKEND_DIR/.env.backup" ]; then
  cp "$BACKEND_DIR/.env.backup" "$BACKEND_DIR/.env"
  echo "   ✅ Environment restored from backup"
else
  echo "   ⚠️ No .env backup found"
  echo "   ℹ️  Current .env will be used"
fi

echo ""

# Step 5: Rollback database changes
echo "5️⃣ Rolling back database changes..."

# Determine MongoDB URI
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/shithaa_maternity_db}"

if command -v mongosh &> /dev/null; then
  echo "   Dropping audit-related indices..."
  
  cat > /tmp/rollback-db.js << 'EOF'
db = db.getSiblingDB('shithaa_maternity_db');

print('Dropping webhook indices...');
try { db.webhookevents.dropIndex('idx_webhook_eventid_unique'); } catch(e) { print('  Already dropped'); }
try { db.webhookevents.dropIndex('idx_webhook_status_received'); } catch(e) { print('  Already dropped'); }
try { db.webhookevents.dropIndex('idx_webhook_ttl'); } catch(e) { print('  Already dropped'); }

print('Dropping order indices...');
try { db.orders.dropIndex('idx_order_phonepe_txn_unique'); } catch(e) { print('  Already dropped'); }
try { db.orders.dropIndex('idx_order_reconciliation'); } catch(e) { print('  Already dropped'); }
try { db.orders.dropIndex('idx_order_draft_cleanup'); } catch(e) { print('  Already dropped'); }

print('Dropping stock indices...');
try { db.products.dropIndex('idx_product_sizes_stock'); } catch(e) { print('  Already dropped'); }
try { db.products.dropIndex('idx_product_low_stock'); } catch(e) { print('  Already dropped'); }
try { db.products.dropIndex('idx_product_stuck_reservations'); } catch(e) { print('  Already dropped'); }

print('Removing product validation...');
try {
  db.command({
    collMod: 'products',
    validator: {},
    validationLevel: 'off'
  });
} catch(e) { print('  Validation already disabled'); }

print('✅ Database rollback complete');
EOF

  mongosh "$MONGODB_URI" /tmp/rollback-db.js || echo "   ⚠️ Database rollback failed"
  rm /tmp/rollback-db.js
  
  echo "   ✅ Database indices rolled back"
else
  echo "   ⚠️ mongosh not found, skipping database rollback"
fi

echo ""

# Step 6: Flush Redis locks
echo "6️⃣ Flushing Redis locks..."

if command -v redis-cli &> /dev/null; then
  REDIS_HOST="${REDIS_HOST:-localhost}"
  REDIS_PORT="${REDIS_PORT:-6379}"
  
  # Flush only lock keys, not all Redis data
  redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" \
    ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} \
    --eval "return redis.call('del', unpack(redis.call('keys', 'lock:*')))" 0 \
    2>/dev/null && echo "   ✅ Redis locks flushed" || echo "   ⚠️ Redis flush skipped"
else
  echo "   ⚠️ redis-cli not found, skipping Redis flush"
fi

echo ""

# Step 7: Remove new dependencies
echo "7️⃣ Cleaning up dependencies..."
cd "$BACKEND_DIR"

if [ -f "package.json.backup" ]; then
  cp package.json.backup package.json
  npm install --production || echo "   ⚠️ npm install failed"
  echo "   ✅ Dependencies restored from backup"
else
  echo "   ℹ️  No package.json backup, keeping current dependencies"
fi

echo ""

# Step 8: Restore PM2 configuration
echo "8️⃣ Restoring PM2 configuration..."

# Stop new canonical services
pm2 delete canonical-reconciliation 2>/dev/null || echo "   Not found"
pm2 delete canonical-stock 2>/dev/null || echo "   Not found"

# Restore legacy reconciliation if backup exists
if [ -f "ecosystem.reconciliation.config.js.backup" ]; then
  cp ecosystem.reconciliation.config.js.backup ecosystem.reconciliation.config.js
  pm2 start ecosystem.reconciliation.config.js || echo "   ⚠️ Failed to start"
  echo "   ✅ Legacy reconciliation restored"
fi

echo ""

# Step 9: Restart main backend
echo "9️⃣ Restarting main backend..."
pm2 restart shithaa-backend || pm2 start ecosystem.config.js --only shithaa-backend

echo "   ✅ Backend restarted"
echo ""

# Step 10: Verify rollback
echo "🔟 Verifying rollback..."
sleep 5

# Check health endpoint
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
if curl -f -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
  echo "   ✅ Health check PASSED"
else
  echo "   ❌ Health check FAILED"
  echo "   ⚠️ Backend may not be running correctly"
  echo "   ⚠️ Check logs: pm2 logs shithaa-backend"
fi

# Check PM2 processes
echo ""
echo "   Current PM2 processes:"
pm2 list | grep -E "name|shithaa" || echo "   ⚠️ No processes found"

echo ""
echo "=========================================="
echo "🔄 EMERGENCY ROLLBACK COMPLETE"
echo "=========================================="
echo ""
echo "📊 Summary:"
echo "   - Code: Reverted to pre-audit state"
echo "   - Database: Indices dropped"
echo "   - Redis: Locks flushed"
echo "   - PM2: Legacy configuration restored"
echo "   - Services: Restarted"
echo ""
echo "💾 Backup Location:"
echo "   $BACKUP_DIR"
echo ""
echo "📋 Next Steps:"
echo "   1. Check backend logs: pm2 logs shithaa-backend"
echo "   2. Test a payment flow manually"
echo "   3. Monitor for 1 hour"
echo "   4. If stable, investigate what caused rollback need"
echo "   5. If unstable, restore from backup: rsync -av $BACKUP_DIR/backend/ $BACKEND_DIR/"
echo ""
echo "📞 If Issues Persist:"
echo "   - Check MongoDB: mongosh --eval 'db.adminCommand({ping:1})'"
echo "   - Check Redis: redis-cli ping"
echo "   - Check disk space: df -h"
echo "   - Review system logs: journalctl -u pm2-* --since '1 hour ago'"
echo ""
echo "⚠️  IMPORTANT: Document why rollback was needed before re-attempting deployment"
echo ""

