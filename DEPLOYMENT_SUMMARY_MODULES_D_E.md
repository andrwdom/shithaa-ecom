# DEPLOYMENT SUMMARY: MODULES D & E

**Date**: 2025-10-08  
**Modules**: D (Client-side/Mobile) + E (Infrastructure)  
**Priority**: HIGH — Fixes critical payment and caching issues

---

## 📋 QUICK START

### Prerequisites Checklist

- [ ] Backup current production code
- [ ] Backup current nginx config
- [ ] Export current Cloudflare settings
- [ ] Notify team of deployment window
- [ ] Prepare rollback plan

### Deployment Order

1. **Infrastructure (Module E)** — 30 minutes
2. **Client-side (Module D)** — 45 minutes
3. **Testing & Verification** — 30 minutes
4. **Total Estimated Time**: 2 hours

---

## 🚀 MODULE E: INFRASTRUCTURE DEPLOYMENT

### Step 1: Backup Current Configuration

```bash
# Backup nginx config
sudo cp /etc/nginx/sites-available/shithaa.conf /etc/nginx/sites-available/shithaa.conf.backup-$(date +%Y%m%d-%H%M%S)

# Backup application logs location config
sudo cp /etc/logrotate.d/nginx /etc/logrotate.d/nginx.backup

# Create restore script
cat > /tmp/restore-nginx.sh <<'EOF'
#!/bin/bash
BACKUP_FILE="/etc/nginx/sites-available/shithaa.conf.backup-$(ls -t /etc/nginx/sites-available/shithaa.conf.backup-* | head -n1 | grep -oP 'backup-\K[^"]*')"
sudo cp "$BACKUP_FILE" /etc/nginx/sites-available/shithaa.conf
sudo nginx -t && sudo nginx -s reload
echo "✅ Nginx config restored from backup"
EOF
chmod +x /tmp/restore-nginx.sh
```

### Step 2: Deploy New Nginx Configuration

```bash
# Copy new config
sudo cp nginx-config/shithaa-production-secure.conf /etc/nginx/sites-available/shithaa.conf

# Test configuration
sudo nginx -t

# If test passes, reload nginx (zero downtime)
sudo nginx -s reload

# Verify nginx is running
sudo systemctl status nginx
```

### Step 3: Configure Cloudflare

#### A. DNS Configuration (Already done, verify only)

Go to Cloudflare Dashboard → DNS

```
@ (root)     A      [VPS_IP]    Proxied ✅
www          A      [VPS_IP]    Proxied ✅
admin        A      [VPS_IP]    Proxied ✅
```

#### B. Page Rules (CRITICAL — Free plan: 3 rules max)

**Rule 1: API Bypass** (Priority: 1)
```
URL Pattern: *shithaa.in/api/*
Settings:
  ✅ Cache Level: Bypass
```

**Rule 2: Static Assets** (Priority: 2)
```
URL Pattern: *shithaa.in/_next/static/*
Settings:
  ✅ Cache Level: Cache Everything
  ✅ Edge Cache TTL: 1 year
  ✅ Browser Cache TTL: 1 year
```

**Rule 3: Product Images** (Priority: 3)
```
URL Pattern: *shithaa.in/images/*
Settings:
  ✅ Cache Level: Cache Everything
  ✅ Edge Cache TTL: 1 month
  ✅ Browser Cache TTL: 1 week
```

#### C. SSL/TLS Settings

Navigate to: **SSL/TLS**

- **Encryption mode**: Full (Strict) ✅
- **Always Use HTTPS**: ON ✅
- **Automatic HTTPS Rewrites**: ON ✅
- **Minimum TLS Version**: TLS 1.2 ✅
- **TLS 1.3**: ON ✅

#### D. Speed Optimization

Navigate to: **Speed → Optimization**

- **Auto Minify**:
  - JavaScript: ON ✅
  - CSS: ON ✅
  - HTML: ON ✅
