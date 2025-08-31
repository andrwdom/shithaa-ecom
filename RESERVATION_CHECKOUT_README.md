# Reservation-Based Checkout System

This document describes the implementation and deployment of a robust reservation-based checkout and webhook flow for the Shithaa e-commerce platform.

## 🏗️ System Architecture

The reservation system provides:
- **Stock Reservation**: Atomic stock reservation with MongoDB transactions
- **Idempotency**: Prevents duplicate reservations using unique keys
- **Payment Webhooks**: Secure webhook handling for payment confirmations
- **Automatic Expiration**: Worker process releases expired reservations
- **Fallback Support**: Graceful degradation when transactions unavailable

## 📁 Files Added/Modified

### New Files
- `backend/models/Reservation.js` - Reservation data model
- `backend/controllers/reservationController.js` - Reservation business logic
- `backend/routes/reservationRoute.js` - Reservation API endpoints
- `backend/routes/webhookRoute.js` - Payment webhook endpoints
- `backend/workers/releaseReservations.js` - Expiration cleanup worker
- `backend/scripts/concurrency-test.js` - Concurrency testing script
- `frontend/components/ReservationCheckout.js` - Frontend integration example

### Modified Files
- `backend/controllers/webhookController.js` - Enhanced with reservation webhook
- `backend/server.js` - Added new route registrations

## 🚀 Deployment Steps

### 1. Environment Configuration

Add these environment variables to your `.env` file:

```bash
# Enable reservation system
RESERVATION_ENABLED=true

# Webhook signature verification (optional)
PHONEPE_WEBHOOK_SECRET=your_webhook_secret_here

# MongoDB connection (ensure replica set for transactions)
MONGODB_URI=mongodb://localhost:27017/shithaa?replicaSet=rs0
```

### 2. MongoDB Replica Set Setup

**For Local Development:**
```bash
# Start MongoDB with replica set
mongod --replSet rs0 --port 27017

# In another terminal, initialize replica set
mongosh --eval "rs.initiate()"
```

**For Production VPS:**
```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf

# Add replication section:
replication:
  replSetName: "rs0"

# Restart MongoDB
sudo systemctl restart mongod

# Initialize replica set
mongosh --eval "rs.initiate()"
```

### 3. Database Backup (Before Deployment)

```bash
# Create backup before implementing changes
mongodump --uri="$MONGODB_URI" --out=./backups/pre-reservation-$(date +%F-%T)

# Verify backup
ls -la ./backups/
```

### 4. Deploy the Patch

```bash
# Apply the patch
git apply reservation-checkout-patch.diff

# Install dependencies (if needed)
cd backend && npm install

# Restart the server
pm2 restart all
# or
npm run start
```

### 5. Start the Reservation Worker

```bash
# Start worker manually
cd backend
node workers/releaseReservations.js

# Or add to PM2 ecosystem
pm2 start workers/releaseReservations.js --name "reservation-worker"

# Or set up cron job (every minute)
crontab -e
# Add: * * * * * cd /path/to/backend && node workers/releaseReservations.js
```

## 🧪 Testing

### 1. Basic Functionality Test

```bash
# Test single reservation
cd backend
node scripts/concurrency-test.js single

# Test concurrent reservations
node scripts/concurrency-test.js concurrent
```

### 2. Concurrency Test Configuration

Set environment variables for testing:

```bash
export TEST_BASE_URL="http://localhost:5000"
export TEST_AUTH_TOKEN="your-jwt-token-here"
export TEST_PRODUCT_ID="actual-product-id"
export TEST_SIZE="M"
export CONCURRENT_REQUESTS=20
export REQUEST_DELAY_MS=50
```

### 3. Expected Test Results

**Successful Test Output:**
```
🚀 Starting concurrency test for reservation system
============================================================
Base URL: http://localhost:5000
Concurrent requests: 20
Product ID: 507f1f77bcf86cd799439011
Size: M
User ID: 507f1f77bcf86cd799439012
============================================================

📊 Test Results:
============================================================
Total requests: 20
Successful: 20
Failed: 0
Unique reservations created: 1
Total duration: 1500ms
Average response time: 75ms

🏁 Summary:
============================================================
🎉 All requests succeeded!
✅ Perfect idempotency: All requests returned the same reservation
```

### 4. Manual API Testing

