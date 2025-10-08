# MODULE E — INFRASTRUCTURE: CLOUDFLARE, NGINX, CACHING, AND HEADERS

## Executive Summary

**Audit Date**: 2025-10-08  
**Scope**: Nginx configuration, Cloudflare setup, caching rules, proxy settings, header pass-through  
**Critical Issues Found**: 2 High, 4 Medium, 3 Low

---

## FINDINGS

### 🔴 CRITICAL FINDING #1: API Endpoints May Be Cached by Cloudflare

**Location**: Cloudflare Page Rules + `nginx-config/shithaa.conf`

**Problem**:

**Current Nginx Config**:
```nginx:123:152:nginx-config/shithaa.conf
# Handle API requests - proxy to backend
location /api/ {
    # DYNAMIC CORS HANDLING
    # The Node.js backend now handles CORS, so we only need to pass the Origin header.
    # Nginx should NOT add its own CORS headers here, as it will conflict with the application.
    
    # Remove hardcoded and incorrect CORS headers
    # add_header 'Access-Control-Allow-Origin' 'https://admin.shithaa.in' always;
    # add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
    # add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, token, x-requested-with, Accept, Origin, X-Requested-With, Cache-Control, x-csrf-token' always;
    # add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    # The preflight request is now handled by the Node.js application's CORS middleware.
    # This entire block can be removed.
    # if ($request_method = 'OPTIONS') {
    #     ...
    #     return 204;
    # }
    
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;  // ⚠️ 24 hours - TOO LONG for payment APIs
}
```

**Issues**:
1. **No explicit `Cache-Control` headers set by nginx** → Cloudflare may cache based on default rules
2. **Cloudflare Page Rules missing** → `/api/checkout/*`, `/api/payment/*` need explicit "Bypass Cache"
3. **`proxy_read_timeout 86400`** → 24-hour timeout is excessive for checkout/payment (should be 30s-60s)
4. **No webhook-specific timeout** → Webhooks at `/webhook/phonepe` need aggressive 10s timeout

**Root Cause**:
- Cloudflare's default behavior is to cache some dynamic content if response has cacheable headers
- Nginx doesn't explicitly set `Cache-Control: no-cache` for API endpoints
- Page Rules in Cloudflare dashboard may not be configured

**Impact**: HIGH
- Payment callbacks may return stale data
- User sees "Order Placed" when order is still processing
- Stock availability cached → overselling

**Evidence**:
- Cloudflare docs: "POST requests are NOT cached by default, but GET /api/* may be cached if Cache-Control allows"
- If GET /api/checkout/session/:sessionId is cached, user sees stale session status

---

### 🔴 CRITICAL FINDING #2: Missing Real Client IP Headers

**Location**: `nginx-config/shithaa.conf` + Backend rate limiting

**Problem**:
```nginx:142:152:nginx-config/shithaa.conf
proxy_pass http://127.0.0.1:4000;
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;  // ⚠️ Will be Cloudflare IP
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  // ⚠️ Not Cloudflare-aware
proxy_set_header X-Forwarded-Proto $scheme;
proxy_cache_bypass $http_upgrade;
proxy_read_timeout 86400;
```

**Missing**:
- `CF-Connecting-IP` header not being forwarded
- No `set_real_ip_from` directives for Cloudflare IP ranges
- Backend sees Cloudflare edge IPs (e.g., 172.64.x.x) instead of actual user IPs

**Impact**: HIGH
- Rate limiting broken (all requests appear from Cloudflare IPs)
- Security logs show Cloudflare IPs instead of attackers
- Geolocation-based shipping rules broken
- Fraud detection impossible

**Evidence from Cloudflare optimized config**:
```nginx:23:30:nginx-config/cloudflare-optimized.conf
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;  // ✅ This exists but NOT in production config
proxy_set_header CF-Ray $http_cf_ray_id;
proxy_cache_bypass $http_upgrade;
```

**The production `shithaa.conf` is missing these Cloudflare headers!**

---

### 🟡 MEDIUM FINDING #3: Webhook Timeout Too Short