- **Brotli**: ON ✅
- **Early Hints**: ON ✅

#### E. Network Settings

Navigate to: **Network**

- **HTTP/2**: ON ✅
- **HTTP/3 (QUIC)**: ON ✅
- **0-RTT**: ON ✅
- **WebSockets**: ON ✅

#### F. Firewall Rules (Optional but Recommended)

Navigate to: **Security → WAF → Create Firewall Rule**

**Rule 1: Block Bad Bots**
```
Name: block-bad-bots
Expression:
(cf.client.bot) and not (cf.verified_bot_category in {"Search Engine Crawler"})

Action: Challenge
```

**Rule 2: Rate Limit Checkout**
```
Name: rate-limit-checkout
Expression:
(http.request.uri.path contains "/api/checkout" or 
 http.request.uri.path contains "/api/payment") and
(rate(5m) > 30)

Action: Block
```

### Step 4: Verify Infrastructure

```bash
# Test 1: Verify real IP is forwarded
curl -I https://shithaa.in/api/health

# Check backend logs for actual client IP (not Cloudflare IP)
pm2 logs backend --lines 10 | grep "Client IP"

# Test 2: Verify API bypass (should NOT be cached)
curl -I https://shithaa.in/api/products
# Look for: cf-cache-status: BYPASS or MISS

# Test 3: Verify static caching
curl -I https://shithaa.in/_next/static/chunks/main.js
curl -I https://shithaa.in/_next/static/chunks/main.js  # Second request
# Look for: cf-cache-status: HIT on second request

# Test 4: Verify payment endpoint NOT cached
curl -I https://shithaa.in/api/checkout/session/test123
# Look for: Cache-Control: no-cache, no-store, must-revalidate
```

---

## 💻 MODULE D: CLIENT-SIDE DEPLOYMENT

### Step 1: Backup Current Frontend

```bash
# Backup current frontend build
cd /var/www/shithaa-ecom/frontend
cp -r .next .next.backup-$(date +%Y%m%d-%H%M%S)

# Create restore script
cat > /tmp/restore-frontend.sh <<'EOF'
#!/bin/bash
cd /var/www/shithaa-ecom/frontend
BACKUP_DIR=$(ls -td .next.backup-* | head -n1)
rm -rf .next
cp -r "$BACKUP_DIR" .next
pm2 restart frontend
echo "✅ Frontend restored from backup"
EOF
chmod +x /tmp/restore-frontend.sh
```

### Step 2: Update Frontend Code

Apply the following patches:

#### A. Update `frontend/hooks/useCheckoutSession.ts`

Add the debounce and request deduplication logic from `MODULE_D_CLIENT_MOBILE_AUDIT.md` → **Fix #1**

Key changes:
- Add `activeRequests` map for deduplication
- Add `lastRequestTimeRef` for debounce
- Add `Idempotency-Key` header

#### B. Update `frontend/app/checkout/UnifiedCheckout.tsx`

Add the disabled guard from `MODULE_D_CLIENT_MOBILE_AUDIT.md` → **Fix #2**

Key changes:
- Add `isSubmitting` state
- Triple guard on button: `disabled={processing || isLoading || isSubmitting}`

#### C. Create `frontend/lib/instagram-utils.ts`

Copy the Instagram browser detection utilities from `MODULE_D_CLIENT_MOBILE_AUDIT.md` → **Fix #3**

#### D. Update `frontend/app/order-success/OrderSuccessClient.tsx`

Add TTL checking for cached order data from `MODULE_D_CLIENT_MOBILE_AUDIT.md` → **Fix #4**

Key changes:
- Add `MAX_CACHE_AGE = 30 * 60 * 1000`
- Check cache age before using
- Don't override server payment status

### Step 3: Update Backend CORS Headers

Edit `backend/server.js`:

