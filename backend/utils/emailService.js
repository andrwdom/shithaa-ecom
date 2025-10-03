import nodemailer from 'nodemailer';
import EnhancedLogger from './enhancedLogger.js';

/**
 * Email service for draft order recovery
 * Implements industry-standard email recovery patterns from Klaviyo/Emarsys
 */

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send draft recovery email with 24-hour expiration
 * Research: Klaviyo/Emarsys show 50% recovery rate with timed emails
 */
export const sendDraftRecoveryEmail = async (emailData) => {
  const correlationId = `EMAIL-${Date.now()}`;
  
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@shithaa.in',
      to: emailData.to,
      subject: `Complete Your Order - ${emailData.orderId}`,
      html: generateRecoveryEmailHTML(emailData)
    };
    
    await transporter.sendMail(mailOptions);
    
    EnhancedLogger.webhookLog('SUCCESS', 'Draft recovery email sent', {
      correlationId,
      orderId: emailData.orderId,
      email: emailData.to,
      expiresAt: emailData.expiresAt
    });
    
    return { success: true, correlationId };
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Failed to send draft recovery email', {
      correlationId,
      orderId: emailData.orderId,
      email: emailData.to,
      error: error.message
    });
    
    return { success: false, error: error.message, correlationId };
  }
};

/**
 * Generate HTML email template for draft recovery
 */
