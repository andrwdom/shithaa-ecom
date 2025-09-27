# 🔧 Maintenance Mode System

## Overview
The maintenance mode system allows you to temporarily disable non-essential operations while keeping the site functional for browsing. This is crucial for fixing critical issues without losing customers.

## 🚨 Quick Start

### Enable Maintenance Mode (VPS)
```bash
# Make script executable
chmod +x toggle-maintenance.sh

# Disable checkout only (recommended for payment fixes)
./toggle-maintenance.sh enable checkout

# Or enable full maintenance mode
./toggle-maintenance.sh enable full

# Check status
./toggle-maintenance.sh status

# Disable when done
./toggle-maintenance.sh disable
```

### Using Node Scripts
```bash
# Check current status
node backend/scripts/maintenance-control.js status

# Enable checkout maintenance
node backend/scripts/maintenance-control.js enable checkout

# Enable full maintenance
node backend/scripts/maintenance-control.js enable full

# Disable maintenance
node backend/scripts/maintenance-control.js disable checkout
```

## 🔧 Maintenance Modes

### 1. Checkout Only (`DISABLE_CHECKOUT=true`)
- ✅ **Allows**: Product browsing, cart viewing, user accounts
- ❌ **Blocks**: Checkout process, order creation, payment processing
- 🎯 **Use Case**: Fixing payment/order issues while keeping site browsable

### 2. Payments Only (`DISABLE_PAYMENTS=true`)
- ✅ **Allows**: Everything except payment processing
- ❌ **Blocks**: Payment gateway, webhooks, payment callbacks
- 🎯 **Use Case**: Fixing payment gateway issues

### 3. Full Maintenance (`MAINTENANCE_MODE=true`)
- ✅ **Allows**: Product browsing, static content, health checks
- ❌ **Blocks**: All user interactions, checkout, payments, user accounts
- 🎯 **Use Case**: Major system updates or critical fixes

## 📊 Monitoring

### Check Status via API
```bash
# Get maintenance status
curl http://localhost:3000/api/maintenance/status

# Get system status
curl http://localhost:3000/api/monitoring/health
```

### Check Status via Scripts
```bash
# Node script
node backend/scripts/maintenance-control.js status

# Shell script
./toggle-maintenance.sh status
```

## 🚀 Implementation Details

### Environment Variables
```bash
# Full maintenance mode
MAINTENANCE_MODE=true

# Disable checkout only
DISABLE_CHECKOUT=true

# Disable payments only
DISABLE_PAYMENTS=true
```

### Middleware Behavior
The maintenance middleware checks these environment variables and blocks requests accordingly:

1. **Full Maintenance Mode**: Blocks all non-essential operations
2. **Checkout Disabled**: Blocks checkout, payment, and order operations
3. **Payments Disabled**: Blocks payment processing and webhooks

### Allowed Operations During Maintenance
- Product browsing (`/api/products/*`)
- Category viewing (`/api/categories/*`)
- Carousel content (`/api/carousel/*`)
- Static content (`/images/*`, `/uploads/*`)
- Health checks (`/api/health`)
- Monitoring (`/api/monitoring/*`)

## 🔄 Workflow for Critical Fixes

### Step 1: Enable Maintenance Mode
```bash
# Disable checkout to prevent new orders
./toggle-maintenance.sh enable checkout
```

### Step 2: Fix the Issue
```bash
# Run health check
node backend/scripts/system-health-check.js

# Run recovery if needed
node backend/scripts/recover-orders.js

# Check logs
tail -f backend/logs/payment-$(date +%Y-%m-%d).log
```

### Step 3: Test the Fix
```bash
# Test API endpoints
curl http://localhost:3000/api/monitoring/health
curl http://localhost:3000/api/maintenance/status
```

### Step 4: Disable Maintenance Mode
```bash
# Re-enable all operations
./toggle-maintenance.sh disable
```

## 📝 User Experience

### During Checkout Maintenance
Users will see:
```json
{
  "success": false,
  "message": "Checkout temporarily disabled for maintenance. Please try again later.",
  "data": {
    "maintenanceMode": true,
    "estimatedDowntime": "30 minutes",
    "contactInfo": "support@shithaa.com"
  }
}
```

