# CORS Troubleshooting Guide

## 🚨 Current Issue
```
Access to XMLHttpRequest at 'https://shithaa.in/api/orders' from origin 'https://admin.shithaa.in' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔧 CORS Configuration Updates

### 1. **Enhanced CORS Configuration** ✅ UPDATED
**File**: `backend/server.js`

#### Updated Allowed Origins:
```javascript
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://shithaa.in',
    'https://admin.shithaa.in',
    'https://shitha-frontend.vercel.app',
    'https://admin.shithaa.com',
    'https://shithaa.com',
    'https://www.shithaa.in',
    'https://www.admin.shithaa.in'
];
```

#### Enhanced CORS Options:
```javascript
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('CORS: No origin provided, allowing request');
            return callback(null, true);
        }
        
        // Debug logging
        console.log('CORS Request from origin:', origin);
        console.log('Allowed origins:', allowedOrigins);
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            console.log('CORS: Origin allowed:', origin);
            return callback(null, true);
        }
        
        // Additional check for subdomains
        const originHost = new URL(origin).hostname;
        const isSubdomain = allowedOrigins.some(allowed => {
            try {
                const allowedHost = new URL(allowed).hostname;
                return originHost === allowedHost || originHost.endsWith('.' + allowedHost);
            } catch (e) {
                return false;
            }
        });
        
        if (isSubdomain) {
            console.log('CORS: Subdomain allowed:', origin);
            return callback(null, true);
        }
        
        console.log('CORS: Origin blocked:', origin);
        return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'token',
        'x-requested-with',
        'Accept',
        'Origin',
        'X-Requested-With',
        'Cache-Control'
    ],
    exposedHeaders: [
        'Content-Range',
        'X-Content-Range',
        'X-Total-Count'
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
};
```

### 2. **Fallback CORS Handler** ✅ ADDED
```javascript
// Add a fallback CORS handler for any missed requests
app.use((req, res, next) => {
    // Set CORS headers for all responses
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, token, x-requested-with, Accept, Origin, X-Requested-With, Cache-Control');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
});
```

### 3. **Debug Endpoints** ✅ ADDED
```javascript
// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log('CORS test endpoint hit');
  console.log('Origin:', req.headers.origin);
  console.log('Referer:', req.headers.referer);
  res.json({ 
    success: true, 
    message: 'CORS test successful',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});
```

## 🧪 Testing Steps

### Step 1: Test CORS Configuration
1. **Test the CORS endpoint**:
   ```bash
   curl -H "Origin: https://admin.shithaa.in" https://shithaa.in/api/cors-test
   ```

2. **Check browser console**:
   ```javascript
   fetch('https://shithaa.in/api/cors-test')
     .then(response => response.json())
     .then(data => console.log(data))
     .catch(error => console.error('CORS Error:', error));
   ```

### Step 2: Test Orders Endpoint
1. **Direct API test**:
   ```bash
   curl -H "Origin: https://admin.shithaa.in" https://shithaa.in/api/orders
   ```

2. **Browser test**:
   ```javascript
   fetch('https://shithaa.in/api/orders')
     .then(response => response.json())
     .then(data => console.log(data))
     .catch(error => console.error('Orders Error:', error));
   ```

## 🔍 Debugging Commands

### Check Server Logs:
```bash
# Check if CORS requests are reaching the server
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Test Different Origins:
```bash
# Test with different origin headers
curl -H "Origin: https://admin.shithaa.in" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS https://shithaa.in/api/orders
```

## 🛠️ Common Solutions

### 1. **Nginx Configuration** (if using Nginx)
Add to your Nginx configuration:
```nginx
location /api/ {
    add_header 'Access-Control-Allow-Origin' 'https://admin.shithaa.in' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, token' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://admin.shithaa.in' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, token' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    proxy_pass http://localhost:4000;
}
```

### 2. **Environment Variables**
Check your environment variables:
```bash
# Make sure BASE_URL is set correctly
echo $BASE_URL
# Should be: https://shithaa.in
```

### 3. **Restart Services**
```bash
# Restart the Node.js application
pm2 restart all

# Restart Nginx (if using)
sudo systemctl restart nginx
```

## 📊 Expected Results

### Successful CORS Response:
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://admin.shithaa.in
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, token, x-requested-with, Accept, Origin, X-Requested-With, Cache-Control
```

### Console Logs:
```
CORS Request from origin: https://admin.shithaa.in
CORS: Origin allowed: https://admin.shithaa.in
Orders GET request received
Origin: https://admin.shithaa.in
User-Agent: Mozilla/5.0...
Found 15 orders
```

## 🚨 Emergency Fix

If the issue persists, you can temporarily allow all origins (NOT recommended for production):

```javascript
// TEMPORARY FIX - Remove after debugging
const corsOptions = {
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'token', 'x-requested-with', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control']
};
```

## 📝 Next Steps

1. **Test the CORS endpoint** first
2. **Check server logs** for CORS debugging output
3. **Verify Nginx configuration** if using reverse proxy
4. **Test with different browsers** to rule out browser-specific issues
5. **Check if the issue is specific to the orders endpoint**

---

**Status**: 🔧 **IN PROGRESS** - CORS configuration updated, testing required.

**Next Steps**: Test the updated CORS configuration and check server logs for debugging information. 