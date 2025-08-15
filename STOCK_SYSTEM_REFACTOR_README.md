# Stock System Refactor - Atomic Operations Implementation

## Overview

This document describes the refactoring of the stock management system to use atomic MongoDB operations, preventing race conditions and inventory overselling.

## What Was Changed

### 1. **Centralized Atomic Stock Utility** (`backend/utils/stock.js`)

- **`changeStock(productId, size, quantityChange, options)`**: Core atomic stock modification function
- **`reserveStock(productId, size, quantity, options)`**: Reserve stock (decrement) with validation
- **`releaseStock(productId, size, quantity, options)`**: Release stock (increment) for failed payments
- **`batchChangeStock(operations)`**: Multi-item stock operations within transactions
- **`checkStockAvailability(productId, size, quantity)`**: Check stock without modifying
- **`validateStockForItems(items)`**: Validate multiple items for stock availability

### 2. **Stock Decrement Timing Fixed**

**BEFORE**: Stock was decremented immediately when orders were created
**AFTER**: Stock is only validated during order creation, decremented after payment confirmation

#### Files Modified:
- `backend/controllers/orderController.js`
- `backend/controllers/paymentController.js`

#### Key Changes:
```javascript
// OLD: Immediate stock decrement
await updateProductStock(items); // This decremented stock

// NEW: Stock validation only
const stockValidations = await validateStockForItems(items);
const stockIssues = stockValidations.filter(v => !v.available);
if (stockIssues.length > 0) {
    return res.status(400).json({ message: `Stock validation failed: ${errorMessages}` });
}
```

### 3. **Atomic Stock Operations**

**BEFORE**: Non-atomic read-modify-write operations
```javascript
product.sizes[sizeIndex].stock -= item.quantity;
await product.save();
```

**AFTER**: Atomic MongoDB operations with optimistic locking
```javascript
const result = await productModel.updateOne(
    {
        _id: productId,
        'sizes.size': size,
        'sizes.stock': { $gte: -quantityChange } // Ensure sufficient stock
    },
    {
        $inc: { 'sizes.$.stock': quantityChange }
    },
    { session }
);
```

### 4. **Database Indexes Added**

New indexes for efficient stock operations:
```javascript
// Compound index for stock updates
{ _id: 1, 'sizes.size': 1, 'sizes.stock': 1 }

// Index for stock queries
{ 'sizes.stock': 1 }

// Index for low stock monitoring
{ 'sizes.stock': 1, category: 1 }
```

## How It Works Now

### 1. **Order Creation Flow**
```
User submits order → Stock validation (no decrement) → Order created with status 'Pending'
```

### 2. **Payment Flow**
```
Payment session created → Stock reserved (decremented) → Payment processed → 
Payment success → Order created → Stock confirmed (decremented again) → 
Payment session deleted
```

### 3. **Failure Handling**
```
Payment fails → Stock automatically restored (incremented) → Order marked as failed
```

## Benefits

1. **Race Condition Prevention**: Atomic operations prevent concurrent stock modifications
2. **No Inventory Overselling**: Stock is validated before order creation
3. **Consistent State**: All stock operations use the same atomic pattern
4. **Better Performance**: Database indexes make stock operations fast
5. **Transaction Support**: Multi-item operations wrapped in MongoDB transactions
6. **Centralized Logic**: All stock operations in one utility file

## Usage Examples

### Reserve Stock (Decrement)
```javascript
import { reserveStock } from '../utils/stock.js';

try {
    await reserveStock(productId, size, quantity);
    console.log('Stock reserved successfully');
} catch (error) {
    console.error('Stock reservation failed:', error.message);
}
```

### Release Stock (Increment)
```javascript
import { releaseStock } from '../utils/stock.js';

try {
    await releaseStock(productId, size, quantity);
    console.log('Stock released successfully');
} catch (error) {
    console.error('Stock release failed:', error.message);
}
```

### Batch Operations
```javascript
import { batchChangeStock } from '../utils/stock.js';

const operations = [
    { productId: 'prod1', size: 'M', quantityChange: -2 },
    { productId: 'prod2', size: 'L', quantityChange: -1 }
];

try {
    const results = await batchChangeStock(operations);
    console.log('Batch stock update successful:', results);
} catch (error) {
    console.error('Batch stock update failed:', error.message);
}
```

## Migration Steps

1. **Run the index creation script**:
   ```bash
   cd backend
   node scripts/add-stock-indexes.js
   ```

2. **Test the new system**:
   - Create orders and verify stock validation
   - Process payments and verify stock decrement
   - Test failure scenarios and verify stock restoration

3. **Monitor logs** for any stock operation errors

## Error Handling

The system includes comprehensive error handling:
- **Stock validation failures**: Return 400 with specific error messages
- **Stock operation failures**: Log errors but don't fail the main operation
- **Transaction failures**: Automatic rollback of all stock changes

## Future Enhancements

1. **Stock Reservation Timeout**: Automatically release reserved stock after X minutes
2. **Stock Alerts**: Notify admins when stock falls below thresholds
3. **Stock History**: Track all stock changes for auditing
4. **Redis Integration**: Add distributed locking for high-concurrency scenarios

## Testing

Test scenarios to verify the refactor:
1. **Concurrent Orders**: Multiple users ordering the same product simultaneously
2. **Payment Failures**: Verify stock is restored when payments fail
3. **Order Cancellations**: Verify stock is restored when orders are cancelled
4. **Stock Validation**: Verify orders are rejected when stock is insufficient

## Monitoring

Key metrics to monitor:
- Stock operation success/failure rates
- Stock validation failure rates
- Payment success rates
- Order creation success rates

## Troubleshooting

### Common Issues:
1. **Stock validation failures**: Check if products exist and have sufficient stock
2. **Stock operation failures**: Check MongoDB connection and indexes
3. **Payment flow issues**: Verify stock reservation and confirmation flow

### Debug Commands:
```bash
# Check stock indexes
db.products.getIndexes()

# Check stock for specific product
db.products.findOne({_id: ObjectId("productId")}, {sizes: 1})

# Monitor stock operations
db.products.find({}, {_id: 1, "sizes.stock": 1})
``` 