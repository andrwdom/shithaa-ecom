# 🔧 CRITICAL FIX: Worker Race Condition

## Problem

Orders were stuck in "DRAFT" status even after successful payment, with the error:
```
❌ Stock confirmation failed - no matching document: product XXX size L
   This usually means stock (3) or reserved (0) is insufficient for quantity 1
```

The issue showed `reserved (0)` which meant the stock was being released BEFORE the payment verification could confirm it.

## Root Cause

**The cleanup workers were releasing stock prematurely!**

Two background workers run periodically to clean up expired reservations:
1. `reservationExpiryWorker.js` - Runs every 5-10 minutes
2. `stockCleanupWorker.js` - Runs every 5 minutes

Both workers were:
- Finding checkout sessions older than 10-14 minutes
- Releasing ALL their reserved stock
- NOT checking if a draft order existed

This created a race condition:
1. User creates checkout session → stock reserved ✅
2. Draft order created → stock still reserved ✅
3. User makes payment on PhonePe
4. **Worker runs and releases stock** ❌ (because session is >10 min old)
5. PhonePe callback tries to verify payment
6. Stock confirmation fails ❌ (because reserved = 0)
7. Order stuck in DRAFT status ❌

## The Fix

Updated BOTH workers to check for draft orders before releasing stock:

### Files Modified:
1. `backend/workers/reservationExpiryWorker.js`
2. `backend/workers/stockCleanupWorker.js`

### What Changed:

Before releasing stock, workers now:
1. Check if a DRAFT/PENDING/CONFIRMED order exists for that checkout session
2. If YES → DON'T release stock (order owns it now) ✅
3. If NO → Safe to release stock ✅

### Code Pattern Applied:
```javascript
// Check if there's a draft order with this session
const draftOrder = await orderModel.findOne({ 
  checkoutSessionId: session.sessionId,
  status: { $in: ['DRAFT', 'PENDING', 'CONFIRMED'] }
});

if (draftOrder) {
  // Order exists - DON'T release stock
  console.log(`⚠️ Draft order ${draftOrder.orderId} exists - NOT releasing stock`);
  session.status = 'expired';
  await session.save();
  continue; // Skip stock release
}

// No order exists - safe to release stock
await releaseStockReservation(...);
```

## Impact

✅ **Stock reservations are now protected once a draft order is created**
✅ **Workers won't interfere with in-progress payment verification**
✅ **Orders will successfully confirm after payment**
✅ **No more "Stock confirmation failed" errors**

## Testing

After deployment, test the complete checkout flow:
1. Add items to cart
2. Confirm order (creates draft order and reserves stock)
3. Proceed to PhonePe payment
4. Complete payment
5. Verify order status changes to CONFIRMED
6. Check stock is properly reduced (not reserved anymore)

## Deployment

```bash
# Pull latest changes
cd /var/www/shithaa-ecom/backend
git pull origin develop

# Restart backend
pm2 restart shithaa-backend

# Monitor logs
pm2 logs shithaa-backend --lines 100
```

## Related Fixes

This completes the comprehensive race condition fix:
- ✅ Payment flow: Skip double validation/reservation if already reserved
- ✅ Frontend validation: Exclude current session's reserved stock
- ✅ Checkout cancellation: Don't release stock if draft order exists
- ✅ **Cleanup workers: Don't release stock if draft order exists** (THIS FIX)

---

**Date:** September 30, 2025  
**Priority:** CRITICAL  
**Status:** Fixed and ready for deployment