```javascript
// Line 153: Add 'Idempotency-Key' to allowedHeaders
allowedHeaders: [
  'Content-Type', 
  'Authorization', 
  'token', 
  'x-requested-with', 
  'Accept', 
  'Origin',
  'Idempotency-Key',  // ADD THIS
  'X-Instagram-Browser',  // ADD THIS (optional)
  'X-In-App-Browser'  // ADD THIS (optional)
],
```

### Step 4: Build and Deploy Frontend

```bash
# Navigate to frontend directory
cd /var/www/shithaa-ecom/frontend

# Install dependencies (if any new packages added)
npm install

# Build production bundle
npm run build

# Restart Next.js with PM2
pm2 restart frontend

# Check for errors
pm2 logs frontend --lines 50
```

### Step 5: Restart Backend (for CORS changes)

```bash
# Restart backend to apply CORS header changes
pm2 restart backend

# Verify backend is healthy
curl https://shithaa.in/api/health
```

---

## 🧪 TESTING & VERIFICATION

### Automated Tests

```bash
# Run E2E tests
cd /var/www/shithaa-ecom
npm run test:e2e -- tests/e2e/instagram-checkout.spec.js

# Or run with visible browser for debugging
HEADLESS=false npm run test:e2e -- tests/e2e/instagram-checkout.spec.js
```

### Manual Testing Checklist

#### Infrastructure Tests

- [ ] Open https://shithaa.in in browser → Page loads
- [ ] Check browser console for errors → No CORS errors
- [ ] Open Network tab → Filter "api" → Check response headers
  - `/api/products` should have `cf-cache-status: BYPASS`
  - `/_next/static/*` should have `cf-cache-status: HIT` (after first load)
- [ ] Open incognito/private window → Repeat above

#### Client-Side Tests (Desktop)

- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Fill shipping form
- [ ] **DOUBLE-CLICK** "Continue to Payment" button rapidly
- [ ] Check Network tab → Only ONE `/api/checkout/session` POST request
- [ ] Check button is disabled after first click

#### Client-Side Tests (Mobile - Instagram)

- [ ] Open Instagram app on mobile
- [ ] Send yourself DM with link: https://shithaa.in
- [ ] Click link (opens in Instagram in-app browser)
- [ ] Add product to cart
- [ ] Proceed to checkout
- [ ] Fill form and submit
- [ ] Verify no CORS errors
- [ ] Verify checkout completes successfully

#### Payment Flow Test

- [ ] Complete checkout flow
- [ ] Proceed to PhonePe payment
- [ ] Complete payment (use test mode if available)
- [ ] Verify order success page shows correct status
- [ ] Check order in admin panel → Status = "Confirmed", Payment = "Paid"

### Log Monitoring

