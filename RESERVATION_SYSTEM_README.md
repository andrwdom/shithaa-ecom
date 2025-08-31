# 🚀 Reservation-Aware Stock System

## 🎯 **Overview**

The Reservation-Aware Stock System is a robust solution that prevents overselling by implementing a two-phase stock management approach:

1. **Reservation Phase**: Stock is temporarily reserved during checkout (increment `reserved` field)
2. **Confirmation Phase**: Stock is permanently deducted only after successful payment (decrement both `stock` and `reserved` fields)

This system eliminates the classic "reservation vs. availability" bug where users could see "out of stock" errors even after successfully reserving items.

## 🔧 **How It Works**

### **Before (Problematic System)**
```
User adds item to checkout → Stock immediately decremented → Stock = 0
User proceeds to payment → Stock check sees 0 available → "Out of stock" error
```

### **After (Reservation System)**
```
User adds item to checkout → Stock reserved (reserved field incremented) → Available = stock - reserved
User proceeds to payment → Stock check excludes own reservation → Available > 0 ✅
Payment success → Stock confirmed (both stock and reserved decremented) → Final state
Payment failure → Stock reservation released (only reserved decremented) → Stock restored ✅
```

## 🏗️ **Architecture Components**

### **1. Product Schema Updates**
```javascript
const sizeSchema = new mongoose.Schema({
    size: { type: String, required: true },
    stock: { type: Number, required: true },      // Physical inventory
    reserved: { type: Number, default: 0 }        // Temporarily held stock
}, { _id: false });

// Virtual for available stock
sizeSchema.virtual('availableStock').get(function() {
    return Math.max(0, this.stock - this.reserved);
});
```

### **2. Reservation Model**
```javascript
const reservationSchema = new mongoose.Schema({
    reservationId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    userEmail: { type: String, required: true },
    checkoutSessionId: { type: String, required: true, unique: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
        size: { type: String, required: true },
        quantity: { type: Number, required: true },
        productName: { type: String, required: true }
    }],
    status: { type: String, enum: ['active', 'confirmed', 'expired', 'cancelled'] },
    expiresAt: { type: Date, required: true },
    source: { type: String, enum: ['cart', 'buynow'] }
});
```

### **3. Stock Utility Functions**
- `checkStockAvailability()` - Check if stock is available considering reservations
- `reserveStock()` - Increment reserved field (checkout phase)
- `confirmStockReservation()` - Decrement both stock and reserved (payment success)
- `releaseStockReservation()` - Decrement only reserved (payment failure/timeout)

## 🔄 **Flow Diagram**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Checkout │    │  Stock Reserved  │    │ Payment Process │
│                 │    │                  │    │                 │
│ • Add to cart   │───▶│ • reserved++     │───▶│ • PhonePe       │
│ • Fill details  │    │ • stock unchanged│    │ • Webhook       │
│ • Create session│    │ • Available =    │    │ • Verification  │
└─────────────────┘    │   stock-reserved │    └─────────────────┘
                       └──────────────────┘              │
                                                         │
                                                         ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │  Stock Released  │    │ Stock Confirmed │
                       │                  │    │                 │
                       │ • reserved--     │    │ • stock--       │
                       │ • stock unchanged│    │ • reserved--    │
                       │ • Available      │    │ • Final state   │
                       │   restored       │    │ • Order created │
                       └──────────────────┘    └─────────────────┘
                                ▲                       │
                                │                       │
                                └───────────────────────┘
                                Payment Failure/Timeout
```

## 🚀 **Deployment**

### **Quick Start**
```bash
# 1. Make script executable
chmod +x deploy-reservation-system.sh

# 2. Run deployment script
./deploy-reservation-system.sh
```

### **Manual Setup**
```bash
# 1. Add environment variables to backend/.env
RESERVATION_ENABLED=true
RESERVATION_EXPIRY_MINUTES=15
RESERVATION_AUTO_EXPIRY=true

# 2. Install dependencies
cd backend
npm install

# 3. Start backend
pm2 start ecosystem.config.js --env production
```

## 🧪 **Testing**

### **Run Test Script**
```bash
cd backend
node test-reservation-system.js
```

### **Expected Output**
```
🧪 Testing with product: Test Product
📏 Size: M
📦 Available stock: 1
🔒 Current reserved: 0

👤 User 1: Checking stock availability...
   Available: true
   Available stock: 1
   ✅ Stock available, reserving...
   🔒 Stock reserved: 1 units
   ✅ User 1 reservation successful

👤 User 2: Checking stock availability...
   Available: false
   Available stock: 0
   ❌ Stock not available: Insufficient stock. Available: 0, Requested: 1

🎯 Test Summary:
   ✅ User 1 successfully reserved and confirmed stock
   ❌ User 2 could not reserve stock (prevented overselling)
   🔒 Reservation system prevented double-sale of limited stock
```

## 📊 **Monitoring & Management**

### **Reservation Statistics**
```bash
# Get reservation stats (admin only)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/api/reservations/stats