const generateRecoveryEmailHTML = (emailData) => {
  const { orderId, amount, items, checkoutUrl, expiresAt } = emailData;
  
  const itemsHTML = items.map(item => 
    `<tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.size}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
    </tr>`
  ).join('');
  
  const expiresIn = new Date(expiresAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Order - ${orderId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <!-- Header -->
      <div style="background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Complete Your Order</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${orderId}</p>
      </div>
      
      <!-- Main Content -->
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        
        <p style="font-size: 16px; margin-bottom: 20px;">Hi there!</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          We noticed you started an order but didn't complete the payment. 
          <strong>Your items are still reserved for you!</strong>
        </p>
        
        <!-- Order Summary -->
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #007bff;">Order Summary</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Size</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #dee2e6;">
            <h3 style="margin: 0; color: #007bff;">Total: ₹${amount}</h3>
          </div>
        </div>
        
        <!-- Call to Action -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${checkoutUrl}" 
             style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; display: inline-block;">
            Complete Your Order
          </a>
        </div>
        
        <!-- Important Notice -->
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>⏰ Important:</strong> This link expires on ${expiresIn}. 
            After that, your items will be released and you'll need to start over.
          </p>
        </div>
        
        <!-- Help Section -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="font-size: 14px; color: #6c757d; margin-bottom: 10px;">
            Having trouble? We're here to help!
          </p>
          <p style="font-size: 14px; color: #6c757d; margin: 5px 0;">
            📧 Email: support@shithaa.in<br>
            📱 WhatsApp: +91 9876543210<br>
            🕒 Support: 9 AM - 9 PM (Mon-Sat)
          </p>
        </div>
        
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6c757d; font-size: 12px;">
        <p>© 2024 Shithaa. All rights reserved.</p>
        <p>This email was sent because you started an order on our website.</p>
      </div>
      
    </body>
    </html>
  `;
};

/**
 * Send order status update email
 */
export const sendOrderStatusUpdate = async (emailData) => {
  const correlationId = `ORDER-UPDATE-${Date.now()}`;
  
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@shithaa.in',
      to: emailData.to,
      subject: `Order ${emailData.status} - ${emailData.orderId}`,
      html: generateOrderStatusHTML(emailData)
    };
    
    await transporter.sendMail(mailOptions);
    
    EnhancedLogger.webhookLog('SUCCESS', 'Order status update email sent', {
      correlationId,
      orderId: emailData.orderId,
      email: emailData.to,
      status: emailData.status
    });
    
    return { success: true, correlationId };
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Failed to send order status update email', {
      correlationId,
      orderId: emailData.orderId,
      error: error.message
    });
    
    return { success: false, error: error.message, correlationId };
  }
};

/**
 * Send shipping notification email
 */
export const sendShippingNotification = async (emailData) => {
  const correlationId = `SHIPPING-${Date.now()}`;
  
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@shithaa.in',
      to: emailData.to,
      subject: `Your Order Has Shipped - ${emailData.orderId}`,
      html: generateShippingNotificationHTML(emailData)
    };
    
    await transporter.sendMail(mailOptions);
    
    EnhancedLogger.webhookLog('SUCCESS', 'Shipping notification email sent', {
      correlationId,
      orderId: emailData.orderId,
      email: emailData.to,
      trackingNumber: emailData.trackingNumber
    });
    
    return { success: true, correlationId };
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Failed to send shipping notification email', {
      correlationId,
      orderId: emailData.orderId,
      error: error.message
    });
    
    return { success: false, error: error.message, correlationId };
  }
};

/**
 * Send payment failure notification email
 */
export const sendPaymentFailureEmail = async (emailData) => {
  const correlationId = `PAYMENT-FAIL-${Date.now()}`;
  
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@shithaa.in',
      to: emailData.to,
      subject: `Payment Failed - Order ${emailData.orderId}`,
      html: generatePaymentFailureHTML(emailData)
    };
    
    await transporter.sendMail(mailOptions);
    
    EnhancedLogger.webhookLog('SUCCESS', 'Payment failure email sent', {
      correlationId,
      orderId: emailData.orderId,
      email: emailData.to,
      declineCode: emailData.declineCode
    });
    
    return { success: true, correlationId };
    
  } catch (error) {
    EnhancedLogger.webhookLog('ERROR', 'Failed to send payment failure email', {
      correlationId,
      orderId: emailData.orderId,
      error: error.message
    });
    
    return { success: false, error: error.message, correlationId };
  }
};

/**
 * Generate HTML for order status update email
 */
const generateOrderStatusHTML = (emailData) => {
  const { orderId, status, amount, items, trackingNumber, estimatedDelivery } = emailData;
  
  const statusMessages = {
    'CONFIRMED': {
      title: 'Order Confirmed',
      message: 'Your order has been confirmed and is being prepared for shipment.',
      color: '#28a745'
    },
    'PROCESSING': {
      title: 'Order Processing',
      message: 'Your order is being processed and will be shipped soon.',
      color: '#007bff'
    },
    'SHIPPED': {
      title: 'Order Shipped',
      message: 'Your order has been shipped and is on its way to you.',
      color: '#17a2b8'
    },
    'DELIVERED': {
      title: 'Order Delivered',
      message: 'Your order has been successfully delivered.',
      color: '#28a745'
    },
    'CANCELLED': {
      title: 'Order Cancelled',
      message: 'Your order has been cancelled as requested.',
      color: '#dc3545'
    }
  };
  
  const statusInfo = statusMessages[status] || {
    title: 'Order Update',
    message: 'Your order status has been updated.',
    color: '#6c757d'
  };
  
  const itemsHTML = items.map(item => 
    `<tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.size}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
    </tr>`
  ).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order ${status} - ${orderId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="background: ${statusInfo.color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${statusInfo.title}</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${orderId}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi there!</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">${statusInfo.message}</p>
        
        ${trackingNumber ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #007bff;">Tracking Information</h3>
            <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
            ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ''}
          </div>
        ` : ''}
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #007bff;">Order Summary</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Size</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #dee2e6;">
            <h3 style="margin: 0; color: #007bff;">Total: ₹${amount}</h3>
          </div>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="font-size: 14px; color: #6c757d;">
            Need help? Contact us at support@shithaa.in or WhatsApp +91 9876543210
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate HTML for shipping notification email
 */
const generateShippingNotificationHTML = (emailData) => {
  const { orderId, trackingNumber, carrier, estimatedDelivery, items, amount } = emailData;
  
  const itemsHTML = items.map(item => 
    `<tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.size}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
    </tr>`
  ).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Order Has Shipped - ${orderId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="background: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🚚 Your Order Has Shipped!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${orderId}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Great news! Your order is on its way to you.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #17a2b8;">📦 Shipping Details</h3>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          <p><strong>Carrier:</strong> ${carrier || 'Standard Shipping'}</p>
          ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ''}
        </div>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #17a2b8;">Order Items</h3>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <thead>
              <tr style="background: #f8f9fa;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Size</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://shithaa.in/track/${trackingNumber}" 
             style="background: #17a2b8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; display: inline-block;">
            Track Your Package
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="font-size: 14px; color: #6c757d;">
            Questions about your shipment? Contact us at support@shithaa.in
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate HTML for payment failure email
 */
const generatePaymentFailureHTML = (emailData) => {
  const { orderId, amount, declineInfo, checkoutUrl } = emailData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Failed - ${orderId}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Payment Failed</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Order #${orderId}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hi there!</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
          Your payment for order <strong>#${orderId}</strong> (₹${amount}) failed.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #dc3545;">${declineInfo.title}</h3>
          <p style="font-size: 16px; margin-bottom: 20px;">${declineInfo.message}</p>
          
          ${declineInfo.retryable ? `
            <div style="text-align: center; margin: 20px 0;">
              <a href="${checkoutUrl}" 
                 style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: bold; display: inline-block;">
                ${declineInfo.action}
              </a>
            </div>
          ` : `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px;">
              <p style="margin: 0; color: #856404;">
                <strong>Next Steps:</strong> ${declineInfo.action}
              </p>
            </div>
          `}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="font-size: 14px; color: #6c757d;">
            Need help? Contact us at support@shithaa.in or WhatsApp +91 9876543210
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};