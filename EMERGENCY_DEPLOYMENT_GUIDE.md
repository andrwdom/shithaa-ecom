# 🚨 Emergency Deployment Guide - Backup & Enhanced Logging

## Overview
This guide provides immediate backup creation and enhanced logging setup to catch any future payment/order issues.

## 🚀 Quick Start Commands

### 1. Create Immediate Backups
```bash
# Make scripts executable
chmod +x create-backups.sh deploy-with-backup-and-logging.sh monitor-critical-endpoints.sh emergency-response.sh

# Create immediate backups (MongoDB + Code)
./create-backups.sh
```

### 2. Deploy with Enhanced Logging
```bash
# Deploy with backup and logging (enables maintenance mode)
./deploy-with-backup-and-logging.sh
```

### 3. Emergency Response (if critical issues)
```bash
# Full emergency response (enables full maintenance mode)
./emergency-response.sh
```

## 📁 Files Created

### Backup Scripts
1. **`create-backups.sh`** - Creates immediate MongoDB and code backups
2. **`deploy-with-backup-and-logging.sh`** - Deploys with backup and logging
3. **`emergency-response.sh`** - Full emergency response with maintenance mode
4. **`monitor-critical-endpoints.sh`** - Real-time log monitoring

### Enhanced Logging
1. **`backend/middleware/requestLogger.js`** - Enhanced request logging middleware
2. **Updated `backend/server.js`** - Integrated request logging

## 🔧 What Each Script Does

### `create-backups.sh`
- Creates MongoDB dump: `/var/backups/shithaa/YYYY-MM-DD_HHMM/mongodb/`
- Creates code snapshot: `/var/backups/shithaa/code_snapshot_YYYY-MM-DD_HHMM.tar.gz`
- Backs up environment files and configurations
- Creates backup manifest with restore instructions

### `deploy-with-backup-and-logging.sh`
- Runs `create-backups.sh`
- Enables maintenance mode (`DISABLE_CHECKOUT=true`)
- Installs dependencies
- Sets up logging directories
- Restarts backend with enhanced logging
- Verifies logging is working

### `emergency-response.sh`
- Runs `create-backups.sh`
- Enables full maintenance mode (`MAINTENANCE_MODE=true`)
- Enables enhanced logging
- Restarts all services
- Runs immediate diagnosis
- Shows monitoring and recovery commands

### `monitor-critical-endpoints.sh`
- Monitors request logs in real-time
- Highlights checkout, webhook, and payment activity
- Color-codes errors and critical events
- Shows all critical endpoint activity

## 📊 Enhanced Logging Features

### Request Logging
- **Console Output**: Immediate visibility of critical requests
- **File Logging**: Detailed logs to `backend/logs/requests-YYYY-MM-DD.log`
- **Correlation IDs**: Track requests end-to-end
- **Response Logging**: Logs response times and status codes

### Log Files Created
- `backend/logs/requests-YYYY-MM-DD.log` - All critical requests
- `backend/logs/webhook-YYYY-MM-DD.log` - Webhook activity
- `backend/logs/payment-YYYY-MM-DD.log` - Payment activity
- `backend/logs/error-YYYY-MM-DD.log` - Error logs
- `backend/logs/critical-YYYY-MM-DD.log` - Critical alerts

### Log Format
```
2025-09-27T10:30:00.000Z 192.168.1.100 POST /api/checkout | Headers: {"content-type":"application/json"} | Body: {"items":[...]} | CorrelationID: req_1695814200000_abc123
```

## 🔍 Monitoring Commands

### Real-time Monitoring
```bash
# Monitor all critical endpoints
./monitor-critical-endpoints.sh

# Monitor specific patterns
tail -f backend/logs/requests-$(date +%Y-%m-%d).log | grep checkout
tail -f backend/logs/requests-$(date +%Y-%m-%d).log | grep webhook
tail -f backend/logs/requests-$(date +%Y-%m-%d).log | grep payment
```

