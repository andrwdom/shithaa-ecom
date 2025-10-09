# 🔴 FORENSIC AUDIT - QUICK REFERENCE

## VERDICT: ❌ NOT READY FOR PRODUCTION

**Critical Issues:** 4  
**High Issues:** 3  
**Moderate Issues:** 2  
**Low Issues:** 1  
**Total:** 10 findings

**Estimated Lost Revenue:** 5-15% of successful payments

---

## TOP 6 CRITICAL/HIGH FIXES (DEPLOY NOW)

| # | Issue | Severity | File | Fix Time | Command |
|---|-------|----------|------|----------|---------|
| 1 | Webhook returns 200 BEFORE signature check | **CRITICAL** | enhancedWebhookController.js:28 | 5min | Move signature check before `res.status(200)` |
| 2 | Worker releases stock during payment (10min TTL) | **CRITICAL** | 3 worker files | 3min | Change TTL from 10/14min → 20min |
| 3 | No distributed lock for reconciliation | **HIGH** | reconcileDrafts.js | 10min | Add Redis lock |
| 4 | Client trusts localStorage without server verify | **HIGH** | callback/page.tsx:148 | 10min | Force server verification |
| 5 | No monitoring for stuck DRAFT orders | **CRITICAL** | N/A | 10min | Create monitor job |
| 6 | Emergency stock fallback bypasses reservation | **MODERATE** | bulletproofPaymentProcessor.js:330 | 5min | Remove fallback |

**Total Deployment Time:** 40 minutes  
**Downtime Required:** 0 (rolling restart)

---

## CRITICAL FINDING DETAILS

### 🚨 FINDING #1: Webhook ACK Before Signature Verification

**Problem:**
```javascript
// Line 28-33: enhancedWebhookController.js
res.status(200).json({ success: true }); // ❌ SENT FIRST

// Line 44: THEN signature check
const signatureValid = await verifyPhonePeSignature(req);
```

**Why Critical:** PhonePe thinks webhook processed → stops retrying → payment lost forever

**Fix:** Move signature check to line 27 (before res.status(200))

**Test:**
```bash
curl -X POST https://shithaa.in/api/webhook/phonepe \
  -H "X-VERIFY: invalid_signature" \
  -H "X-VERIFY-INDEX: 1" \
  -d '{"merchantTransactionId":"TEST","state":"COMPLETED"}'
# Expected: 401 Unauthorized (not 200)
```

---

### 🚨 FINDING #2: Worker Race Condition

**Problem:**
```javascript
// Checkout TTL: 5 minutes
expiresAt: new Date(Date.now() + 5 * 60 * 1000);

// Worker cleanup: 10 minutes
createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) }

// PhonePe payment: 10-15 minutes (typical)
```

**Timeline of Failure:**
- T+0: User creates checkout, stock reserved
- T+5: Checkout expires
- T+10: Worker releases stock (reserved = 0)
- T+12: PhonePe sends "PAYMENT SUCCESS" webhook
- T+12: Stock confirmation fails (reserved = 0)
- Result: Order stuck in DRAFT

**Fix:** Change all TTLs to 20 minutes

**Files to Edit:**
1. `backend/workers/reservationExpiryWorker.js` (line 87: 10min → 20min)
2. `backend/workers/stockCleanupWorker.js` (line 33: 14min → 20min)
3. `backend/controllers/checkoutController.js` (line 275: 5min → 20min)

---

### 🚨 FINDING #3: Instagram Browser False Success

**Problem:**
```typescript
// frontend/app/payment/phonepe/callback/page.tsx:148-177
const transactionId = urlParams.get('merchantTransactionId');
const orderData = localStorage.getItem('pendingOrderData');

// If server verify fails, client shows success based on URL params
if (fetchFails) {
  displaySuccess(orderData); // ❌ WRONG
}
```

**Impact:** User sees "Payment Successful" but backend has no order

**Fix:** Never display success without server confirmation (force retry up to 30 seconds)

---

## DEPLOYMENT COMMANDS (Copy-Paste Ready)

### Quick Deploy (All 6 Fixes)
```bash
sudo bash EMERGENCY_FIX_DEPLOYMENT.sh
```

### Manual Deploy (Step-by-Step)

**1. Fix Webhook Signature (5min):**
```bash
cd /var/www/shithaa-ecom/backend
# Edit controllers/enhancedWebhookController.js
# Move lines 43-50 (signature check) to BEFORE line 28 (res.status(200))
pm2 restart shithaa-backend
```

**2. Fix Worker TTL (3min):**
```bash
cd /var/www/shithaa-ecom/backend
sed -i 's/10 \* 60 \* 1000/20 * 60 * 1000/g' workers/reservationExpiryWorker.js
sed -i 's/14 \* 60 \* 1000/20 * 60 * 1000/g' workers/stockCleanupWorker.js
sed -i 's/5 \* 60 \* 1000/20 * 60 * 1000/g' controllers/checkoutController.js
pm2 restart all
```

**3. Add Distributed Locks (10min):**
```bash
cd /var/www/shithaa-ecom/backend
npm install ioredis
# Edit jobs/reconcileDrafts.js - add Redis lock (see full patch in main report)
pm2 restart shithaa-reconciliation
```

