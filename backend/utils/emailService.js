import nodemailer from 'nodemailer';

// Courier tracking URLs
const COURIER_TRACKING_URLS = {
  'DTDC': 'https://www.dtdc.in/trace.asp',
  'ST Courier': 'https://stcourier.com/track/shipment',
  'XpressBees': 'https://www.xpressbees.com/shipment/tracking',
  'India Post': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx'
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Generate tracking URL with tracking ID
const generateTrackingUrl = (partner, trackingId) => {
  const baseUrl = COURIER_TRACKING_URLS[partner];
  if (!baseUrl) return null;
  
  // For most couriers, append tracking ID as query parameter
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}tracking_id=${trackingId}`;
};

// Send shipping notification email
export const sendShippingNotification = async (order, shippingData) => {
  try {
    const transporter = createTransporter();
    
    // Get customer email
    const customerEmail = order.shippingInfo?.email || order.email || order.userInfo?.email;
    const customerName = order.shippingInfo?.fullName || order.customerName || order.userInfo?.name || 'Valued Customer';
    
    if (!customerEmail) {
      console.error('No customer email found for order:', order.orderId);
      return false;
    }

    // Get product details
    const items = order.items || order.cartItems || [];
    const firstItem = items[0];
    const productName = firstItem?.name || 'Your order';
    const productSize = firstItem?.size || '';
    const productPrice = firstItem?.price || 0;

    // Generate tracking URL
    const trackingUrl = generateTrackingUrl(shippingData.partner, shippingData.trackingId);

    // Email subject
    const subject = `Your order has been shipped – Track it now!`;

    // Email body
    const emailBody = `
Hi ${customerName},

Your order [#${order.orderId}] containing ${productName}${productSize ? ` (Size: ${productSize})` : ''} has been shipped.

Courier Partner: ${shippingData.partner}
Tracking ID: ${shippingData.trackingId}
${trackingUrl ? `Track your order: ${trackingUrl}` : ''}

Thank you for shopping with us!

Best regards,
Shithaa Team
    `.trim();

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: subject,
      text: emailBody,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🚚 Your Order Has Been Shipped!</h1>
          </div>
          
          <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #333;">Hi ${customerName},</p>
            
            <p style="font-size: 16px; color: #333;">
              Your order <strong>#${order.orderId}</strong> containing <strong>${productName}</strong>${productSize ? ` (Size: ${productSize})` : ''} has been shipped.
            </p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333;">📦 Shipping Details</h3>
              <p style="margin: 5px 0;"><strong>Courier Partner:</strong> ${shippingData.partner}</p>
              <p style="margin: 5px 0;"><strong>Tracking ID:</strong> ${shippingData.trackingId}</p>
              ${trackingUrl ? `<p style="margin: 5px 0;"><strong>Track your order:</strong> <a href="${trackingUrl}" style="color: #667eea;">Click here to track</a></p>` : ''}
            </div>
            
            <p style="font-size: 16px; color: #333;">Thank you for shopping with us!</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; color: #666; font-size: 14px;">Best regards,<br>Shithaa Team</p>
            </div>
          </div>
        </div>
      `
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);
    console.log('Shipping notification email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending shipping notification email:', error);
    return false;
  }
};

// Send order status update email
export const sendOrderStatusUpdate = async (order, newStatus) => {
  try {
    const transporter = createTransporter();
    
    const customerEmail = order.shippingInfo?.email || order.email || order.userInfo?.email;
    const customerName = order.shippingInfo?.fullName || order.customerName || order.userInfo?.name || 'Valued Customer';
    
    if (!customerEmail) {
      console.error('No customer email found for order:', order.orderId);
      return false;
    }

    const subject = `Order Status Update - ${newStatus}`;
    const emailBody = `
Hi ${customerName},

Your order #${order.orderId} status has been updated to: ${newStatus}

Thank you for your patience.

Best regards,
Shithaa Team
    `.trim();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: subject,
      text: emailBody
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Order status update email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending order status update email:', error);
    return false;
  }
}; 