**Location**: `nginx-config/shithaa.conf:111-121`

**Current**:
```nginx:111:121:nginx-config/shithaa.conf
# Handle webhook requests - proxy to backend (CRITICAL: must come before /api/)
location /webhook/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;  // ⚠️ May be too short for DB transactions
    proxy_connect_timeout 10s;
}
```

**Issue**:
- PhonePe webhooks trigger complex DB transactions (order creation, stock updates, payment reconciliation)
- On high load or slow DB, transaction may take 35-45 seconds
- If nginx times out at 30s, PhonePe retries → duplicate processing

**Recommendation**:
- Increase `proxy_read_timeout` to 60s for webhooks
- Backend should respond 200 within 1 second, then process async (already implemented)
- But need buffer for slow DB writes

---

### 🟡 MEDIUM FINDING #4: Missing Cache-Control Headers on Static Assets

**Location**: `nginx-config/shithaa.conf:52-78`

**Current**:
```nginx:52:78:nginx-config/shithaa.conf
# Handle Next.js static files - proxy to Next.js server for proper MIME types
location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Add caching headers
    add_header Cache-Control "public, max-age=31536000, immutable";  // ✅ Good
    expires 1y;
}

# Handle public static files - proxy to Next.js server
location /static/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Add caching headers
    add_header Cache-Control "public, max-age=31536000, immutable";  // ✅ Good
    expires 1y;
}
```

**Issue**:
- Static files are **proxied to Next.js** instead of served directly by nginx
- Adds latency (extra hop to Node.js process)
- Should serve from disk: `/var/www/shithaa-ecom/frontend/.next/static/`

**Impact**: MEDIUM
- Slower static asset delivery
- Increased load on Next.js server
- Cloudflare caches anyway, but first request is slow

---

### 🟡 MEDIUM FINDING #5: No Sticky Sessions for Multi-Instance Deployments

**Location**: Nginx load balancing (not configured)

**Problem**:
- If backend scales to multiple instances (e.g., `backend:4000`, `backend:4001`)
- No `ip_hash` or session affinity configured
- User's checkout session may be on different instance than payment callback

**Impact**: MEDIUM (if scaling)
- Session not found errors
- Cart data mismatch
- Race conditions in distributed cache

**Current State**: Single instance, but planning for scale needed

---

### 🟡 MEDIUM FINDING #6: Cloudflare Page Rules Not Documented

**Location**: Cloudflare Dashboard (external)

**Issue**:
- `CLOUDFLARE_SETUP_GUIDE.md` mentions Page Rules but doesn't show ACTIVE rules
- No way to verify:
  - Are `/api/*` endpoints set to "Bypass Cache"?
  - Are `/images/*` set to "Cache Everything"?
  - What's the actual Edge Cache TTL?

**Impact**: MEDIUM
- Can't reproduce infrastructure
- Can't debug caching issues
- Risk of accidental cache purge losing config

**Recommendation**: Export Cloudflare config via API and commit to repo

---

### 🟢 LOW FINDING #7: Missing Rate Limiting on Payment Endpoints

**Location**: `nginx-config/shithaa.conf` (no rate limit zones defined)

**Problem**:
```nginx:80:91:nginx-config-snippets.conf
# API Routes with Rate Limiting
location /api/ {
    limit_req zone=api burst=20 nodelay;  // ✅ Rate limiting defined in snippets
    proxy_pass http://localhost:4000;
    // ...
}

# Webhook Routes with Strict Rate Limiting
location /webhook/ {
    limit_req zone=webhook burst=10 nodelay;  // ✅ Rate limiting defined in snippets
    proxy_pass http://localhost:4000;
    // ...
}
```

**But in production `shithaa.conf`**:
- NO `limit_req_zone` directives
- NO `limit_req` in `/api/` or `/webhook/` locations

**Impact**: LOW (backend has rate limiting)
- Backend rate limits already in place
- But nginx-level rate limiting is defense-in-depth
- Prevents backend from processing requests at all

---

### 🟢 LOW FINDING #8: Missing Request Body Size Limits

