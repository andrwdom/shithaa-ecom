# 🚀 Checkout System Runbook

## Overview

This document describes the new robust checkout system that separates cart and buy-now flows, ensures stock integrity, and provides reliable PhonePe payment handling.

## 🏗️ Architecture

### New Models

1. **CheckoutSession** - Manages checkout state and separates cart/buy-now flows
2. **Payment** - Tracks payment events and ensures idempotency
3. **PaymentEvent** - Audit trail for all payment-related operations

### Key Components

- **Backend**: Node.js/Express with MongoDB
- **Frontend**: Next.js with React hooks
- **Payment**: PhonePe SDK integration
- **Stock Management**: Atomic operations with reservation system

## 🔄 Checkout Flow

### 1. Cart Checkout Flow

```
User → Add to Cart → View Cart → Proceed to Checkout → Create Session → Reserve Stock → PhonePe Payment → Order Creation
```

### 2. Buy-Now Flow

```
User → Product Page → Buy Now → Create Session → Reserve Stock → PhonePe Payment → Order Creation
```

### 3. Stock Reservation Flow

```
Checkout Session → Validate Stock → Reserve Stock → Payment → Confirm Stock (decrement) OR Release Stock (failure)
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 5+
- PhonePe merchant account
- Environment variables configured

### Environment Variables

```bash
# PhonePe Configuration
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_API_KEY=your_api_key
PHONEPE_SALT_INDEX=1
PHONEPE_ENV=SANDBOX  # or PRODUCTION
PHONEPE_REDIRECT_URL=https://yourdomain.com/payment/callback

# Database
MONGODB_URI=mongodb://localhost:27017/your_db

# JWT
JWT_SECRET=your_jwt_secret
```

### Installation

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Database Setup**
   ```bash
   # MongoDB will auto-create collections
   # Ensure indexes are created
   ```

## 📱 API Endpoints

### Checkout Endpoints

- `POST /api/checkout/session` - Create checkout session
- `GET /api/checkout/session/:sessionId` - Get session details
- `POST /api/checkout/session/:sessionId/reserve-stock` - Reserve stock
- `POST /api/checkout/session/:sessionId/release-stock` - Release stock
- `POST /api/checkout/session/:sessionId/cancel` - Cancel session

### Payment Endpoints

- `POST /api/payment/phonepe/create-session` - Create PhonePe payment
- `POST /api/payment/phonepe/callback` - PhonePe webhook
- `GET /api/payment/status/:sessionId` - Get payment status
- `GET /api/payment/phonepe/verify/:merchantTransactionId` - Verify payment

## 🧪 Testing

### Unit Tests

```bash
cd backend
npm test
```

### Integration Tests

```bash
# Test checkout flow
npm run test:checkout

# Test payment flow
npm run test:payment

# Test stock management
npm run test:stock
```

### Manual Testing

1. **Cart Checkout**
   - Add items to cart
   - Navigate to `/checkout-v2`
   - Complete checkout flow

2. **Buy-Now**
   - Go to product page
   - Click "Buy Now"
   - Complete checkout flow

3. **Stock Validation**
   - Try to checkout more than available stock
   - Verify error handling

## 🔍 Monitoring & Debugging

### Logs

All operations include correlation IDs for tracing:

```javascript
[req_1234567890_abc123] Creating checkout session
[req_1234567890_abc123] Stock reserved successfully
[req_1234567890_abc123] Payment session created
```

### Payment Events

Check `PaymentEvent` collection for audit trail:

```javascript
// Find events by correlation ID
db.paymentevents.find({ correlationId: "req_1234567890_abc123" })

// Find events by session
db.paymentevents.find({ checkoutSessionId: "session_123" })

// Find failed events
db.paymentevents.find({ status: "failed" })
```

### Health Checks

- `GET /api/health` - Overall system health
- `GET /api/cart/health` - Cart system status
- `GET /api/debug/checkout-flow` - Checkout flow debug info

## 🚨 Troubleshooting

### Common Issues

#### 1. Stock Reservation Failed

**Symptoms**: 409 Conflict error during checkout

**Causes**:
- Insufficient stock
- Concurrent requests
- Database connection issues

**Solutions**:
```bash
# Check stock levels
db.products.find({ _id: ObjectId("product_id") }, { "sizes.stock": 1 })

# Check for expired sessions
db.checkoutsessions.find({ expiresAt: { $lt: new Date() } })

# Clean expired sessions
db.checkoutsessions.deleteMany({ expiresAt: { $lt: new Date() } })
```

#### 2. Payment Session Creation Failed

**Symptoms**: 500 error when creating PhonePe session

**Causes**:
- Missing environment variables
- PhonePe service unavailable
- Invalid checkout session

**Solutions**:
```bash
# Check environment variables
echo $PHONEPE_MERCHANT_ID
echo $PHONEPE_API_KEY

