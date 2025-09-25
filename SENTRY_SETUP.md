# Sentry Error Monitoring Setup

## What I've Added (Non-Intrusive)

✅ **Frontend Sentry Configuration:**
- `frontend/sentry.client.config.js` - Client-side error tracking
- `frontend/sentry.server.config.js` - Server-side error tracking  
- `frontend/sentry.edge.config.js` - Edge runtime error tracking

✅ **Backend Sentry Integration:**
- Added Sentry import to `backend/server.js`
- Added Sentry initialization (only in production)
- Added Sentry request handler middleware
- Added Sentry error handler middleware

## How It Works

🔒 **Safe & Non-Breaking:**
- Only activates when `NODE_ENV=production` AND `SENTRY_DSN` is set
- If Sentry DSN is not provided, app works normally
- No changes to existing error handling logic
- All existing functionality preserved

## To Enable Error Monitoring (Optional)

1. **Get Sentry DSN:**
   - Go to https://sentry.io/
   - Create account/project
   - Get DSN from Project Settings → Client Keys

2. **Add to Environment Variables:**
   ```bash
   # Add to backend/.env
   SENTRY_DSN=your_sentry_dsn_here
   
   # Add to frontend/.env.local
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
   ```

3. **Deploy:**
   - Sentry will automatically start monitoring errors in production
   - No code changes needed

## What Gets Monitored

- Unhandled JavaScript errors
- API errors and exceptions
- Performance issues
- User sessions and interactions
- Database errors
- Payment failures

## Benefits

- Real-time error alerts
- Error grouping and prioritization
- User context and session replay
- Performance monitoring
- Release tracking
- Custom error boundaries

## Cost

- Free tier: 5,000 errors/month
- Perfect for small to medium e-commerce sites
- No impact on app performance
