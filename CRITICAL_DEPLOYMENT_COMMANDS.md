# 🚨 CRITICAL DEPLOYMENT COMMANDS

## **IMMEDIATE SAFETY NET (Run These Now)**

### 1. Backup Database
```bash
cd /var/www/shithaa-ecom
mongodump --uri="mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=admin" --out=/var/backups/shithaa_ecom_$(date +%F_%H%M)
```

### 2. Create Critical Indexes
```bash
cd /var/www/shithaa-ecom/backend
node scripts/createIndexes.js
```

### 3. Deploy Bulletproof Webhooks
```bash
cd /var/www/shithaa-ecom
chmod +x deploy-bulletproof-webhooks.sh
./deploy-bulletproof-webhooks.sh
```

## **VERIFICATION COMMANDS**

### Check All Services
```bash
pm2 status
pm2 logs --lines 10
```

### Test Webhook Endpoint
```bash
curl -X POST http://localhost:4000/api/webhooks/phonepe \
  -H "Content-Type: application/json" \
  -H "X-Verify: test-signature" \
  -H "X-Merchant-Id: test-merchant" \
  -d '{"test": "webhook"}' \
  -w "\nHTTP Status: %{http_code}\n"
```

### Test Health Endpoint
```bash
curl http://localhost:4000/api/health
```

### Check Database Indexes
```bash
mongo "mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=admin" --eval "db.processedevent.getIndexes()"
```

## **MONITORING SETUP**

### Check Webhook Health
```bash
cd /var/www/shithaa-ecom/backend
node -e "
import('./utils/monitoringAlerts.js').then(async (module) => {
  const alerts = await module.runHealthCheck();
  console.log('Alerts:', alerts);
});
"
```

### Check Raw Webhooks
```bash
mongo "mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=admin" --eval "db.rawwebhook.find().sort({receivedAt:-1}).limit(5).pretty()"
```

### Check Processed Events
```bash
mongo "mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=admin" --eval "db.processedevent.find().sort({processedAt:-1}).limit(5).pretty()"
```

## **ROLLBACK COMMANDS (If Needed)**

### Stop All Services
```bash
pm2 stop all
pm2 delete all
```

### Restore from Backup
```bash
mongorestore --uri="mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=admin" /var/backups/shithaa_ecom_[BACKUP_DATE]
```

### Restart Original Services
```bash
cd /var/www/shithaa-ecom
pm2 start ecosystem.config.js
```

## **KEY ENDPOINTS TO MONITOR**

- **Webhook**: `POST /api/webhooks/phonepe`
- **Health**: `GET /api/health`
- **Raw Webhooks**: `GET /api/webhook-management/raw`
- **Orders**: `GET /api/orders`

## **ALERT CONDITIONS TO WATCH**

1. **Webhook backlog > 10** in 10 minutes
2. **Failure rate > 20%** in 1 hour
3. **Stuck webhooks > 0** (processing > 30 minutes)
4. **Old draft orders > 5** (older than 1 hour)
5. **Refunds > 3** in 1 hour

## **SUCCESS INDICATORS**

✅ All PM2 processes online  
✅ Webhook endpoint returns 200  
✅ Health endpoint returns 200  
✅ No webhook backlog  
✅ Reconcile job running every 5 minutes  
✅ Database indexes created  
✅ Raw webhooks being stored  
✅ Orders being finalized on webhook success  

## **NEXT STEPS AFTER DEPLOYMENT**

1. **Monitor for 2 hours** - Watch logs and alerts
2. **Test payment flow** - Make a test purchase
3. **Verify webhook processing** - Check raw webhooks and processed events
4. **Set up external monitoring** - Configure Slack/email alerts
5. **Performance test** - Run k6 load tests
6. **Documentation** - Update API docs with new webhook endpoints
