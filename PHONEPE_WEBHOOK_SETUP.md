# 🚨 CRITICAL: PhonePe Webhook Configuration

## 🔧 **IMMEDIATE ACTION REQUIRED:**

Your payment system is failing because **PhonePe webhooks are not configured**. This is why payments show success on PhonePe but fail on your website.

## 📋 **STEP 1: Add Environment Variables**

Run this command on your VPS:
```bash
cd /var/www/shithaa-ecom/backend
chmod +x add-webhook-env.sh
./add-webhook-env.sh
```

## 🌐 **STEP 2: Configure PhonePe Dashboard**

### **Login to PhonePe Dashboard:**
1. Go to [PhonePe Merchant Dashboard](https://merchant.phonepe.com/)
2. Login with your merchant credentials

### **Configure Webhook:**
1. Navigate to **Settings** → **Webhooks**
2. Add new webhook with these settings:
   - **Webhook URL**: `https://shithaa.in/api/payment/phonepe/webhook`
   - **Username**: `shithaa_webhook`
   - **Password**: `webhook_secure_2024`
   - **Events**: Select all payment events

## 🔑 **STEP 3: Update Your .env File**

Make sure these variables are in your `.env`:
```env
PHONEPE_CALLBACK_USERNAME=shithaa_webhook
PHONEPE_CALLBACK_PASSWORD=webhook_secure_2024
```

## 🚀 **STEP 4: Restart Services**

```bash
# Restart backend
pm2 restart shithaa-backend

# Check logs
pm2 logs shithaa-backend
```

## ✅ **STEP 5: Test Payment**

1. Make a test payment
2. Check backend logs for webhook messages
3. Payment should now work correctly

## 🚨 **WHY THIS FIXES IT:**

1. **Webhook receives payment success** from PhonePe ✅
2. **PaymentSession status updated** to 'success' ✅
3. **Verification function recognizes** webhook status ✅
4. **Payment marked as successful** ✅
5. **No more false failures** ✅

## 📞 **SUPPORT:**

If you need help with PhonePe dashboard configuration, contact their support or let me know what specific step you're stuck on.

**This is the ONLY way to fix your payment system permanently.**
