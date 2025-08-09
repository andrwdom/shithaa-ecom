# Email Notification Setup Guide

## Overview
This guide explains how to set up email notifications for order status changes in your Shithaa e-commerce admin panel.

## Environment Variables Required

Add these variables to your `.env` file:

```env
# Email Configuration for Order Notifications
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
FRONTEND_URL=https://shithaa.com
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Enable 2-factor authentication

2. **Generate App Password**
   - Visit: https://support.google.com/accounts/answer/185833
   - Generate a new app password for "Mail"
   - Use this as your `EMAIL_PASS` value

3. **Configure Environment**
   ```env
   EMAIL_USER=your-business-email@gmail.com
   EMAIL_PASS=generated-app-password
   ```

## Alternative Email Services

### SendGrid
```javascript
// Update createTransporter in utils/emailService.js
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY
    }
  });
};
```

### Mailgun
```javascript
// Update createTransporter in utils/emailService.js
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: 'smtp.mailgun.org',
    port: 587,
    auth: {
      user: process.env.MAILGUN_USERNAME,
      pass: process.env.MAILGUN_PASSWORD
    }
  });
};
```

## Email Templates

The system automatically sends emails for these status changes:

### 1. Pending → Processing
- **Subject**: "Your order is being prepared #ORDER_ID"
- **Content**: Preparation notification with order details

### 2. Processing → Shipped
- **Subject**: "🚚 Your order is on the way! Track #ORDER_ID"
- **Content**: Shipping details with tracking information
- **Includes**: Courier partner, tracking ID, tracking link

### 3. Shipped → Delivered
- **Subject**: "Order Delivered - Thank you for shopping with us! #ORDER_ID"
- **Content**: Delivery confirmation and feedback request

### 4. Any Status → Cancelled
- **Subject**: "Order Cancelled #ORDER_ID"
- **Content**: Cancellation notice with refund information

## Courier Tracking URLs

The system supports these courier services:

- **DTDC**: https://www.dtdc.in/trace.asp
- **ST Courier**: https://stcourier.com/track/shipment
- **XpressBees**: https://www.xpressbees.com/shipment/tracking
- **India Post**: https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx
- **Delhivery**: https://www.delhivery.com/track/package
- **Blue Dart**: https://www.bluedart.com/tracking
- **Ecom Express**: https://ecomexpress.in/tracking/

## Testing Email Configuration

1. **Start your server** with email configuration
2. **Create a test order** in your system
3. **Change order status** through admin panel
4. **Check email delivery** (including spam folder)

### Debug Email Issues

```javascript
// Add to utils/emailService.js for debugging
console.log('Email config:', {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS ? '***configured***' : 'NOT SET'
});
```

## Email Flow

```
Admin Changes Status
        ↓
Order Controller → updateStatus()
        ↓
Email Service → sendOrderStatusUpdate() or sendShippingNotification()
        ↓
Customer Receives Email
        ↓
Customer Can Track Order (if shipped)
```

## Customization

### Brand Colors
Update these in the email templates:
- Primary: `#4D1E64` (Shithaa Purple)
- Secondary: `#6B2C7A` (Lighter Purple)
- Accent: Various status colors

### Email Content
Modify the `getStatusEmailContent()` function in `utils/emailService.js` to customize:
- Subject lines
- Email messages
- Call-to-action buttons
- Support information

## Production Checklist

- [ ] Email credentials configured
- [ ] FRONTEND_URL set correctly
- [ ] Test email delivery
- [ ] Check spam folder behavior
- [ ] Verify tracking links work
- [ ] Test all status transitions
- [ ] Monitor email delivery rates

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check EMAIL_USER and EMAIL_PASS
   - Verify 2FA and app password for Gmail
   - Check server logs for SMTP errors

2. **Emails going to spam**
   - Use a business email domain
   - Set up SPF/DKIM records
   - Consider using SendGrid/Mailgun

3. **Tracking links not working**
   - Verify courier partner names match exactly
   - Check tracking URL formats
   - Test tracking IDs manually

4. **Missing customer emails**
   - Ensure orders have shippingInfo.email
   - Check order data structure
   - Add fallback email fields

## Support

For technical issues with email setup, check:
1. Server logs for SMTP errors
2. Email service provider documentation
3. Nodemailer troubleshooting guides