### Log Analysis
```bash
# Count checkout attempts
grep -c "checkout" backend/logs/requests-$(date +%Y-%m-%d).log

# Find failed requests
grep "ERROR\|CRITICAL" backend/logs/requests-$(date +%Y-%m-%d).log

# Find specific user activity
grep "user@example.com" backend/logs/requests-$(date +%Y-%m-%d).log
```

## 🚨 Emergency Procedures

### Critical Payment Issue
1. **Run Emergency Response**:
   ```bash
   ./emergency-response.sh
   ```

2. **Monitor Logs**:
   ```bash
   ./monitor-critical-endpoints.sh
   ```

3. **Check for Missing Orders**:
   ```bash
   node backend/scripts/audit-payment-system.js
   ```

4. **Recover Missing Orders**:
   ```bash
   node backend/scripts/recover-orders.js
   ```

5. **Disable Maintenance Mode**:
   ```bash
   sed -i '/MAINTENANCE_MODE=true/d' backend/.env
   sed -i '/DISABLE_CHECKOUT=true/d' backend/.env
   pm2 restart shithaa-backend
   ```

### Database Issues
1. **Create Backup**:
   ```bash
   ./create-backups.sh
   ```

2. **Enable Maintenance**:
   ```bash
   echo "MAINTENANCE_MODE=true" >> backend/.env
   pm2 restart shithaa-backend
   ```

3. **Fix Database Issues**

4. **Test and Disable Maintenance**

## 📋 Backup Information

### Backup Locations
- **MongoDB**: `/var/backups/shithaa/YYYY-MM-DD_HHMM/mongodb/`
- **Code**: `/var/backups/shithaa/code_snapshot_YYYY-MM-DD_HHMM.tar.gz`
- **Config**: `/var/backups/shithaa/YYYY-MM-DD_HHMM/`

### Restore Instructions
```bash
# Restore MongoDB
mongorestore --uri="$MONGODB_URI" /var/backups/shithaa/YYYY-MM-DD_HHMM/mongodb/

# Restore Code
tar xzf /var/backups/shithaa/code_snapshot_YYYY-MM-DD_HHMM.tar.gz -C /var/www/

# Restore Environment
cp /var/backups/shithaa/YYYY-MM-DD_HHMM/*.env /var/www/shithaa-ecom/*/backend/
```

## 🎯 Next Steps

### Immediate Actions
1. **Run the backup script** to secure current state
2. **Deploy with logging** to catch future issues
3. **Monitor logs** for any new activity
4. **Fix the payment issues** using the recovery scripts

### Long-term Actions
1. **Set up log rotation** to manage log file sizes
2. **Create monitoring alerts** for critical events
3. **Implement automated recovery** for missing orders
4. **Set up regular backups** (daily/weekly)

## 🔧 Maintenance Mode

### Enable Maintenance Mode
```bash
# Disable checkout only
echo "DISABLE_CHECKOUT=true" >> backend/.env

# Full maintenance mode
echo "MAINTENANCE_MODE=true" >> backend/.env

# Restart backend
pm2 restart shithaa-backend
```

### Disable Maintenance Mode
```bash
# Remove maintenance mode variables
sed -i '/MAINTENANCE_MODE=true/d' backend/.env
sed -i '/DISABLE_CHECKOUT=true/d' backend/.env

# Restart backend
pm2 restart shithaa-backend
```

### Check Maintenance Status
```bash
# Check environment variables
grep -E "MAINTENANCE_MODE|DISABLE_CHECKOUT" backend/.env

# Check API status
curl http://localhost:3000/api/maintenance/status
```

## 📞 Support

If you encounter any issues:
1. Check the backup manifest: `/var/backups/shithaa/YYYY-MM-DD_HHMM/BACKUP_MANIFEST.txt`
2. Check PM2 logs: `pm2 logs shithaa-backend`
3. Check request logs: `tail -f backend/logs/requests-$(date +%Y-%m-%d).log`
4. Run system health check: `node backend/scripts/system-health-check.js`

The enhanced logging system is now ready to catch any future issues! 🎉
