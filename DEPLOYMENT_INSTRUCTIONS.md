# 🚀 Deployment Instructions - Industry-Level Checkout Flow

## Pre-Deployment Checklist

### 1. **MongoDB Setup**
```bash
# Ensure MongoDB is running
mongod --version

# If using replica set (for transactions):
# Start MongoDB with replica set:
mongod --replSet rs0

# Initialize replica set:
mongo
> rs.initiate()
```

**Note**: If you're NOT using a replica set, the code will fall back to non-transactional mode automatically (still safe, just not as atomic).

### 2. **Environment Variables**
Ensure these are set in your `.env`:
```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017/shithaa-ecom

# PhonePe
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_API_KEY=your_api_key
PHONEPE_SALT_INDEX=1
PHONEPE_ENVIRONMENT=SANDBOX # or PRODUCTION

# Frontend URL
FRONTEND_URL=https://shithaa.in

# Backend URL
BACKEND_URL=https://api.shithaa.in
```

---

## Deployment Steps

### Step 1: Pull Latest Code
```bash
cd /var/www/shithaa-ecom/backend
git pull origin main  # or your branch name

cd /var/www/shithaa-ecom/frontend
git pull origin main
```

### Step 2: Install Dependencies
```bash
# Backend
cd /var/www/shithaa-ecom/backend
npm install

# Frontend
cd /var/www/shithaa-ecom/frontend
npm install
```

### Step 3: Build Frontend
```bash
cd /var/www/shithaa-ecom/frontend
npm run build
```

### Step 4: Restart Services
```bash
# Restart all PM2 services
pm2 restart all

# Or restart specific services
pm2 restart shithaa-backend
pm2 restart shithaa-frontend
pm2 restart shithaa-stock-cleanup-worker
pm2 restart shithaa-reservation-expiry-worker

# Save PM2 configuration
pm2 save
```

### Step 5: Monitor Logs
```bash
# Watch all logs
pm2 logs

# Watch backend only
pm2 logs shithaa-backend --lines 100

# Watch for errors
pm2 logs --err
```

---

## Post-Deployment Verification

### 1. **Health Checks**
```bash
# Check backend health
curl https://api.shithaa.in/health

# Check PM2 status
pm2 list
```

### 2. **Test Checkout Flow**

#### Test 1: Create Checkout Session
```bash
curl -X POST https://api.shithaa.in/api/checkout/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "source": "cart",
    "items": [{
      "productId": "60d5ec49f8d2e83a4c8b4567",
      "size": "M",
      "quantity": 1,
      "price": 499,
      "name": "Test Product",
      "image": "https://..."
    }],
    "email": "test@example.com",
    "orderSummary": {
      "subtotal": 499,
      "total": 499,
      "offerDiscount": 0,
      "shipping": 0
    }
  }'
```

**Expected Response** (should take <500ms):
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-here",
    "stockReserved": true,
    "message": "Ready for payment"
  }
}
```

#### Test 2: Check Stock Reservation
```bash
# In MongoDB:
use shithaa-ecom
db.products.findOne(
  { _id: ObjectId("60d5ec49f8d2e83a4c8b4567") },
  { "sizes": 1 }
)
```

**Expected**: The `reserved` field for size M should be incremented.

### 3. **Monitor Key Metrics**

#### Check Active Sessions
```bash
# In MongoDB:
db.checkoutsessions.countDocuments({ 
  status: { $in: ["pending", "stock_reserved", "awaiting_payment"] },
  expiresAt: { $gt: new Date() }
})
```

#### Check Draft Orders
```bash
db.orders.countDocuments({ status: "DRAFT" })
```

#### Check Orders Pending Review
```bash
db.orders.find({ status: "PENDING_REVIEW" }).pretty()
```

---

## Rollback Plan

If something goes wrong:

### Quick Rollback
```bash
# 1. Checkout previous version
cd /var/www/shithaa-ecom/backend
git checkout <previous-commit-hash>

cd /var/www/shithaa-ecom/frontend
git checkout <previous-commit-hash>

# 2. Rebuild and restart
cd /var/www/shithaa-ecom/frontend
npm run build

pm2 restart all
```

### Manual Data Fix (if needed)
```javascript
// Release stuck reservations
db.products.updateMany(
  { "sizes.reserved": { $gt: 0 } },
  { $set: { "sizes.$[elem].reserved": 0 } },
  { arrayFilters: [{ "elem.reserved": { $gt: 0 } }] }
)