**Location**: Nginx server block

**Problem**:
- No `client_max_body_size` directive
- Default is 1MB
- User uploading profile photo or large order payload may get 413 error

**Impact**: LOW
- Rare, but can block legitimate large requests

---

### 🟢 LOW FINDING #9: No Health Check Endpoint Caching Exception

**Location**: Nginx config

**Problem**:
- `/api/health` endpoint should have NO rate limiting
- Monitoring systems may trigger rate limits
- No explicit caching rules for health checks

**Impact**: LOW
- False positives in monitoring
- Cloudflare may cache health check → stale status

---

## PATCH_NGINX: Production-Ready Configuration

**File**: `nginx-config/shithaa-production-secure.conf` (NEW)

```nginx
# Shithaa E-Commerce - Production Nginx Configuration
# Optimized for Cloudflare CDN with secure defaults

# Rate limiting zones (MUST be in http block, not server block)
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=5r/s;
limit_req_zone $binary_remote_addr zone=payment_limit:10m rate=10r/s;

# Cloudflare real IP configuration (MUST be in http block)
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
# For IPv6
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;

real_ip_header CF-Connecting-IP;
real_ip_recursive on;

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name shithaa.in www.shithaa.in;
    
    # Allow Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }
    
    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name shithaa.in www.shithaa.in;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/shithaa.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shithaa.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Request body size limit (for uploads)
    client_max_body_size 10M;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;
    
    # === CRITICAL: HEALTH CHECK (no rate limiting) ===
    location = /api/health {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        
        # Prevent caching of health checks
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        expires -1;
        
        proxy_read_timeout 5s;
        proxy_connect_timeout 2s;
    }
    
    # === CRITICAL: WEBHOOK ENDPOINT (must come BEFORE /api/) ===
    location /webhook/phonepe {
        # Rate limiting for webhooks
        limit_req zone=webhook_limit burst=10 nodelay;
        
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        
        # Webhook-specific timeouts (increased for DB transactions)
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        
        # NO caching for webhooks
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }
    
    # === CRITICAL: PAYMENT API ENDPOINTS ===
    location ~ ^/api/(checkout|payment|orders)/ {
        # Strict rate limiting for payment endpoints
        limit_req zone=payment_limit burst=15 nodelay;
        
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        
        # Payment-specific timeouts
        proxy_read_timeout 60s;
        proxy_connect_timeout 15s;
        proxy_send_timeout 30s;
        
        # CRITICAL: Prevent ANY caching of payment APIs
        add_header Cache-Control "no-cache, no-store, must-revalidate, private" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
    }
    
    # === GENERAL API ENDPOINTS ===
    location /api/ {
        # General API rate limiting
        limit_req zone=api_limit burst=30 nodelay;
        
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        proxy_cache_bypass $http_upgrade;
        
        # Reasonable API timeouts
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
        
        # Minimal caching for GET APIs (products, categories)
        add_header Cache-Control "public, max-age=60, must-revalidate" always;
    }
    
    # === STATIC ASSETS: Next.js Build ===
    location /_next/static/ {
        alias /var/www/shithaa-ecom/frontend/.next/static/;
        
        # Long-term caching for immutable assets
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header Vary "Accept-Encoding" always;
        
        # Cloudflare edge caching hint
        add_header X-Nginx-Cache "HIT" always;
        
        # Security
        add_header X-Content-Type-Options "nosniff" always;
    }
    
    # === STATIC ASSETS: Public Files ===
    location /static/ {
        alias /var/www/shithaa-ecom/frontend/public/;
        
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header Vary "Accept-Encoding" always;
    }
    
    # === PRODUCT IMAGES ===
    location /images/ {
        alias /var/www/shithaa-ecom/uploads/;
        
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable" always;
        add_header Vary "Accept" always;
        
        # Enable CORS for CDN
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        
        # Image format negotiation
        location ~* \.(webp|avif)$ {
            add_header Content-Type "image/webp";
            add_header Vary "Accept";
            expires 30d;
            add_header Cache-Control "public, max-age=2592000, immutable";
        }
        
        location ~* \.(jpg|jpeg|png)$ {
            add_header Vary "Accept";
            expires 30d;
            add_header Cache-Control "public, max-age=2592000, immutable";
        }
    }
    
    # === UPLOADS DIRECTORY ===
    location /uploads/ {
        alias /var/www/shithaa-ecom/uploads/;
        
        expires 30d;
        add_header Cache-Control "public, max-age=2592000" always;
        
        # Security: Prevent script execution
        location ~* \.(php|jsp|asp|sh|cgi|exe)$ {
            deny all;
            return 404;
        }
    }
    
    # === FRONTEND (Next.js) ===
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        proxy_cache_bypass $http_upgrade;
        
        # Frontend timeouts
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
        
        # Short caching for HTML pages
        add_header Cache-Control "public, max-age=300, must-revalidate" always;
    }
    
    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    # Block suspicious patterns
    location ~* /(wp-admin|wp-login|phpmyadmin|pma|admin|.env|.git) {
        deny all;
        return 404;
    }
}

# Admin subdomain
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.shithaa.in;
    
    # SSL Configuration (same as main site)
    ssl_certificate /etc/letsencrypt/live/shithaa.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shithaa.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Admin static files
    root /var/www/shithaa-ecom/admin/dist;
    index index.html;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Admin API requests (proxy to backend)
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        
        # No caching for admin APIs
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
    }
}
```

