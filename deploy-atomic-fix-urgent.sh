#!/bin/bash

# URGENT: Deploy atomic stock operations fix to production
# This fixes the MongoDB array filter error causing payment confirmations to fail

echo "🚨 URGENT: Deploying atomic stock operations fix..."
echo "This fixes: MongoServerError: Expected a single top-level field name, found 'reserved' and 'availableStock'"

# SSH into VPS and deploy
ssh root@srv900106 << 'EOF'
  echo "📦 Navigating to project directory..."
  cd /var/www/shithaa-ecom
  
  echo "📥 Pulling latest changes from develop branch..."
  git fetch origin
  git pull origin develop
  
  echo "✅ Changes pulled successfully"
  
  echo "🧪 Running verification test..."
  node test-atomic-fix-production.js
  
  if [ $? -eq 0 ]; then
    echo "✅ Verification test passed!"
  else
    echo "❌ Verification test failed! Aborting deployment."
    exit 1
  fi
  
  echo "🔄 Restarting backend service..."
  pm2 restart shithaa-backend
  
  echo "✅ Backend restarted"
  
  echo "📊 Checking PM2 status..."
  pm2 status
  
  echo ""
  echo "✅ Deployment complete!"
  echo "The atomic stock operations fix has been deployed."
  echo "Payment confirmations should now work correctly."
  
  echo ""
  echo "📋 Monitoring tips:"
  echo "   Watch logs: pm2 logs shithaa-backend --lines 100"
  echo "   Check for errors: pm2 logs shithaa-backend --err --lines 50"
  echo "   Monitor payments: grep 'STOCK:CONFIRM:ATOMIC' ~/.pm2/logs/shithaa-backend-out.log | tail -20"
EOF

echo ""
echo "✅ Deployment script completed"

