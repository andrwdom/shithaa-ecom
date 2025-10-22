# 🚀 Deploy Reconciliation Worker Fix to VPS

## 📋 What Was Fixed Locally

### Changes Made:
1. ✅ Changed script from `backend/scripts/reconcileMissingOrders.js` → `backend/jobs/reconcileDrafts.js`
2. ✅ Removed `cron_restart` (worker manages its own schedule)
3. ✅ Increased `min_uptime` from 10s → 60s
4. ✅ Increased `max_restarts` from 3 → 10

### File Modified:
- `ecosystem-production.config.js` (lines 172, 188-192)

---

## 🚀 Deployment Steps on VPS

### **Step 1: Commit and Push Changes (On Local Machine)**

```bash
# Make sure you're in the project root
cd /d/Productivity/Client\ Sites/Shitha-v3/shithaa-ecom-V3/shithaa-ecom-F1

# Stage the changes
git add ecosystem-production.config.js

# Commit with descriptive message
git commit -m "Fix: Use correct reconciliation worker script to prevent restart loops

- Changed from reconcileMissingOrders.js (one-time script) to reconcileDrafts.js (persistent worker)
- Removed cron_restart as worker has internal 60s schedule
- Increased min_uptime to 60s for better stability
- Increased max_restarts to 10 for better recovery
- This fixes the 336,000+ restart issue"

# Push to remote
git push origin main
```

---

### **Step 2: Pull Changes on VPS**

```bash
# SSH into your VPS
ssh root@srv900106

# Navigate to project directory
cd /var/www/shithaa-ecom

# Pull latest changes
git pull origin main

# Verify the change was pulled
grep -A 5 "shithaa-reconciliation-worker" ecosystem-production.config.js | grep "script"
# Should show: script: 'backend/jobs/reconcileDrafts.js'
```

---

### **Step 3: Stop and Remove Old Worker**

```bash
# Stop the broken worker
pm2 stop shithaa-reconciliation-worker

# Check current status (should show 336k+ restarts)
pm2 status | grep reconciliation

# Delete the old configuration from PM2
pm2 delete shithaa-reconciliation-worker

# Verify it's deleted
pm2 status
# Should NOT show shithaa-reconciliation-worker anymore
```

---

### **Step 4: Start Worker with New Configuration**

```bash
# Start only the reconciliation worker with new config
pm2 start ecosystem-production.config.js --only shithaa-reconciliation-worker

# Save PM2 configuration
pm2 save

# Check initial status
pm2 status | grep reconciliation
```

**Expected Output:**
```
│ 20 │ shithaa-reconciliation-worker │ 0 │ online │ 85.3mb │
                                      ↑ Should be 0 restarts now!
```

---

### **Step 5: Monitor for 5 Minutes**

```bash
# Watch the logs in real-time (Ctrl+C to exit)
pm2 logs shithaa-reconciliation-worker

# You should see every 60 seconds:
# INFO: Starting draft reconciliation cycle
# INFO: No draft orders found for reconciliation
# SUCCESS: Draft reconciliation cycle completed
```

**Wait 5 minutes, then check restart count:**

```bash
pm2 status | grep reconciliation
```

**Expected:** Restart count should STAY AT 0 (or maybe 1 if there was initial startup issue)

---

### **Step 6: Verify Success**

```bash
# Check restart count after 10 minutes
pm2 status | grep reconciliation

# Check logs for any errors
pm2 logs shithaa-reconciliation-worker --err --lines 20

# Verify MongoDB connection is stable
pm2 logs shithaa-reconciliation-worker | grep -i "mongodb\|connected"
```

---

## ✅ Success Criteria

After 10 minutes, you should see:

1. **Restart Count: 0-1** (not hundreds or thousands)
   ```bash
   pm2 status | grep reconciliation
   # Should show: │ 20 │ shithaa-reconciliation-worker │ 0 │ online │
   ```

2. **Regular Log Entries Every 60 Seconds**
   ```bash
   pm2 logs shithaa-reconciliation-worker --lines 20
   # Should show repeating cycle of reconciliation checks
   ```

3. **No Errors in Error Log**
   ```bash
   pm2 logs shithaa-reconciliation-worker --err --lines 20
   # Should be empty or minimal
   ```

4. **Memory Stable (80-150MB)**
   ```bash
   pm2 status | grep reconciliation
   # Memory should not keep growing
   ```

---

## 🔍 Troubleshooting

### **Issue: Worker Still Restarting**

```bash
# Check error logs
pm2 logs shithaa-reconciliation-worker --err --lines 50

# Common issues:
# 1. MongoDB connection string wrong
# 2. Environment variables missing
# 3. Script has syntax error
```

