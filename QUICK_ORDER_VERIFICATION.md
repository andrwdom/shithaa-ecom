# 🔍 Quick Order Verification Guide

Since order 69FP wasn't found, here's how to verify your order is protected:

## Option 1: Search for the Order

```bash
# Search by order ID
node backend/scripts/findOrder.js 69FP

# Or search by email (from invoice: vinokadir@gmail.com)
node backend/scripts/findOrder.js vinokadir@gmail.com

# Or search by phone (from invoice: 9487601939)
node backend/scripts/findOrder.js 9487601939
```

## Option 2: Check Recent Orders

The order was placed on 31/10/2025. Check recent orders:

```bash
# This will show recent orders
node backend/scripts/findOrder.js recent
```

## Option 3: Direct Database Query

If you have MongoDB access:

```javascript
// Find order by orderId
db.orders.findOne({ orderId: "69FP" })

// Or find by email
db.orders.find({ 
  $or: [
    { email: /vinokadir/i },
    { "userInfo.email": /vinokadir/i }
  ]
}).sort({ createdAt: -1 }).limit(5)
```

## Once You Find the Order ID:

1. **Verify it's protected:**
```bash
node backend/scripts/verifyOrderStockProtection.js <ACTUAL_ORDER_ID>
```

2. **Check the order details:**
   - Status should be `CONFIRMED` or `orderStatus: 'CONFIRMED'`
   - Payment should be `PAID` or `paymentStatus: 'PAID'`

3. **Monitor cleanup workers:**
```bash
# Watch PM2 logs
pm2 logs shithaa-reservation-expiry-worker | grep "69FP"
pm2 logs shithaa-stock-cleanup-worker | grep "69FP"
```

## What to Look For:

✅ **GOOD SIGNS:**
- Order status: `CONFIRMED` or `PAID`
- Logs show: `✅ STOCK RELEASE FIX: Prevents double release`
- Cleanup worker logs: `🚨 SKIPPING stock release... Order is PAID/CONFIRMED`

❌ **BAD SIGNS (shouldn't happen):**
- Logs show: `STOCK:RELEASE:ATOMIC:SUCCESS` for this order's products
- Product stock increases after payment

## Quick Protection Check:

Even if you can't find the exact order ID, **the fix protects ALL orders that are:**
- Status: `CONFIRMED` OR
- OrderStatus: `CONFIRMED` OR  
- PaymentStatus: `PAID`

So if your order is confirmed (as shown in the invoice), **it's already protected!**