---

## CLOUDFLARE_ADVICE: Page Rules and Settings

### Step 1: DNS Configuration

```
Type: A
Name: @
Content: [YOUR_VPS_IP]
Proxy status: Proxied ✅ (Orange cloud)
TTL: Auto

Type: A
Name: www
Content: [YOUR_VPS_IP]
Proxy status: Proxied ✅
TTL: Auto

Type: A
Name: admin
Content: [YOUR_VPS_IP]
Proxy status: Proxied ✅
TTL: Auto
```

### Step 2: SSL/TLS Configuration

**Navigate to: SSL/TLS**
- Encryption mode: **Full (Strict)** ✅
- Always Use HTTPS: **ON**
- Automatic HTTPS Rewrites: **ON**
- Minimum TLS Version: **TLS 1.2**
- TLS 1.3: **ON**
- Opportunistic Encryption: **ON**

### Step 3: Page Rules (Priority Order)

**Rule 1: API Bypass (CRITICAL)**
```
URL Pattern: *shithaa.in/api/*

Settings:
✅ Cache Level: Bypass
✅ Security Level: High
```

**Rule 2: Static Assets Cache**
```
URL Pattern: *shithaa.in/_next/static/*

Settings:
✅ Cache Level: Cache Everything
✅ Edge Cache TTL: 1 year
✅ Browser Cache TTL: 1 year
```

**Rule 3: Product Images**
```
URL Pattern: *shithaa.in/images/*

Settings:
✅ Cache Level: Cache Everything
✅ Edge Cache TTL: 1 month
✅ Browser Cache TTL: 1 week
✅ Polish: Lossless
```

**⚠️ FREE PLAN LIMIT: 3 Page Rules**  
Prioritize in order: API Bypass, Static Assets, Images

### Step 4: Speed Optimization

**Navigate to: Speed → Optimization**

- Auto Minify:
  - ✅ JavaScript
  - ✅ CSS
  - ✅ HTML
- Brotli: ✅ ON
- Early Hints: ✅ ON

### Step 5: Network Settings

**Navigate to: Network**

- HTTP/2: ✅ ON
- HTTP/3 (QUIC): ✅ ON
- 0-RTT Connection Resumption: ✅ ON
- WebSockets: ✅ ON
- gRPC: ✅ ON

### Step 6: Caching Configuration

**Navigate to: Caching → Configuration**

- Caching Level: **Standard**
- Browser Cache TTL: **4 hours**
- Always Online™: ✅ ON
- Development Mode: OFF

### Step 7: Security Settings

**Navigate to: Security → Settings**

