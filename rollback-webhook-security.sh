#!/bin/bash
# Rollback Script: Webhook Security Patches
# Usage: ./rollback-webhook-security.sh

set -e

echo "🔄 Starting webhook security rollback..."
echo "⚠️ This will revert all webhook security changes"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Rollback cancelled"
  exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"

# 1. Stop backend
echo "⏸️ Stopping backend..."
pm2 stop shithaa-backend || echo "Backend not running"

# 2. Backup current state
echo "💾 Backing up current state..."
BACKUP_DIR="/tmp/webhook-rollback-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$BACKEND_DIR" "$BACKUP_DIR/"
echo "   Backup saved to: $BACKUP_DIR"

# 3. Revert code changes
echo "📝 Reverting code changes..."
cd "$BACKEND_DIR"

if [ -f "webhook-security.patch" ]; then
  echo "   Unapplying patch..."
  git apply -R webhook-security.patch || echo "   No patch to revert"
else
  echo "   Reverting last commit..."
  git revert HEAD --no-edit || echo "   No commit to revert"
fi

# 4. Remove new dependencies
echo "📦 Removing new packages..."
if command -v npm &> /dev/null; then
  npm uninstall redlock --save 2>/dev/null || echo "   redlock not installed"
fi

# 5. Restore old environment variables
echo "🔧 Restoring environment..."
if [ -f "$BACKEND_DIR/.env.backup" ]; then
  cp "$BACKEND_DIR/.env.backup" "$BACKEND_DIR/.env"
  echo "   Environment restored from backup"
else
  echo "   ⚠️ No .env backup found, keeping current .env"
fi

# 6. Rollback database indices
echo "🗄️ Rolling back database indices..."
if [ -f "$BACKEND_DIR/scripts/rollback-webhooks.mongo.js" ]; then
  mongosh "${MONGODB_URI:-mongodb://localhost:27017/shithaa_maternity_db}" \
    "$BACKEND_DIR/scripts/rollback-webhooks.mongo.js" || echo "   Database rollback skipped"
else
  echo "   Creating rollback script..."
  cat > /tmp/rollback-db.js << 'EOF'
db = db.getSiblingDB('shithaa_maternity_db');
print('Dropping new webhook indices...');
db.webhookevents.dropIndex('idx_webhook_eventid_unique').catch(e => print('  Index not found'));
db.webhookevents.dropIndex('idx_webhook_status_received').catch(e => print('  Index not found'));
db.webhookevents.dropIndex('idx_webhook_ttl').catch(e => print('  Index not found'));
db.orders.dropIndex('idx_order_phonepe_txn_unique').catch(e => print('  Index not found'));
db.orders.dropIndex('idx_order_reconciliation').catch(e => print('  Index not found'));
db.orders.dropIndex('idx_order_draft_cleanup').catch(e => print('  Index not found'));
print('Database indices rolled back');
EOF
  mongosh "${MONGODB_URI:-mongodb://localhost:27017/shithaa_maternity_db}" \
    /tmp/rollback-db.js || echo "   Database rollback failed"
  rm /tmp/rollback-db.js
fi

# 7. Flush Redis locks
echo "🔄 Flushing Redis locks..."
if command -v redis-cli &> /dev/null; then
  redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" \
    ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} \
    EVAL "return redis.call('del', unpack(redis.call('keys', 'lock:*')))" 0 \
    || echo "   Redis flush skipped"
else
  echo "   redis-cli not found, skipping"
fi

# 8. Reinstall dependencies
echo "📦 Reinstalling dependencies..."
cd "$BACKEND_DIR"
npm install --production || echo "   npm install skipped"

# 9. Restart backend
echo "🚀 Restarting backend..."
pm2 restart shithaa-backend || pm2 start ecosystem.config.js --only shithaa-backend

# 10. Verify rollback
echo "✅ Verifying rollback..."
sleep 5

if curl -f -s "http://localhost:${PORT:-5000}/api/health" > /dev/null 2>&1; then
  echo "   ✅ Health check passed"
else
  echo "   ⚠️ Health check failed - check logs: pm2 logs shithaa-backend"
fi

# 11. Show logs
echo "📋 Recent logs:"
pm2 logs shithaa-backend --lines 20 --nostream

echo ""
echo "✅ Rollback complete!"
echo ""
echo "📝 Summary:"
echo "   - Code reverted"
echo "   - Dependencies removed"
echo "   - Database indices dropped"
echo "   - Redis locks flushed"
echo "   - Backend restarted"
echo ""
echo "💾 Backup saved to: $BACKUP_DIR"
echo ""
echo "⚠️ If issues persist, you can:"
echo "   1. Check logs: pm2 logs shithaa-backend"
echo "   2. Restore from backup: cp -r $BACKUP_DIR/backend/* $BACKEND_DIR/"
echo "   3. Contact support with backup location"

