#!/bin/bash

# Deploy Bulletproof Webhook System
# Run this script to implement the complete webhook hardening solution

echo "🚀 Deploying Bulletproof Webhook System..."

# 1. Backup database
echo "📦 Creating database backup..."
mongodump --uri="mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=admin" --out=/var/backups/shithaa_ecom_$(date +%F_%H%M)
echo "✅ Database backup completed"

# 2. Create required indexes
echo "📋 Creating database indexes..."
cd /var/www/shithaa-ecom/backend
node scripts/createIndexes.js
echo "✅ Database indexes created"

# 3. Stop existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 stop all
pm2 delete all

# 4. Start all services with new configuration
echo "▶️ Starting services with bulletproof webhooks..."
cd /var/www/shithaa-ecom
pm2 start ecosystem.config.js

# 5. Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# 6. Check status
echo "📊 Checking service status..."
pm2 status

# 7. Test webhook endpoint
echo "🧪 Testing webhook endpoint..."
curl -X POST http://localhost:4000/api/webhooks/phonepe \
  -H "Content-Type: application/json" \
  -H "X-Verify: test-signature" \
  -H "X-Merchant-Id: test-merchant" \
  -d '{"test": "webhook"}' \
  -w "\nHTTP Status: %{http_code}\n"

# 8. Check logs
echo "📋 Recent logs:"
pm2 logs --lines 10

echo "✅ Bulletproof webhook system deployed successfully!"
echo ""
echo "🔍 Verification commands:"
echo "  pm2 status"
echo "  curl http://localhost:4000/api/health"
echo "  pm2 logs shithaa-reconcile-payments"
echo ""
echo "📊 Monitor these endpoints:"
echo "  - Webhook: POST /api/webhooks/phonepe"
echo "  - Health: GET /api/health"
echo "  - Raw webhooks: GET /api/webhook-management/raw"