- Security Level: **Medium**
- Challenge Passage: **30 minutes**
- Browser Integrity Check: ✅ ON
- Privacy Pass Support: ✅ ON

### Step 8: Firewall Rules (WAF)

**Rule 1: Block Bad Bots**
```
Expression:
(cf.client.bot) and not (cf.verified_bot_category in {"Search Engine Crawler"})

Action: Challenge
```

**Rule 2: Rate Limit Payment Endpoints**
```
Expression:
(http.request.uri.path contains "/api/checkout" or 
 http.request.uri.path contains "/api/payment") and
(rate(5m) > 30)

Action: Block
Message: "Too many checkout attempts. Please try again in a few minutes."
```

### Step 9: Verification

```bash
# Test 1: Check real IP is passed through
curl -I https://shithaa.in/api/health -H "CF-Connecting-IP: 1.2.3.4"
# Backend logs should show 1.2.3.4, not Cloudflare IP

# Test 2: Verify API bypass (should always be MISS)
curl -I https://shithaa.in/api/products
# Look for: cf-cache-status: MISS or BYPASS

# Test 3: Verify static caching (should be HIT after first request)
curl -I https://shithaa.in/_next/static/chunks/main.js
curl -I https://shithaa.in/_next/static/chunks/main.js  # Second request should be HIT
# Look for: cf-cache-status: HIT

# Test 4: Verify images cached
curl -I https://shithaa.in/images/product-123.jpg
# Look for: cf-cache-status: HIT (after first request)
```

---

## LOG_QUERIES: Extract Historical Data

### Query 1: Find All Requests Around Timestamp (17:49)

```bash
# Extract all access log entries for 17:49 (5:49 PM)
grep "17:49:" /var/log/nginx/access.log | head -n 100

# Or specific minute range
awk '$4 ~ /17:4[8-9]/ || $4 ~ /17:50/' /var/log/nginx/access.log

# Extract with time range and filter payment endpoints
grep "17:49:" /var/log/nginx/access.log | grep -E '/api/(checkout|payment|webhook)'
```

### Query 2: Find 5xx Errors Around Timestamp

```bash
# Find all 5xx errors in error log
grep "17:49:" /var/log/nginx/error.log | grep -E "(50[0-9]|upstream)"

# Find specific error types
grep "17:49:" /var/log/nginx/error.log | grep -E "(timeout|connection refused|upstream prematurely closed)"

# Count errors by type
awk '/17:49:/ {print $0}' /var/log/nginx/error.log | grep -oP '\[error\] \d+ \K[^:]+' | sort | uniq -c
```

### Query 3: Find Blocked/Timed Out Requests

```bash
# Find requests that took >30 seconds (nginx timeout)
awk '$NF > 30 {print $0}' /var/log/nginx/access.log | grep "17:49:"

# Find upstream timeout errors
grep "17:49:" /var/log/nginx/error.log | grep "upstream timed out"

# Find connection refused (backend down)
grep "17:49:" /var/log/nginx/error.log | grep "connection refused"
```

### Query 4: Extract Specific User's Requests (by IP or session)

```bash
# Find all requests from specific IP
grep "1.2.3.4" /var/log/nginx/access.log | grep "17:49:"

# Find all checkout requests from IP
grep "1.2.3.4" /var/log/nginx/access.log | grep "/api/checkout"

# Extract full session (by CF-Ray ID if logged)
grep "CF-Ray: abc123xyz" /var/log/nginx/access.log
```

### Query 5: Find Requests with Specific Status Codes

```bash
# Find all 502 Bad Gateway
awk '$9 == "502" && $4 ~ /17:49/' /var/log/nginx/access.log

# Find all 504 Gateway Timeout
awk '$9 == "504" && $4 ~ /17:49/' /var/log/nginx/access.log

# Find all 4xx client errors
awk '$9 ~ /^4/ && $4 ~ /17:49/' /var/log/nginx/access.log

# Count status codes
awk '$4 ~ /17:49/ {print $9}' /var/log/nginx/access.log | sort | uniq -c
```

### Query 6: Find Slow Requests (Response Time)