# Verify checkout session exists
db.checkoutsessions.findOne({ sessionId: "session_id" })

# Check PhonePe service status
curl -X GET "https://api.phonepe.com/apis/hermes/pg/v1/status/merchantId/transactionId"
```

#### 3. Webhook Not Received

**Symptoms**: Payment successful but order not updated

**Causes**:
- Webhook URL misconfigured
- Network issues
- PhonePe service problems

**Solutions**:
```bash
# Check webhook configuration
echo $PHONEPE_WEBHOOK_URL

# Verify webhook endpoint
curl -X POST "https://yourdomain.com/api/payment/phonepe/webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check webhook logs
db.paymentevents.find({ eventType: "webhook_received" })
```

### Debug Commands

#### Check Session Status

```bash
# Get session details
curl -X GET "http://localhost:3000/api/checkout/session/session_id" \
  -H "Authorization: Bearer token"

# Get payment status
curl -X GET "http://localhost:3000/api/payment/status/session_id"
```

#### Simulate Payment

```bash
# Mark order as paid (testing only)
curl -X POST "http://localhost:3000/api/payment/phonepe/test-success/transaction_id"
```

#### Check Stock

```bash
# Verify stock levels
curl -X POST "http://localhost:3000/api/cart/get-bulk-stock" \
  -H "Content-Type: application/json" \
  -d '{"productIds": ["product_id"]}'
```

## 🔧 Maintenance

### Regular Tasks

1. **Clean Expired Sessions**
   ```javascript
   // Runs automatically via TTL index
   // Manual cleanup if needed
   db.checkoutsessions.deleteMany({ expiresAt: { $lt: new Date() } })
   ```

2. **Monitor Payment Events**
   ```javascript
   // Check for failed events
   db.paymentevents.find({ status: "failed" }).sort({ createdAt: -1 }).limit(10)
   ```

3. **Stock Reconciliation**
   ```javascript
   // Find sessions with reserved stock but no payment
   db.checkoutsessions.find({ 
     stockReserved: true, 
     status: { $in: ["pending", "awaiting_payment"] },
     expiresAt: { $lt: new Date() }
   })
   ```

### Performance Optimization

1. **Database Indexes**
   ```javascript
   // Ensure all required indexes exist
   db.checkoutsessions.getIndexes()
   db.payments.getIndexes()
   db.paymentevents.getIndexes()
   ```

2. **Connection Pooling**
   ```javascript
   // Monitor MongoDB connections
   db.serverStatus().connections
   ```

## 📊 Metrics & Analytics

### Key Metrics

- Checkout completion rate
- Stock reservation success rate
- Payment success rate
- Average checkout time
- Failed payment reasons

### Monitoring Queries

```javascript
// Daily checkout sessions
db.checkoutsessions.aggregate([
  { $match: { createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } } },
  { $group: { _id: "$source", count: { $sum: 1 } } }
])

// Payment success rate
db.payments.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Stock reservation failures
db.paymentevents.aggregate([
  { $match: { eventType: "stock_reserved", status: "failed" } },
  { $group: { _id: "$error.code", count: { $sum: 1 } } }
])
```

## 🚀 Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Database indexes created
- [ ] PhonePe production credentials
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### Rollback Plan

1. **Database Rollback**
   ```bash
   # Restore from backup
   mongorestore --db your_db backup_file
   ```

2. **Code Rollback**
   ```bash
   # Revert to previous version
   git checkout previous_tag
   npm install
   npm run build
   pm2 restart
   ```

## 📞 Support

### Emergency Contacts

- **System Admin**: admin@yourdomain.com
- **PhonePe Support**: support@phonepe.com
- **Database Admin**: dba@yourdomain.com

### Escalation Process

1. **Level 1**: Check logs and basic troubleshooting
2. **Level 2**: Database investigation and code review
3. **Level 3**: PhonePe support and system recovery

### Incident Response

1. **Assess Impact**: Determine affected users and transactions
2. **Contain Issue**: Stop problematic operations
3. **Investigate Root Cause**: Analyze logs and events
4. **Implement Fix**: Deploy solution
5. **Verify Resolution**: Test and monitor
6. **Document Incident**: Update runbook and procedures

---

## 📝 Changelog

### v2.0.0 (Current)
- ✅ New checkout session system
- ✅ Stock reservation and management
- ✅ PhonePe integration improvements
- ✅ Audit trail and monitoring
- ✅ Cart vs buy-now separation

### v1.0.0 (Legacy)
- ❌ Mixed cart/buy-now flows
- ❌ Client-side stock management
- ❌ Basic PhonePe integration
- ❌ Limited error handling

---

*Last updated: $(date)*
*Version: 2.0.0*