```bash
# Monitor logs during testing
pm2 logs backend --lines 100 | grep -E "(checkout|payment|webhook)"

# Check for errors
pm2 logs backend --err --lines 50

# Monitor nginx access log
sudo tail -f /var/log/nginx/access.log | grep -E "(api|checkout|payment)"

# Monitor nginx error log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔄 ROLLBACK PROCEDURE

### If Issues Detected:

#### Rollback Nginx

```bash
/tmp/restore-nginx.sh
```

#### Rollback Frontend

```bash
/tmp/restore-frontend.sh
```

#### Rollback Backend

```bash
# If backend changes were made
pm2 restart backend
```

#### Rollback Cloudflare

- Go to Cloudflare Dashboard
- Navigate to **Audit Log** (Enterprise) or manually revert Page Rules
- Delete new Page Rules
- Restore original settings

---

## 📊 POST-DEPLOYMENT MONITORING

### Monitor for 24 Hours

#### Key Metrics to Watch:

1. **Error Rate**:
   ```bash
   pm2 logs backend --err --lines 1000 | grep -c "Error"
   ```
   Expected: < 10 errors per hour

2. **Checkout Success Rate**:
   ```bash
   # Count successful checkouts
   mongo shithaa --eval 'db.orders.count({createdAt: {$gte: new Date(Date.now() - 3600000)}})'
   ```
   Expected: Similar to pre-deployment

3. **Duplicate Sessions**:
   ```bash
   # Check for duplicate checkout sessions (same user, same items, < 5 seconds apart)
   mongo shithaa --eval 'db.checkoutsessions.aggregate([
     {$match: {createdAt: {$gte: new Date(Date.now() - 3600000)}}},
     {$group: {_id: "$userId", count: {$sum: 1}}},
     {$match: {count: {$gt: 1}}}
   ]).toArray()'
   ```
   Expected: 0 duplicates

4. **Cloudflare Cache Hit Rate**:
   - Go to Cloudflare Dashboard → Analytics → Performance
   - Check "Cache Hit Rate" → Should be > 70%

### Alert Thresholds

Set up alerts for:
- Error rate > 20/hour
- Checkout success rate drops > 10%
- Cache hit rate drops < 50%
- Response time > 5 seconds for 95th percentile

---

## 📝 SUCCESS CRITERIA

Deployment is successful if:

- [x] Nginx config loads without errors
- [x] Cloudflare page rules active and verified
- [x] Frontend builds and starts successfully
- [x] No CORS errors in browser console
- [x] Double-click protection prevents duplicate checkouts
- [x] Instagram in-app browser checkout works
- [x] Payment flow completes end-to-end
- [x] Order status displays correctly
- [x] Cache hit rate > 70% on Cloudflare
- [x] No increase in error rate

---

## 🆘 TROUBLESHOOTING

### Issue: Nginx fails to reload

**Solution**:
```bash
# Check syntax errors
sudo nginx -t

# Check specific error
sudo journalctl -u nginx -n 50

# Rollback
/tmp/restore-nginx.sh
```

### Issue: Frontend build fails

**Solution**:
```bash
# Check Node.js version
node --version  # Should be >= 18

# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Issue: CORS errors in browser

**Solution**:
```bash
# Verify backend CORS config
pm2 logs backend | grep "cors"

# Verify nginx passes correct headers
curl -I -H "Origin: https://www.instagram.com" https://shithaa.in/api/products
# Should have: access-control-allow-origin header

# Restart backend
pm2 restart backend
```

### Issue: Cloudflare not caching

**Solution**:
- Go to Cloudflare → Caching → Configuration
- Click "Purge Everything"
- Wait 5 minutes
- Test again: `curl -I https://shithaa.in/_next/static/chunks/main.js` (twice)

### Issue: Duplicate checkouts still happening

**Solution**:
```bash
# Check client-side code was deployed
curl https://shithaa.in/_next/static/chunks/hooks-useCheckoutSession.js | grep "Idempotency-Key"

# If not found, rebuild frontend
cd /var/www/shithaa-ecom/frontend
npm run build
pm2 restart frontend
```

---

## 📞 SUPPORT CONTACTS

- **DevOps**: [Your Name] - [Phone]
- **Backend**: [Backend Dev] - [Phone]
- **Frontend**: [Frontend Dev] - [Phone]
- **Cloudflare Support**: Enterprise support (if available)
- **Hosting Provider**: [VPS Provider] - [Support URL]

---

## 📚 DOCUMENTATION REFERENCES

- **Module D Audit**: `MODULE_D_CLIENT_MOBILE_AUDIT.md`
- **Module E Audit**: `MODULE_E_INFRASTRUCTURE_AUDIT.md`
- **Nginx Config**: `nginx-config/shithaa-production-secure.conf`
- **E2E Tests**: `tests/e2e/instagram-checkout.spec.js`
- **Cloudflare Guide**: `CLOUDFLARE_SETUP_GUIDE.md`

---

**Deployment Checklist Complete**: Ready to deploy!

**Estimated Downtime**: 0 minutes (rolling updates)

**Risk Level**: MEDIUM (infrastructure changes require careful monitoring)

**Recommended Deployment Window**: Off-peak hours (2 AM - 6 AM IST)