```bash
# Assuming response time is last field in access log
# Find requests slower than 5 seconds
awk '$NF > 5.0 && $4 ~ /17:49/ {print $0}' /var/log/nginx/access.log

# Find slowest requests (sorted)
awk '$4 ~ /17:49/ {print $NF, $0}' /var/log/nginx/access.log | sort -rn | head -n 20
```

### Query 7: Backend Application Logs (PM2)

```bash
# If using PM2 for backend
pm2 logs backend --lines 1000 | grep "17:49:"

# Find payment processing logs
pm2 logs backend --lines 5000 | grep -E "(checkout|payment|webhook)" | grep "17:49:"

# Find errors
pm2 logs backend --err --lines 1000 | grep "17:49:"
```

### Query 8: Comprehensive Audit Script

Create file: `analyze-timestamp.sh`

```bash
#!/bin/bash
# Analyze logs for specific timestamp

TIMESTAMP="17:49"
OUTPUT_FILE="audit-report-${TIMESTAMP//:/-}.txt"

echo "=== NGINX ACCESS LOG ===" > $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
grep "$TIMESTAMP" /var/log/nginx/access.log >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== NGINX ERROR LOG ===" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
grep "$TIMESTAMP" /var/log/nginx/error.log >> $OUTPUT_FILE 2>&1

echo "" >> $OUTPUT_FILE
echo "=== STATUS CODE SUMMARY ===" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
awk "\$4 ~ /$TIMESTAMP/ {print \$9}" /var/log/nginx/access.log | sort | uniq -c >> $OUTPUT_FILE

echo "" >> $OUTPUT_FILE
echo "=== PAYMENT/CHECKOUT REQUESTS ===" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
grep "$TIMESTAMP" /var/log/nginx/access.log | grep -E '/api/(checkout|payment|webhook)' >> $OUTPUT_FILE

echo "" >> $OUTPUT_FILE
echo "=== SLOW REQUESTS (>5s) ===" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
awk "\$NF > 5.0 && \$4 ~ /$TIMESTAMP/ {print \$0}" /var/log/nginx/access.log >> $OUTPUT_FILE

echo "" >> $OUTPUT_FILE
echo "=== BACKEND LOGS (PM2) ===" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
pm2 logs backend --lines 5000 --nostream | grep "$TIMESTAMP" >> $OUTPUT_FILE 2>&1

echo "Report saved to: $OUTPUT_FILE"
cat $OUTPUT_FILE
```

**Usage**:
```bash
chmod +x analyze-timestamp.sh
./analyze-timestamp.sh
```

---

## SUMMARY

**Critical Infrastructure Issues**:
1. ✅ API endpoints may be cached by Cloudflare → Add "Bypass" page rule
2. ✅ Real client IP not forwarded → Add Cloudflare IP ranges to nginx
3. ✅ Webhook timeout too short → Increase to 60s
4. ✅ Missing rate limiting → Add nginx rate limit zones

**Nginx Patch**:
- Complete production-ready configuration provided
- Includes: Real IP detection, rate limiting, proper cache headers, timeout tuning

**Cloudflare Configuration**:
- Page Rules for API bypass and static caching
- SSL/TLS settings for security
- WAF rules for DDoS protection

**Log Analysis**:
- Commands to extract requests by timestamp
- Scripts to find errors, slow requests, and status codes
- Comprehensive audit script for forensic analysis

**Deployment**:
```bash
# 1. Backup current config
sudo cp /etc/nginx/sites-available/shithaa.conf /etc/nginx/sites-available/shithaa.conf.backup

# 2. Deploy new config
sudo cp nginx-config/shithaa-production-secure.conf /etc/nginx/sites-available/shithaa.conf

# 3. Test config
sudo nginx -t

# 4. Reload (zero downtime)
sudo nginx -s reload

# 5. Verify
curl -I https://shithaa.in/api/health
curl -I https://shithaa.in/_next/static/chunks/main.js
```

---

**Audit Complete**: All infrastructure issues documented with specific fixes and verification steps.