# Response:
{
  "success": true,
  "data": {
    "stats": {
      "active": { "count": 5, "totalItems": 12 },
      "confirmed": { "count": 150, "totalItems": 300 },
      "expired": { "count": 8, "totalItems": 15 }
    },
    "summary": {
      "total": 163,
      "active": 5,
      "expired": 8
    }
  }
}
```

### **Manual Expiry Trigger**
```bash
# Manually trigger reservation expiry (admin only)
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/api/reservations/expire
```

### **PM2 Logs**
```bash
# Monitor backend logs
pm2 logs shithaa-backend

# Monitor specific process
pm2 logs shithaa-backend --lines 50
```

## ⚙️ **Configuration Options**

### **Environment Variables**
| Variable | Default | Description |
|----------|---------|-------------|
| `RESERVATION_ENABLED` | `false` | Enable/disable reservation system |
| `RESERVATION_EXPIRY_MINUTES` | `15` | Minutes before reservation expires |
| `RESERVATION_AUTO_EXPIRY` | `true` | Enable automatic expiry worker |

### **Reservation Expiry Worker**
The worker runs every 5 minutes via cron to automatically expire old reservations:

```bash
# Cron job (automatically added by deployment script)
*/5 * * * * cd /path/to/backend && node workers/reservationExpiryWorker.js >> logs/reservation-worker.log 2>&1
```

## 🔒 **Security & Concurrency**

### **Race Condition Prevention**
- **Atomic Operations**: All stock updates use MongoDB's atomic `$inc` operator
- **Reservation Locking**: Stock is reserved immediately during checkout
- **Session Isolation**: Each checkout session has unique reservation tracking

### **Idempotency**
- **Duplicate Prevention**: Reservation IDs are unique and time-based
- **Status Tracking**: Reservations can only transition through valid states
- **Rollback Safety**: Failed operations automatically release partial reservations

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Stock Not Reserving**
```bash
# Check if reservation system is enabled
grep RESERVATION_ENABLED backend/.env

# Check MongoDB connection
cd backend
node -e "import mongoose from 'mongoose'; mongoose.connect(process.env.MONGODB_URI)"
```

#### **2. Reservations Not Expiring**
```bash
# Check cron job
crontab -l

# Manually trigger expiry
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4000/api/reservations/expire
```

#### **3. Stock Inconsistencies**
```bash
# Check product stock vs reserved
cd backend
node -e "
import mongoose from 'mongoose';
import productModel from './models/productModel.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const products = await productModel.find({'sizes.reserved': {\$gt: 0}});
  products.forEach(p => {
    p.sizes.forEach(s => {
      if (s.reserved > 0) {
        console.log(\`\${p.name} (\${s.size}): stock=\${s.stock}, reserved=\${s.reserved}, available=\${s.stock - s.reserved}\`);
      }
    });
  });
  process.exit(0);
});
"
```

### **Debug Mode**
Enable detailed logging by setting environment variables:
```bash
# Add to backend/.env
DEBUG_RESERVATIONS=true
LOG_LEVEL=debug
```

## 📈 **Performance Considerations**

### **Database Indexes**
The system automatically creates optimized indexes:
- `checkoutSessionId` - Fast session lookups
- `userId` + `status` - User reservation queries
- `expiresAt` - TTL-based expiry queries
- `items.productId` + `items.size` - Stock availability checks

### **Memory Usage**
- **Reservation TTL**: Automatic cleanup via MongoDB TTL indexes
- **Session Cleanup**: Expired sessions are automatically removed
- **Batch Operations**: Stock updates are batched for efficiency

## 🔄 **Migration from Old System**

### **Automatic Migration**
The deployment script automatically:
1. Adds `reserved: 0` field to existing products
2. Creates necessary database indexes
3. Preserves existing stock data

### **Rollback Plan**
If issues occur, you can temporarily disable the system:
```bash
# Set in backend/.env
RESERVATION_ENABLED=false

# Restart backend
pm2 restart shithaa-backend
```

## 📚 **API Reference**

### **Checkout Endpoints**
- `POST /api/checkout/session` - Create checkout session with stock reservation
- `GET /api/checkout/session/:sessionId` - Get session details
- `POST /api/checkout/session/:sessionId/release-stock` - Release stock reservation

### **Reservation Endpoints**
- `GET /api/reservations/stats` - Get reservation statistics
- `POST /api/reservations/expire` - Manually trigger expiry

### **Stock Endpoints**
- `GET /api/products/:id/stock` - Get stock availability (considering reservations)

## 🎉 **Benefits**

1. **🚫 No More Overselling**: Stock is reserved during checkout
2. **✅ Better User Experience**: Users see accurate availability
3. **🔒 Concurrency Safe**: Multiple users can't grab the same stock
4. **📊 Transparent Tracking**: Clear visibility into reserved vs. available stock
5. **🔄 Automatic Cleanup**: Expired reservations are automatically released
6. **⚡ High Performance**: Optimized queries and atomic operations

## 🤝 **Support**

For issues or questions:
1. Check the troubleshooting section above
2. Review PM2 logs: `pm2 logs shithaa-backend`
3. Test the system: `cd backend && node test-reservation-system.js`
4. Check reservation stats: `/api/reservations/stats` endpoint

---

**🎯 The Reservation System transforms your checkout from a race condition nightmare into a robust, user-friendly experience that prevents overselling while maintaining high performance.**
