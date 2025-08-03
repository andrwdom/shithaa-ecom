# Server Troubleshooting Guide

## 🚨 Current Issues
1. **CORS Error**: `Access to XMLHttpRequest at 'https://shithaa.in/api/orders' from origin 'https://admin.shithaa.in' has been blocked by CORS policy`
2. **502 Bad Gateway**: `nginx/1.18.0 (Ubuntu)` - Server connectivity issue

## 🔍 Root Cause Analysis

### 502 Bad Gateway Error
The 502 Bad Gateway error indicates that Nginx (reverse proxy) cannot connect to the Node.js backend server. This is likely the primary issue causing both the CORS and connectivity problems.

## 🛠️ Immediate Fixes

### 1. **Check Server Status**
```bash
# Check if Node.js application is running
pm2 status

# Check if the application is listening on the correct port
netstat -tlnp | grep :4000

# Check application logs
pm2 logs --lines 100
```

### 2. **Restart Services**
```bash
# Restart the Node.js application
pm2 restart all

# Restart Nginx
sudo systemctl restart nginx

# Check Nginx status
sudo systemctl status nginx
```

### 3. **Check Nginx Configuration**
The issue might be in your Nginx configuration. Check `/etc/nginx/sites-available/shithaa.conf`:

```nginx
server {
    listen 80;
    server_name shithaa.in www.shithaa.in;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shithaa.in www.shithaa.in;
    
    # SSL configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # API proxy configuration
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' 'https://admin.shithaa.in' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, token, x-requested-with, Accept, Origin, X-Requested-With, Cache-Control' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://admin.shithaa.in' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, token, x-requested-with, Accept, Origin, X-Requested-With, Cache-Control' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Static files
    location /images/ {
        alias /var/www/shithaa-ecom/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Other static files
    location /uploads/ {
        alias /var/www/shithaa-ecom/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4. **Check Application Logs**
```bash
# Check PM2 logs
pm2 logs --lines 50

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log
```

### 5. **Test Backend Directly**
```bash
# Test if the backend is running locally
curl http://localhost:4000/api/cors-test

# Test with proper headers
curl -H "Origin: https://admin.shithaa.in" http://localhost:4000/api/cors-test
```

## 🔧 Emergency Fixes

### 1. **Temporary CORS Bypass** (for testing only)
If the server is working but CORS is still an issue, you can temporarily allow all origins:

```javascript
// In backend/server.js - TEMPORARY FIX
const corsOptions = {
    origin: true, // Allow all origins temporarily
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token', 'x-requested-with', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control']
};
```

### 2. **Check Environment Variables**
```bash
# Check if the application is using the correct environment
pm2 env 0

# Check if BASE_URL is set correctly
echo $BASE_URL
```

### 3. **Verify Port Configuration**
```bash
# Check what's running on port 4000
sudo lsof -i :4000

# Check if the application is binding to the correct interface
netstat -tlnp | grep :4000
```

## 📊 Diagnostic Commands

### 1. **Server Health Check**
```bash
# Check if the server is responding
curl -I https://shithaa.in/api/cors-test

# Check with different user agent
curl -H "User-Agent: Mozilla/5.0" https://shithaa.in/api/cors-test
```

### 2. **Network Connectivity**
```bash
# Test DNS resolution
nslookup shithaa.in

# Test port connectivity
telnet shithaa.in 443

# Test local backend
telnet localhost 4000
```

### 3. **SSL Certificate Check**
```bash
# Check SSL certificate
openssl s_client -connect shithaa.in:443 -servername shithaa.in
```

## 🚨 Common Solutions

### 1. **If PM2 is not running the app**
```bash
# Start the application
pm2 start ecosystem.config.js

# Or start manually
pm2 start server.js --name "shithaa-backend"
```

### 2. **If Nginx is not configured properly**
```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. **If the application is crashing**
```bash
# Check for errors in the application
pm2 logs --lines 100

# Restart with fresh logs
pm2 restart all --update-env
```

## 📝 Step-by-Step Resolution

### Step 1: Check Server Status
```bash
pm2 status
```

### Step 2: Check Application Logs
```bash
pm2 logs --lines 50
```

### Step 3: Test Local Backend
```bash
curl http://localhost:4000/api/cors-test
```

### Step 4: Check Nginx Configuration
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Step 5: Restart Services
```bash
pm2 restart all
sudo systemctl restart nginx
```

### Step 6: Test External Access
```bash
curl -H "Origin: https://admin.shithaa.in" https://shithaa.in/api/cors-test
```

## 🔮 Expected Results

### After Fixes:
1. **PM2 Status**: Application should show as "online"
2. **Local Test**: `curl http://localhost:4000/api/cors-test` should return JSON
3. **External Test**: `curl https://shithaa.in/api/cors-test` should return JSON
4. **CORS Test**: Browser should be able to fetch from admin panel

### Success Indicators:
```
✅ PM2: online
✅ Local API: responding
✅ External API: responding
✅ CORS: headers present
✅ Admin Panel: can fetch orders
```

## 🚨 Emergency Contact

If the issue persists after following these steps:

1. **Check server resources**: `htop` or `top`
2. **Check disk space**: `df -h`
3. **Check memory usage**: `free -h`
4. **Check if the server is overloaded**

---

**Status**: 🔧 **IN PROGRESS** - Server troubleshooting required.

**Priority**: Fix 502 Bad Gateway first, then address CORS issues.

**Next Steps**: Run diagnostic commands and check server status. 