// Cancel stuck draft orders
db.orders.updateMany(
  { 
    status: "DRAFT",
    draftCreatedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // >30 min old
  },
  { 
    $set: { 
      status: "CANCELLED",
      orderStatus: "CANCELLED",
      paymentStatus: "FAILED",
      cancelledAt: new Date(),
      cancellationReason: "Auto-cancelled (stuck draft)"
    } 
  }
)
```

---

## Common Issues & Solutions

### Issue 1: "Transaction numbers are only allowed on a replica set"
**Cause**: MongoDB not configured as replica set
**Solution**: The code falls back automatically to non-transactional mode
**Optional Fix**: Set up replica set for full ACID compliance

### Issue 2: Checkout session creation is slow
**Cause**: Database connection issues or index missing
**Solution**: 
```javascript
// Add index for faster queries
db.checkoutsessions.createIndex({ sessionId: 1 })
db.checkoutsessions.createIndex({ status: 1, expiresAt: 1 })
db.orders.createIndex({ phonepeTransactionId: 1 })
db.orders.createIndex({ "metadata.checkoutSessionId": 1 })
db.orders.createIndex({ status: 1, draftCreatedAt: 1 })
db.products.createIndex({ "sizes.size": 1, "sizes.stock": 1 })
```

### Issue 3: Stock not releasing after failed payment
**Cause**: Webhook not reaching server or worker not running
**Solution**: 
```bash
# Check worker status
pm2 logs shithaa-stock-cleanup-worker

# Manually trigger cleanup
curl -X POST https://api.shithaa.in/api/admin/cleanup-expired-sessions
```

### Issue 4: Orders stuck in PENDING_REVIEW
**Cause**: Stock confirmation failed after successful payment
**Solution**: These need manual review
```javascript
// Dashboard to find them:
db.orders.find({
  status: "PENDING_REVIEW",
  paymentStatus: "PAID"
}).pretty()

// After verification, manually confirm:
db.orders.updateOne(
  { _id: ObjectId("...") },
  {
    $set: {
      status: "CONFIRMED",
      orderStatus: "CONFIRMED",
      stockConfirmed: true,
      confirmedAt: new Date()
    }
  }
)
```

---

## Performance Tuning

### 1. **MongoDB Indexes** (Critical!)
```javascript
// Checkout sessions
db.checkoutsessions.createIndex({ sessionId: 1 }, { unique: true })
db.checkoutsessions.createIndex({ status: 1, expiresAt: 1 })
db.checkoutsessions.createIndex({ userId: 1 })
db.checkoutsessions.createIndex({ createdAt: 1 })

// Orders
db.orders.createIndex({ orderId: 1 }, { unique: true })
db.orders.createIndex({ phonepeTransactionId: 1 })
db.orders.createIndex({ idempotencyKey: 1 })
db.orders.createIndex({ "metadata.checkoutSessionId": 1 })
db.orders.createIndex({ status: 1, draftCreatedAt: 1 })
db.orders.createIndex({ userInfo.email: 1 })
db.orders.createIndex({ paymentStatus: 1 })

// Products (Stock queries)
db.products.createIndex({ _id: 1, "sizes.size": 1 })
```

### 2. **MongoDB Connection Pool**
```javascript
// In your MongoDB connection:
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000
})
```

### 3. **PM2 Cluster Mode** (Optional)
```bash
# Run backend in cluster mode for better performance
pm2 start npm --name "shithaa-backend" -i max -- start
```

---

## Monitoring Setup

### 1. **PM2 Monitoring**
```bash
# Enable PM2 monitoring
pm2 install pm2-logrotate

# Set log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. **Custom Alerts** (Optional)
```javascript
// Add to backend/utils/alerting.js
import nodemailer from 'nodemailer';

export async function sendAlert(type, message, data) {
  // Send email/SMS/Slack notification
  console.error(`🚨 ALERT [${type}]:`, message, data);
  
  // Example: Send email
  const transporter = nodemailer.createTransport({...});
  await transporter.sendMail({
    to: 'admin@shithaa.in',
    subject: `[ALERT] ${type}: ${message}`,
    text: JSON.stringify(data, null, 2)
  });
}
```

---

## Success Metrics

After deployment, monitor these metrics:

| Metric | Target | How to Check |
|--------|--------|--------------|
| Checkout session creation | <500ms | PM2 logs / APM |
| Draft order creation | <300ms | PM2 logs / APM |
| Webhook processing | <200ms | PM2 logs / APM |
| Orders stuck in PENDING_REVIEW | <1% | MongoDB query |
| Stock discrepancies | 0 | Stock reconciliation worker |
| Payment success rate | >95% | PhonePe dashboard |

---

## 🎉 Deployment Complete!

Your industry-level checkout flow is now live. Monitor the logs and metrics closely for the first few hours to ensure everything is working smoothly.

**Happy Selling!** 🚀

