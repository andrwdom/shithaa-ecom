# 🚀 Reservation System Deployment Checklist

## Pre-Deployment
- [ ] **Database Backup**: `mongodump --uri="$MONGODB_URI" --out=./backups/pre-reservation-$(date +%F-%T)`
- [ ] **Environment Variables**: Add `RESERVATION_ENABLED=true` to `.env`
- [ ] **MongoDB Replica Set**: Ensure replica set is configured and running

## Deployment Steps
- [ ] **Apply Patch**: `git apply reservation-checkout-patch.diff`
- [ ] **Install Dependencies**: `cd backend && npm install`
- [ ] **Restart Server**: `pm2 restart all` or `npm run start`
- [ ] **Start Worker**: `node workers/releaseReservations.js` or add to PM2

## Post-Deployment Testing
- [ ] **Health Check**: Verify `/api/health` endpoint responds
- [ ] **Single Test**: `node scripts/concurrency-test.js single`
- [ ] **Concurrency Test**: `node scripts/concurrency-test.js concurrent`
- [ ] **API Endpoints**: Test reservation creation, retrieval, and cancellation

## Monitoring
- [ ] **Worker Logs**: Check reservation worker is running and processing
- [ ] **Database**: Monitor reservation collection growth
- [ ] **Performance**: Watch response times for reservation endpoints
- [ ] **Errors**: Monitor for any reservation-related errors

## Rollback Plan
- [ ] **Revert Patch**: `git apply -R reservation-checkout-patch.diff`
- [ ] **Restore Database**: `mongorestore --uri="$MONGODB_URI" ./backups/pre-reservation-*`
- [ ] **Restart Services**: `pm2 restart all`

## Environment Variables Required
```bash
RESERVATION_ENABLED=true
MONGODB_URI=mongodb://localhost:27017/shithaa?replicaSet=rs0
PHONEPE_WEBHOOK_SECRET=your_secret_here  # Optional
```

## Quick Test Commands
```bash
# Test reservation creation
curl -X POST http://localhost:5000/api/checkout/reserve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userId":"test","items":[{"productId":"test","qty":1,"size":"M"}],"idempotencyKey":"test123"}'

# Test webhook
curl -X POST http://localhost:5000/api/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{"reservationId":"RESERVATION_ID","paymentStatus":"SUCCESS"}'

# Run concurrency test
cd backend && node scripts/concurrency-test.js concurrent
```