**4. Start Monitoring (10min):**
```bash
cd /var/www/shithaa-ecom/backend
# Create jobs/monitorStuckOrders.js (see script in main report)
pm2 start jobs/monitorStuckOrders.js --name stuck-order-monitor
pm2 save
```

**5. Test Deployment:**
```bash
# Check services
pm2 status

# Check logs
pm2 logs --lines 50

# Test webhook signature
curl -X POST https://shithaa.in/api/webhook/phonepe \
  -H "X-VERIFY: invalid" \
  -H "X-VERIFY-INDEX: 1" \
  -d '{"merchantTransactionId":"TEST","state":"COMPLETED"}'
# Expected: 401 Unauthorized

# Check stuck orders
pm2 logs stuck-order-monitor
```

---

## MONITORING QUERIES

### 1. Check for Stuck DRAFT Orders
```javascript
db.orders.find({
  status: 'DRAFT',
  paymentStatus: 'PAID',
  createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) }
}).count();
// Alert if > 0
```

### 2. Webhook Processing Time
```javascript
db.webhookevents.aggregate([
  { $match: { 
    status: 'processed',
    receivedAt: { $gte: new Date(Date.now() - 3600000) }
  }},
  { $project: { 
    processingTimeMs: { $subtract: ['$processedAt', '$receivedAt'] }
  }},
  { $group: { 
    _id: null,
    avgTime: { $avg: '$processingTimeMs' },
    maxTime: { $max: '$processingTimeMs' }
  }}
]);
// Alert if avgTime > 1000ms or maxTime > 5000ms
```

### 3. Worker Premature Stock Releases
```javascript
db.checkoutsessions.find({
  stockReserved: false,
  status: 'awaiting_payment',
  createdAt: { $gte: new Date(Date.now() - 20 * 60 * 1000) }
}).count();
// Alert if > 0 (stock released while payment in progress)
```

### 4. Stock Confirmation Failures
```javascript
db.orders.find({
  status: 'DRAFT',
  paymentStatus: 'PAID',
  stockConfirmed: false,
  createdAt: { $gte: new Date(Date.now() - 86400000) }
}).count();
// Alert if > 5 per day
```

---

## ROLLBACK PROCEDURE

If issues arise after deployment:

```bash
# Stop all services
pm2 stop all

# Restore from backup (backup created by deployment script)
BACKUP_DIR=$(ls -t /var/www/shithaa-ecom-backup-* | head -1)
cp -r $BACKUP_DIR/backend/* /var/www/shithaa-ecom/backend/

# Restore nginx
sudo cp $BACKUP_DIR/nginx-shithaa.in.bak /etc/nginx/sites-available/shithaa.in
sudo nginx -t && sudo systemctl reload nginx

# Restart services
pm2 restart all

# Verify
pm2 status
pm2 logs --lines 20
```

---

## POST-DEPLOYMENT CHECKLIST

### Day 1 (Immediate)
- [ ] All PM2 processes running (`pm2 status`)
- [ ] No errors in logs (`pm2 logs`)
- [ ] Webhook signature test passes (401 for invalid signature)
- [ ] Stuck order monitor running and logging
- [ ] Test a real checkout flow (end-to-end)

### Week 1 (Daily Monitoring)
- [ ] Check stuck order count (should be 0)
- [ ] Review webhook processing times (<1s average)
- [ ] Monitor stock confirmation failures (<5/day)
- [ ] Check for overselling incidents (none)
- [ ] Review PhonePe API rate limits (< 25/min)

### Week 2 (Validation)
- [ ] No customer complaints about "paid but no order"
- [ ] No inventory discrepancies
- [ ] Reconciliation job processing without duplicates
- [ ] Instagram browser checkout success rate >95%

---

## EMERGENCY CONTACTS

If critical issues arise:

1. **Immediate Actions:**
   - Stop reconciliation: `pm2 stop shithaa-reconciliation`
   - Stop workers: `pm2 stop shithaa-*-worker`
   - Check stuck orders: `pm2 logs stuck-order-monitor`

2. **Escalation:**
   - Review full audit report: `FORENSIC_PAYMENT_AUDIT_REPORT.md`
   - Check backup location: `/var/www/shithaa-ecom-backup-*`
   - Run rollback procedure (see above)

3. **Support Resources:**
   - PhonePe Merchant Support: https://business.phonepe.com/support
   - Audit Report: `FORENSIC_PAYMENT_AUDIT_REPORT.md` (complete evidence)
   - Deployment Script: `EMERGENCY_FIX_DEPLOYMENT.sh` (automated fixes)

---

## FILES CREATED BY THIS AUDIT

1. **FORENSIC_PAYMENT_AUDIT_REPORT.md** - Complete audit (50+ pages)
2. **EMERGENCY_FIX_DEPLOYMENT.sh** - Automated deployment script
3. **AUDIT_QUICK_REFERENCE.md** - This file (quick ref)

---

**Next Audit:** 1 week after deployment  
**Review Criteria:** All monitors green, 0 stuck orders, <1% payment failures

---

**Audit Date:** October 9, 2025  
**Auditor:** Senior E-Commerce Reliability Engineer (Amazon-Level Standards)