**Solution:**
```bash
# Check environment variables
cat backend/.env | grep -E "MONGODB_URI|PHONEPE"

# Test the script manually first
cd /var/www/shithaa-ecom/backend
node jobs/reconcileDrafts.js
# Should connect to MongoDB and start running
# Ctrl+C to stop after verifying it works
```

### **Issue: "Module not found" Error**

```bash
# Install dependencies if needed
cd /var/www/shithaa-ecom/backend
npm install

# Restart worker
pm2 restart shithaa-reconciliation-worker
```

### **Issue: Worker Shows "Stopped" Instead of "Online"**

```bash
# Start it manually
pm2 start shithaa-reconciliation-worker

# If that doesn't work, recreate it
pm2 delete shithaa-reconciliation-worker
pm2 start ecosystem-production.config.js --only shithaa-reconciliation-worker
pm2 save
```

---

## 📊 Monitoring Commands

### **Quick Status Check**
```bash
pm2 status | grep reconciliation
```

### **Watch Live Logs**
```bash
pm2 logs shithaa-reconciliation-worker
```

### **Check Last 50 Log Lines**
```bash
pm2 logs shithaa-reconciliation-worker --lines 50
```

### **Check Only Errors**
```bash
pm2 logs shithaa-reconciliation-worker --err --lines 50
```

### **Check Restart Count Over Time**
```bash
# Run this now, then again in 1 hour
pm2 status | grep reconciliation | awk '{print $6}'
# Should stay at 0 or very low number
```

---

## 🎯 Expected Behavior

### **Before Fix:**
```
│ 20 │ shithaa-reconciliation-worker │ 336,427 │ online │ ⚠️ THOUSANDS of restarts
```
- Restarting every few seconds
- Logs showing constant connect/disconnect
- Wasting server resources

### **After Fix:**
```
│ 20 │ shithaa-reconciliation-worker │ 0 │ online │ 85.3mb │ ✅ STABLE
```
- Stays at 0-5 restarts per day
- Logs show steady 60-second checks
- Quietly doing its job in background

---

## 📝 Quick Reference Commands

```bash
# Complete deployment in one go
cd /var/www/shithaa-ecom && \
git pull origin main && \
pm2 stop shithaa-reconciliation-worker && \
pm2 delete shithaa-reconciliation-worker && \
pm2 start ecosystem-production.config.js --only shithaa-reconciliation-worker && \
pm2 save && \
sleep 10 && \
pm2 status | grep reconciliation

# Monitor for 5 minutes
watch -n 10 'pm2 status | grep reconciliation'

# View logs
pm2 logs shithaa-reconciliation-worker
```

---

## 🚨 Rollback (If Needed)

If something goes wrong:

```bash
# Stop new worker
pm2 stop shithaa-reconciliation-worker
pm2 delete shithaa-reconciliation-worker

# Revert git changes
cd /var/www/shithaa-ecom
git checkout HEAD~1 ecosystem-production.config.js

# Start old configuration (though it will restart loop again)
pm2 start ecosystem-production.config.js --only shithaa-reconciliation-worker
pm2 save
```

---

## 💡 Additional Notes

### **Why This Fix Works:**

**Before:**
- PM2 runs `reconcileMissingOrders.js`
- Script executes once, finds orders, processes them
- Script exits with `process.exit(0)`
- PM2 thinks: "It crashed! Better restart it!"
- Infinite loop of restarts

**After:**
- PM2 runs `reconcileDrafts.js`
- Script starts, enters infinite loop with 60s intervals
- Never exits (until you stop it)
- PM2 thinks: "All good, it's still running"
- Zero unnecessary restarts

### **What the Worker Does:**

Every 60 seconds:
1. Queries database for DRAFT orders older than 5 minutes
2. For each stuck order, calls PhonePe API to check real payment status
3. If paid → Confirms order (commits stock, sends email)
4. If failed → Cancels order (releases stock)
5. Logs everything for monitoring
6. Sleeps for 60 seconds, then repeats

### **When to Check on It:**

✅ **Daily**: Quick `pm2 status` check
✅ **Weekly**: Review logs to see if it's catching any stuck orders
✅ **Monthly**: Verify memory usage isn't growing
✅ **After Deployments**: Always verify it's still running

---

## 🎉 Success!

If after 10 minutes you see:
- ✅ Restart count at 0-1
- ✅ Logs showing regular 60-second cycles
- ✅ No errors in error logs
- ✅ Process status "online"

**Then you're all set!** The reconciliation worker is now running correctly and will quietly protect your orders from webhook failures.