```bash
# Create reservation
curl -X POST http://localhost:5000/api/checkout/reserve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "user123",
    "items": [{"productId": "prod123", "qty": 1, "size": "M"}],
    "idempotencyKey": "test-key-123",
    "holdMinutes": 15
  }'

# Get reservation
curl -X GET http://localhost:5000/api/checkout/reservation/RESERVATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test webhook
curl -X POST http://localhost:5000/api/webhook/payment \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "RESERVATION_ID",
    "paymentStatus": "SUCCESS",
    "paymentId": "pay_123",
    "gatewayPayload": {"transactionId": "txn_123"}
  }'
```

## 🔧 Configuration Options

### Reservation Settings

```javascript
// In reservationController.js
const DEFAULT_HOLD_MINUTES = 15;        // Default reservation time
const MAX_HOLD_MINUTES = 60;            // Maximum reservation time
const MIN_STOCK_THRESHOLD = 0;          // Minimum stock for reservation
```

### Worker Settings

```javascript
// In releaseReservations.js
const WORKER_INTERVAL_MINUTES = 1;      // How often to check for expired reservations
const BATCH_SIZE = 100;                 // Process reservations in batches
const MAX_RETRIES = 3;                  // Retry failed releases
```

## 🚨 Rollback Instructions

If you need to revert the changes:

```bash
# Revert the patch
git apply -R reservation-checkout-patch.diff

# Restore database from backup
mongorestore --uri="$MONGODB_URI" ./backups/pre-reservation-YYYY-MM-DD-HH:MM:SS/

# Restart server
pm2 restart all
```

## 📊 Monitoring & Debugging

### 1. Check Reservation Status

```bash
# View active reservations
mongosh --eval "db.reservations.find({status: 'reserved'})"

# View expired reservations
mongosh --eval "db.reservations.find({status: 'expired'})"

# Check reservation counts by status
mongosh --eval "db.reservations.aggregate([{\$group: {_id: '\$status', count: {\$sum: 1}}}])"
```

### 2. Monitor Worker Logs

```bash
# If using PM2
pm2 logs reservation-worker

# If using cron
tail -f /var/log/cron
```

### 3. Debug Common Issues

**Reservation Creation Fails:**
- Check `RESERVATION_ENABLED` environment variable
- Verify MongoDB replica set is running
- Check product stock availability
- Verify user authentication

**Webhook Processing Fails:**
- Check webhook signature verification
- Verify reservation exists and is in 'reserved' status
- Check MongoDB transaction support
- Review webhook payload format

**Worker Not Running:**
- Verify worker process is started
- Check MongoDB connection
- Review cron job configuration
- Check for JavaScript errors in worker logs

## 🔒 Security Considerations

1. **Webhook Verification**: Implement proper signature verification for production
2. **Rate Limiting**: Consider adding rate limits to reservation endpoints
3. **Authentication**: All reservation endpoints require valid JWT tokens
4. **Input Validation**: Comprehensive validation of all input parameters
5. **SQL Injection**: Uses parameterized queries via Mongoose

## 📈 Performance Considerations

1. **Database Indexes**: Proper indexes on frequently queried fields
2. **Transaction Timeout**: MongoDB transactions have default timeout limits
3. **Batch Processing**: Worker processes reservations in batches
4. **Connection Pooling**: Reuse MongoDB connections
5. **Async Processing**: Non-blocking webhook processing

## 🆘 Troubleshooting

### Common Error Messages

**"Reservation system is disabled"**
- Set `RESERVATION_ENABLED=true` in environment

**"Failed to reserve stock"**
- Check product stock availability
- Verify MongoDB replica set is running
- Check for concurrent modifications

**"Invalid webhook signature"**
- Configure webhook secret in environment
- Verify signature calculation matches gateway

**"Transaction failed"**
- Ensure MongoDB replica set is configured
- Check MongoDB version supports transactions
- Verify sufficient disk space and memory

### Performance Issues

**Slow Reservation Creation:**
- Check database indexes
- Monitor MongoDB performance
- Consider connection pooling

**Worker Not Keeping Up:**
- Increase worker frequency
- Process reservations in smaller batches
- Monitor server resources

## 📞 Support

For issues or questions:
1. Check the logs for error messages
2. Verify environment configuration
3. Test with the provided test scripts
4. Review MongoDB replica set status
5. Check network connectivity and firewall rules

## 🔄 Future Enhancements

Potential improvements:
- **Redis Integration**: Use Redis for faster idempotency checks
- **Event Sourcing**: Implement event-driven architecture
- **Microservices**: Split into separate reservation service
- **Analytics**: Add reservation analytics and reporting
- **Notifications**: Email/SMS notifications for reservation status
- **Admin Panel**: Reservation management interface
