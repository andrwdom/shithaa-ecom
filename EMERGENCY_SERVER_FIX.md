# Emergency Server Fix - 502 Bad Gateway

## 🚨 Current Status
- **Multiple 502 Bad Gateway errors** across all API endpoints
- **Frontend errors** in Server Components
- **Backend server not responding**

## 🔍 Immediate Diagnosis

### 1. **Check PM2 Status**
```bash
pm2 status
```

### 2. **Check Application Logs**
```bash
pm2 logs --lines 100
```

### 3. **Check if Port 4000 is in use**
```bash
netstat -tlnp | grep :4000
```

### 4. **Check Nginx Status**
```bash
sudo systemctl status nginx
```

## 🛠️ Emergency Fixes

### Fix 1: Restart Backend Application
```bash
# Stop all PM2 processes
pm2 stop all

# Delete PM2 processes
pm2 delete all

# Start the backend application
cd /var/www/shithaa-ecom/backend
pm2 start ecosystem.config.js

# Check status
pm2 status
```

### Fix 2: Check and Fix Nginx Configuration
```bash
# Test Nginx configuration
sudo nginx -t

# If configuration is correct, restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

### Fix 3: Check Server Resources
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
htop
```

### Fix 4: Test Backend Directly
```bash
# Test if backend is running locally
curl http://localhost:4000/api/cors-test

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/user/auth/profile
```

## 🔧 Common Issues and Solutions

### Issue 1: Application Crashed
```bash
# Check for errors in the application
pm2 logs --lines 50

# If there are dependency issues
cd /var/www/shithaa-ecom/backend
npm install

# Restart with fresh environment
pm2 restart all --update-env
```

### Issue 2: Port Already in Use
```bash
# Check what's using port 4000
sudo lsof -i :4000

# Kill the process if needed
sudo kill -9 $(sudo lsof -t -i:4000)
```

### Issue 3: Environment Variables Missing
```bash
# Check environment variables
pm2 env 0

# Set required environment variables
export NODE_ENV=production
export PORT=4000
export BASE_URL=https://shithaa.in
```

### Issue 4: Database Connection Issues
```bash
# Check MongoDB connection
mongo --eval "db.adminCommand('ping')"

# Check if MongoDB is running
sudo systemctl status mongod
```

## 📊 Step-by-Step Recovery

### Step 1: Stop All Services
```bash
pm2 stop all
sudo systemctl stop nginx
```

### Step 2: Check System Resources
```bash
df -h
free -h
```

### Step 3: Restart Backend
```bash
cd /var/www/shithaa-ecom/backend
pm2 start ecosystem.config.js
pm2 logs --lines 20
```

### Step 4: Test Backend
```bash
curl http://localhost:4000/api/cors-test
```

### Step 5: Restart Nginx
```bash
sudo systemctl start nginx
sudo systemctl status nginx
```

### Step 6: Test External Access
```bash
curl https://shithaa.in/api/cors-test
```

## 🚨 Emergency Commands

### If PM2 is not working:
```bash
# Kill all Node.js processes
pkill -f node

# Start application manually
cd /var/www/shithaa-ecom/backend
node server.js
```

### If Nginx is blocking:
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx configuration
sudo nginx -t
```

### If database is the issue:
```bash
# Restart MongoDB
sudo systemctl restart mongod

# Check MongoDB status
sudo systemctl status mongod
```

## 📝 Expected Results

### After Successful Fix:
1. **PM2 Status**: Shows application as "online"
2. **Local Test**: `curl http://localhost:4000/api/cors-test` returns JSON
3. **External Test**: `curl https://shithaa.in/api/cors-test` returns JSON
4. **Frontend**: No more 502 errors in browser console

### Success Indicators:
```
✅ PM2: online
✅ Local API: responding
✅ External API: responding
✅ Frontend: no 502 errors
✅ Admin Panel: can fetch data
```

## 🔮 Quick Test Commands

### Test Backend Health:
```bash
# Test basic endpoint
curl http://localhost:4000/api/cors-test

# Test with CORS headers
curl -H "Origin: https://admin.shithaa.in" http://localhost:4000/api/cors-test

# Test authentication endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/user/auth/profile
```

### Test External Access:
```bash
# Test CORS endpoint
curl https://shithaa.in/api/cors-test

# Test orders endpoint
curl https://shithaa.in/api/orders

# Test with proper headers
curl -H "Origin: https://admin.shithaa.in" https://shithaa.in/api/orders
```

## 🚨 If All Else Fails

### Emergency Restart:
```bash
# Complete system restart
sudo reboot

# After reboot, start services
cd /var/www/shithaa-ecom/backend
pm2 start ecosystem.config.js
sudo systemctl start nginx
```

### Check for System Issues:
```bash
# Check system logs
sudo journalctl -u nginx
sudo journalctl -u mongod

# Check for any system errors
dmesg | tail -20
```

---

**Status**: 🚨 **EMERGENCY** - Server not responding, immediate action required.

**Priority**: Get backend server running first, then test API endpoints.

**Next Steps**: Run the emergency fixes in order until the server responds. 