### During Full Maintenance
Users will see:
```json
{
  "success": false,
  "message": "System temporarily under maintenance. Please try again later.",
  "data": {
    "maintenanceMode": true,
    "estimatedDowntime": "30 minutes",
    "contactInfo": "support@shithaa.com",
    "allowedOperations": "Browsing products and viewing content only"
  }
}
```

## 🚨 Emergency Procedures

### Critical Payment Issue
1. **Immediately disable checkout**:
   ```bash
   ./toggle-maintenance.sh enable checkout
   ```

2. **Check for missing orders**:
   ```bash
   node backend/scripts/system-health-check.js
   ```

3. **Recover missing orders**:
   ```bash
   node backend/scripts/recover-orders.js
   ```

4. **Fix the issue** and test

5. **Re-enable when fixed**:
   ```bash
   ./toggle-maintenance.sh disable
   ```

### Database Issues
1. **Enable full maintenance**:
   ```bash
   ./toggle-maintenance.sh enable full
   ```

2. **Fix database issues**

3. **Test thoroughly**

4. **Re-enable gradually**:
   ```bash
   # First enable checkout only
   ./toggle-maintenance.sh enable checkout
   
   # Test checkout
   # Then disable maintenance
   ./toggle-maintenance.sh disable
   ```

## 📊 Logging

### Maintenance Actions
All maintenance mode changes are logged to:
- `backend/logs/info-YYYY-MM-DD.log`
- Console output
- PM2 logs

### Log Format
```json
{
  "timestamp": "2025-09-27T10:30:00.000Z",
  "level": "INFO",
  "message": "Maintenance mode enabled via script",
  "data": {
    "mode": "checkout",
    "action": "enable",
    "value": "true",
    "envVar": "DISABLE_CHECKOUT",
    "description": "Disable checkout operations only",
    "timestamp": "2025-09-27T10:30:00.000Z",
    "user": "maintenance-script"
  }
}
```

## 🔐 Security Considerations

### API Access
- Maintenance status endpoint is public
- Toggle endpoint should be protected (admin only)
- All maintenance actions are logged

### User Communication
- Clear error messages for users
- Contact information provided
- Estimated downtime included

## 📈 Best Practices

### Before Enabling Maintenance
1. Check current system status
2. Identify the specific issue
3. Choose the appropriate maintenance mode
4. Notify team if needed

### During Maintenance
1. Monitor logs continuously
2. Test fixes thoroughly
3. Keep users informed
4. Document all changes

### After Disabling Maintenance
1. Monitor system health
2. Check for any new issues
3. Verify all functionality
4. Update documentation if needed

## 🎯 Use Cases

### Payment System Issues
- **Mode**: Checkout disabled
- **Duration**: 30 minutes
- **Action**: Fix webhook processing, recover missing orders

### Database Issues
- **Mode**: Full maintenance
- **Duration**: 1-2 hours
- **Action**: Database optimization, data recovery

### Security Issues
- **Mode**: Full maintenance
- **Duration**: 15-30 minutes
- **Action**: Apply security patches, update configurations

### Performance Issues
- **Mode**: Checkout disabled
- **Duration**: 1 hour
- **Action**: Optimize queries, clear caches

---

## 🚀 Quick Reference

### Commands
```bash
# Enable checkout maintenance
./toggle-maintenance.sh enable checkout

# Enable full maintenance
./toggle-maintenance.sh enable full

# Check status
./toggle-maintenance.sh status

# Disable maintenance
./toggle-maintenance.sh disable
```

### API Endpoints
```bash
# Maintenance status
GET /api/maintenance/status

# System health
GET /api/monitoring/health

# Missing orders
GET /api/monitoring/missing-orders
```

### Scripts
```bash
# Health check
node backend/scripts/system-health-check.js

# Order recovery
node backend/scripts/recover-orders.js

# Maintenance control
node backend/scripts/maintenance-control.js status
```

The maintenance mode system is now ready to use! 🎉
