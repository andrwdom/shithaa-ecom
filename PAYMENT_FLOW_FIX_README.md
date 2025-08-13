# Payment Flow Fix - PhonePe Integration

## Problem Description
The previous payment flow had a critical issue where:
1. Orders were created immediately when checkout was initiated
2. Stock was deducted before payment confirmation
3. If payment failed or was abandoned, orders remained in the database marked as "paid"
4. This caused inventory discrepancies and incorrect order reporting

## Solution Implemented
The payment flow has been completely restructured to follow proper payment gateway patterns:

### New Flow:
1. **Checkout Initiation**: User fills checkout form and clicks "Confirm Order"
2. **Temporary Storage**: Order data is stored in a temporary collection (`TempOrder`) with 30-minute expiry
3. **Payment Gateway**: User is redirected to PhonePe payment gateway
4. **Payment Processing**: User completes or abandons payment
5. **Callback Processing**: 
   - **Success**: Temporary order data is used to create actual order, stock is deducted, cart is cleared
   - **Failure/Abandonment**: Temporary data is cleaned up, no order created, no stock deducted
6. **Cleanup**: Expired temporary orders are automatically removed

### Key Benefits:
- ✅ No orders created until payment is confirmed
- ✅ No stock deducted until payment is successful
- ✅ Failed/abandoned payments don't affect inventory
- ✅ Clean database with only confirmed orders
- ✅ Automatic cleanup of expired sessions

## Files Modified

### Backend:
- `backend/controllers/paymentController.js` - Complete rewrite of payment flow
- `backend/controllers/webhookController.js` - Updated to handle temporary orders
- `backend/models/TempOrder.js` - New model for temporary order storage
- `backend/routes/paymentRoute.js` - Updated routes

### Frontend:
- `frontend/app/checkout/CheckoutPage.tsx` - Updated to handle new response format

### Cleanup Scripts:
- `backend/scripts/cleanup-pending-orders.js` - Clean up old pending orders
- `backend/scripts/cleanup-expired-temp-orders.js` - Clean up expired temporary orders

## Database Changes

### New Collection: `TempOrder`
```javascript
{
  merchantOrderId: String,        // PhonePe transaction ID
  orderData: Object,              // Complete order information
  createdAt: Date,                // When temporary order was created
  expiresAt: Date                 // Auto-expiry (30 minutes)
}
```

### Order Model Updates
- Orders are now only created after successful payment
- `phonepeTransactionId` field links to PhonePe transaction
- Payment status is properly tracked

## Cleanup Instructions

### Step 1: Clean up existing pending orders
```bash
cd backend
node scripts/cleanup-pending-orders.js
```

This script will:
- Find all pending orders older than 1 hour
- Restore product stock
- Delete the pending orders
- Show summary of remaining orders

### Step 2: Clean up expired temporary orders
```bash
cd backend
node scripts/cleanup-expired-temp-orders.js
```

This script will:
- Remove all expired temporary orders
- Show count of remaining temporary orders

### Step 3: Set up automated cleanup (Recommended)
Add to your cron jobs or scheduled tasks:
```bash
# Run every 15 minutes
*/15 * * * * cd /path/to/backend && node scripts/cleanup-expired-temp-orders.js
```

## Testing the New Flow

### Test Payment Success:
1. Go through checkout process
2. Complete payment on PhonePe
3. Verify order is created in database
4. Verify stock is deducted
5. Verify cart is cleared

### Test Payment Failure:
1. Go through checkout process
2. Abandon payment on PhonePe (close browser, go back, etc.)
3. Verify no order is created
4. Verify stock is not deducted
5. Verify cart remains unchanged

### Test Expired Session:
1. Start checkout process
2. Wait 30+ minutes
3. Try to complete payment
4. Verify session expired message
5. Verify no order created

## Environment Variables

Ensure these are set in your `.env` file:
```bash
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_API_KEY=your_api_key
PHONEPE_SALT_INDEX=1
PHONEPE_ENV=SANDBOX  # or PRODUCTION
PHONEPE_CALLBACK_USERNAME=your_callback_username
PHONEPE_CALLBACK_PASSWORD=your_callback_password
PHONEPE_REDIRECT_URL=https://yourdomain.com/payment/phonepe/callback
BASE_URL=https://yourdomain.com
```

## Monitoring and Logs

The new system provides comprehensive logging:
- Payment session creation
- Callback processing
- Order creation/failure
- Stock updates
- Cleanup operations

Check your server logs for detailed payment flow information.

## Rollback Plan

If you need to rollback to the old system:
1. Restore the old `paymentController.js`
2. Remove `TempOrder` model
3. Run cleanup scripts to remove temporary data
4. Update frontend to handle old response format

## Support

For any issues with the new payment flow:
1. Check server logs for detailed error messages
2. Verify PhonePe credentials and configuration
3. Test with PhonePe sandbox environment first
4. Use the test endpoints for debugging

## Security Notes

- Temporary orders expire after 30 minutes
- No sensitive payment data is stored in temporary orders
- PhonePe webhook signatures are validated
- All operations are logged for audit purposes 