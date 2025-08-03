# Immediate Action Plan - Fix 502 Bad Gateway

## 🚨 Current Situation
- **Backend server not responding** (502 Bad Gateway)
- **Multiple API endpoints failing**
- **Frontend showing Server Components errors**
- **Admin panel cannot fetch data**

## 📋 Action Plan (Execute in Order)

### Step 1: Check Server Status (2 minutes)
```bash
# Connect to your VPS and run:
pm2 status
pm2 logs --lines 20
```

**Expected Result**: Should show if PM2 processes are running or crashed.

### Step 2: Restart Backend Application (5 minutes)
```bash
# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all

# Navigate to backend directory
cd /var/www/shithaa-ecom/backend

# Install dependencies (if needed)
npm install

# Start the application
pm2 start ecosystem.config.js

# Check status
pm2 status
```

**Expected Result**: Should show application as "online".

### Step 3: Test Backend Locally (2 minutes)
```bash
# Test if backend is responding
curl http://localhost:4000/api/cors-test

# Expected response:
# {"success":true,"message":"CORS test successful","origin":"https://admin.shithaa.in","timestamp":"..."}
```

### Step 4: Check Nginx Status (2 minutes)
```bash
# Check Nginx status
sudo systemctl status nginx

# Test Nginx configuration
sudo nginx -t

# Restart Nginx if needed
sudo systemctl restart nginx
```

### Step 5: Test External Access (2 minutes)
```bash
# Test external API access
curl https://shithaa.in/api/cors-test

# Test orders endpoint
curl https://shithaa.in/api/orders
```

### Step 6: Update Frontend Configuration (3 minutes)
```bash
# Navigate to frontend directory
cd /var/www/shithaa-ecom/frontend

# Rebuild frontend with updated config
npm run build

# Restart frontend
pm2 restart shithaa-frontend
```

## 🔧 If Steps Fail

### If PM2 Status Shows Errors:
```bash
# Check for dependency issues
cd /var/www/shithaa-ecom/backend
npm install

# Check for environment variables
pm2 env 0

# Restart with fresh environment
pm2 restart all --update-env
```

### If Backend Won't Start:
```bash
# Check for port conflicts
sudo lsof -i :4000

# Kill conflicting processes
sudo kill -9 $(sudo lsof -t -i:4000)

# Start manually to see errors
cd /var/www/shithaa-ecom/backend
node server.js
```

### If Nginx Issues:
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### If Database Issues:
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Test database connection
mongo --eval "db.adminCommand('ping')"
```

## 📊 Success Indicators

### ✅ Backend Working:
- `pm2 status` shows "online"
- `curl http://localhost:4000/api/cors-test` returns JSON
- No errors in `pm2 logs`

### ✅ External Access Working:
- `curl https://shithaa.in/api/cors-test` returns JSON
- `curl https://shithaa.in/api/orders` returns JSON
- No 502 errors in browser

### ✅ Frontend Working:
- No Server Components errors
- Admin panel can fetch data
- No 502 errors in browser console

## 🚨 Emergency Commands

### If Everything Fails:
```bash
# Complete system restart
sudo reboot

# After reboot, start services
cd /var/www/shithaa-ecom/backend
pm2 start ecosystem.config.js
sudo systemctl start nginx
```

### Check System Resources:
```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
htop
```

## 📝 Testing Checklist

After completing the steps, test:

1. **Backend Health**: `curl http://localhost:4000/api/cors-test`
2. **External API**: `curl https://shithaa.in/api/cors-test`
3. **Admin Panel**: Visit `https://admin.shithaa.in` and check orders page
4. **Frontend**: Visit `https://shithaa.in` and check for errors
5. **Database**: Check if orders are loading in admin panel

## 🎯 Expected Timeline

- **Step 1-2**: 5-7 minutes (Backend restart)
- **Step 3-5**: 5 minutes (Testing)
- **Step 6**: 3-5 minutes (Frontend update)
- **Total**: 15-20 minutes

## 🚨 If Still Not Working

### Check System Logs:
```bash
# Check system logs
sudo journalctl -u nginx
sudo journalctl -u mongod

# Check for any system errors
dmesg | tail -20
```

### Manual Debugging:
```bash
# Start backend manually to see errors
cd /var/www/shithaa-ecom/backend
node server.js
```

---

**Priority**: Fix backend server first, then test external access.

**Expected Outcome**: All 502 errors resolved, admin panel working, frontend error-free.

**Next Steps**: Execute the action plan in order, testing after each step. 