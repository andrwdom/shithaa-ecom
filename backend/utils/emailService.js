import nodemailer from 'nodemailer';

// Courier tracking URLs
const COURIER_TRACKING_URLS = {
  'DTDC': 'https://www.dtdc.in/trace.asp',
  'ST Courier': 'https://stcourier.com/track/shipment',
  'XpressBees': 'https://www.xpressbees.com/shipment/tracking',
  'India Post': 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx',
  'Delhivery': 'https://www.delhivery.com/track/package',
  'Blue Dart': 'https://www.bluedart.com/tracking',
  'Ecom Express': 'https://ecomexpress.in/tracking/'
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
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
    const totalAmount = order.totalAmount || order.total || order.totalPrice || order.amount || 0;

    // Generate tracking URL
    const trackingUrl = generateTrackingUrl(shippingData.partner, shippingData.trackingId);

    // Generate order items HTML for shipping email
    const orderItemsHtml = items.map(item => `
      <div style="display: flex; align-items: center; padding: 15px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
        ${item.image ? `<img src="${Array.isArray(item.image) ? item.image[0] : item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">` : ''}
        <div style="flex: 1;">
          <h4 style="margin: 0 0 5px 0; font-size: 16px; color: #333;">${item.name}</h4>
          <p style="margin: 0; font-size: 14px; color: #666;">
            ${item.size ? `Size: ${item.size} | ` : ''}Qty: ${item.quantity} | Price: ₹${item.price}
          </p>
        </div>
        <div style="text-align: right;">
          <strong style="font-size: 16px; color: #333;">₹${(item.price * item.quantity).toFixed(2)}</strong>
        </div>
      </div>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `🚚 Your order is on the way! Track #${order.orderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your order has been shipped</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4D1E64 0%, #6B2C7A 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Shithaa</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Premium Maternity Wear</p>
            </div>
            
            <!-- Shipping Banner -->
            <div style="background-color: #8b5cf6; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">
                🚚 Your Order Has Been Shipped!
              </h2>
          </div>
          
            <!-- Main Content -->
            <div style="padding: 30px 20px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">Hi ${customerName},</p>
              
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your order <strong>#${order.orderId}</strong> has been shipped and is on its way to you.
              </p>
              
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 30px 0;">
                You can track your package using the details below. We'll also send you updates as your order moves closer to you.
              </p>
              
              <!-- Tracking Details -->
              <div style="background: #8b5cf6; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 25px; border-radius: 15px; margin: 25px 0; text-align: center;">
                <h3 style="margin: 0 0 20px 0; font-size: 20px;">📦 Tracking Information</h3>
                <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 15px 0;">
                  <p style="margin: 0 0 10px 0; font-size: 16px;"><strong>Courier Partner:</strong> ${shippingData.partner}</p>
                  <p style="margin: 0 0 15px 0; font-size: 16px;"><strong>Tracking ID:</strong> ${shippingData.trackingId}</p>
                  ${trackingUrl ? `
                    <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" 
                       style="background: white; color: #8b5cf6; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; transition: all 0.3s ease;">
                      🔍 Track Your Package
                    </a>
                  ` : ''}
                </div>
              </div>
              
              <!-- Order Summary -->
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📋 Order Summary</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                  <p style="margin: 0; font-size: 14px;"><strong>Order ID:</strong> #${order.orderId}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> Shipped</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Total Items:</strong> ${items.length}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
                </div>
              </div>
              
              <!-- Order Items -->
              <div style="margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📦 Shipped Items</h3>
                ${orderItemsHtml}
              </div>
              
              <!-- Shipping Address -->
              ${order.shippingInfo ? `
                <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📍 Delivery Address</h3>
                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #555;">
                    <strong>${order.shippingInfo.fullName}</strong><br>
                    ${order.shippingInfo.addressLine1}<br>
                    ${order.shippingInfo.addressLine2 ? order.shippingInfo.addressLine2 + '<br>' : ''}
                    ${order.shippingInfo.city}, ${order.shippingInfo.state} ${order.shippingInfo.postalCode}<br>
                    ${order.shippingInfo.country}<br>
                    📞 ${order.shippingInfo.phone}
                  </p>
                </div>
              ` : ''}
              
              <!-- Delivery Info -->
              <div style="background: #ecfdf5; padding: 20px; border-radius: 10px; margin: 30px 0; border: 1px solid #10b981;">
                <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px;">🕒 Expected Delivery</h3>
                <p style="margin: 0; font-size: 14px; color: #065f46; line-height: 1.5;">
                  Your package will typically arrive within <strong>3-7 business days</strong> from the shipping date. 
                  You'll receive updates via SMS and email as your package moves through the delivery network.
                </p>
            </div>
            
              <!-- Call to Action -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://shithaa.com'}/account" 
                   style="background: linear-gradient(135deg, #4D1E64 0%, #6B2C7A 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; transition: all 0.3s ease; margin-right: 15px;">
                  View Order Details
                </a>
                ${trackingUrl ? `
                  <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer"
                     style="background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; transition: all 0.3s ease;">
                    Track Package
                  </a>
                ` : ''}
              </div>
              
              <!-- Support Info -->
              <div style="background: #fef3e7; padding: 20px; border-radius: 10px; margin: 30px 0; text-align: center; border: 1px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #555;">
                  Questions about your delivery? Contact our support team<br>
                  📧 <a href="mailto:info.shithaa@gmail.com" style="color: #4D1E64;">info.shithaa@gmail.com</a><br>
                  📱 <a href="tel:+919876543210" style="color: #4D1E64;">+91 98765 43210</a>
                </p>
            </div>
          </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #333; font-weight: bold;">Thank you for choosing Shithaa!</p>
              <p style="margin: 0; font-size: 14px; color: #666;">
                Premium maternity wear designed with love for you and your little one.
              </p>
              <div style="margin: 15px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://shithaa.com'}" style="color: #4D1E64; text-decoration: none; margin: 0 10px;">🏠 Home</a>
                <a href="${process.env.FRONTEND_URL || 'https://shithaa.com'}/collections" style="color: #4D1E64; text-decoration: none; margin: 0 10px;">👗 Shop</a>
                <a href="${process.env.FRONTEND_URL || 'https://shithaa.com'}/contact" style="color: #4D1E64; text-decoration: none; margin: 0 10px;">📞 Contact</a>
              </div>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                © 2024 Shithaa. All rights reserved.<br>
                If you no longer wish to receive these emails, you can <a href="#" style="color: #999;">unsubscribe here</a>.
              </p>
            </div>
        </div>
        </body>
        </html>
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

// Get status-specific email content
const getStatusEmailContent = (status, order, customerName) => {
  const items = order.items || order.cartItems || [];
  const firstItem = items[0];
  const productName = firstItem?.name || 'your order';
  const itemCount = items.length;
  const totalAmount = order.totalAmount || order.total || order.totalPrice || order.amount || 0;

  switch (status.toLowerCase()) {
    case 'pending':
      return {
        subject: `Order Confirmed - Thank you for your purchase! #${order.orderId}`,
        statusColor: '#f59e0b',
        statusEmoji: '⏳',
        title: 'Order Confirmed!',
        message: `Thank you for your order! We've received your order and it's being processed. You'll receive another email when we ship your items.`,
        details: `We're excited to get ${productName} ${itemCount > 1 ? `and ${itemCount - 1} other item${itemCount > 1 ? 's' : ''}` : ''} ready for you.`
      };
    
    case 'processing':
      return {
        subject: `Your order is being prepared #${order.orderId}`,
        statusColor: '#3b82f6',
        statusEmoji: '⚙️',
        title: 'Order Being Prepared',
        message: `Great news! Your order is now being carefully prepared by our team. We're getting everything ready for shipment.`,
        details: `Your ${productName} ${itemCount > 1 ? `and ${itemCount - 1} other item${itemCount > 1 ? 's' : ''}` : ''} will be packed with extra care.`
      };
    
    case 'delivered':
      return {
        subject: `Order Delivered - Thank you for shopping with us! #${order.orderId}`,
        statusColor: '#10b981',
        statusEmoji: '✅',
        title: 'Order Delivered Successfully!',
        message: `Wonderful! Your order has been delivered successfully. We hope you love your new ${productName}!`,
        details: `Thank you for choosing Shithaa for your maternity wear needs. We'd love to hear your feedback about your purchase.`
      };
    
    case 'cancelled':
      return {
        subject: `Order Cancelled #${order.orderId}`,
        statusColor: '#ef4444',
        statusEmoji: '❌',
        title: 'Order Cancelled',
        message: `Your order has been cancelled as requested. If you didn't request this cancellation, please contact our support team immediately.`,
        details: `Any payment made for this order will be refunded within 5-7 business days. You can place a new order anytime.`
      };
    
    default:
      return {
        subject: `Order Status Update - ${status} #${order.orderId}`,
        statusColor: '#6b7280',
        statusEmoji: '📦',
        title: `Order Status: ${status}`,
        message: `Your order status has been updated to: ${status}`,
        details: `We'll keep you updated as your order progresses.`
      };
  }
};

// Send order status update email with beautiful templates
export const sendOrderStatusUpdate = async (order, newStatus) => {
  try {
    const transporter = createTransporter();
    
    const customerEmail = order.shippingInfo?.email || order.email || order.userInfo?.email;
    const customerName = order.shippingInfo?.fullName || order.customerName || order.userInfo?.name || 'Valued Customer';
    
    if (!customerEmail) {
      console.error('No customer email found for order:', order.orderId);
      return false;
    }

    // Get status-specific content
    const emailContent = getStatusEmailContent(newStatus, order, customerName);
    const items = order.items || order.cartItems || [];
    const totalAmount = order.totalAmount || order.total || order.totalPrice || order.amount || 0;

    // Generate order items HTML
    const orderItemsHtml = items.map(item => `
      <div style="display: flex; align-items: center; padding: 15px; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
        ${item.image ? `<img src="${Array.isArray(item.image) ? item.image[0] : item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">` : ''}
        <div style="flex: 1;">
          <h4 style="margin: 0 0 5px 0; font-size: 16px; color: #333;">${item.name}</h4>
          <p style="margin: 0; font-size: 14px; color: #666;">
            ${item.size ? `Size: ${item.size} | ` : ''}Qty: ${item.quantity} | Price: ₹${item.price}
          </p>
        </div>
        <div style="text-align: right;">
          <strong style="font-size: 16px; color: #333;">₹${(item.price * item.quantity).toFixed(2)}</strong>
        </div>
      </div>
    `).join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: emailContent.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${emailContent.subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4D1E64 0%, #6B2C7A 100%); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Shithaa</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Premium Maternity Wear</p>
            </div>
            
            <!-- Status Banner -->
            <div style="background-color: ${emailContent.statusColor}; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 24px;">
                ${emailContent.statusEmoji} ${emailContent.title}
              </h2>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 30px 20px;">
              <p style="font-size: 18px; color: #333; margin: 0 0 20px 0;">Hi ${customerName},</p>
              
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 20px 0;">
                ${emailContent.message}
              </p>
              
              <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 30px 0;">
                ${emailContent.details}
              </p>
              
              <!-- Order Details -->
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid ${emailContent.statusColor};">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📦 Order Details</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                  <p style="margin: 0; font-size: 14px;"><strong>Order ID:</strong> #${order.orderId}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Status:</strong> ${newStatus}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Total Items:</strong> ${items.length}</p>
                  <p style="margin: 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
                </div>
              </div>
              
              <!-- Order Items -->
              <div style="margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">🛍️ Your Items</h3>
                ${orderItemsHtml}
              </div>
              
              <!-- Shipping Address -->
              ${order.shippingInfo ? `
                <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                  <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📍 Shipping Address</h3>
                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #555;">
                    <strong>${order.shippingInfo.fullName}</strong><br>
                    ${order.shippingInfo.addressLine1}<br>
                    ${order.shippingInfo.addressLine2 ? order.shippingInfo.addressLine2 + '<br>' : ''}
                    ${order.shippingInfo.city}, ${order.shippingInfo.state} ${order.shippingInfo.postalCode}<br>
                    ${order.shippingInfo.country}<br>
                    📞 ${order.shippingInfo.phone}
                  </p>
                </div>
              ` : ''}
              
              <!-- Call to Action -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://shithaa.com'}/account" 
                   style="background: linear-gradient(135deg, #4D1E64 0%, #6B2C7A 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; transition: all 0.3s ease;">
                  View Order Details
                </a>
              </div>
              
              <!-- Support Info -->
              <div style="background: #fef3e7; padding: 20px; border-radius: 10px; margin: 30px 0; text-align: center; border: 1px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #555;">
                  Need help? Contact our support team<br>
                  📧 <a href="mailto:info.shithaa@gmail.com" style="color: #4D1E64;">info.shithaa@gmail.com</a><br>
                  📱 <a href="tel:+919876543210" style="color: #4D1E64;">+91 98765 43210</a>
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 10px 0; font-size: 16px; color: #333; font-weight: bold;">Thank you for choosing Shithaa!</p>
              <p style="margin: 0; font-size: 14px; color: #666;">
                Premium maternity wear designed with love for you and your little one.
              </p>
              <div style="margin: 15px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://shithaa.com'}" style="color: #4D1E64; text-decoration: none; margin: 0 10px;">🏠 Home</a>
                <a href="${process.env.FRONTEND_URL || 'https://shithaa.com'}/collections" style="color: #4D1E64; text-decoration: none; margin: 0 10px;">👗 Shop</a>
                <a href="${process.env.FRONTEND_URL || 'https://shithaa.com'}/contact" style="color: #4D1E64; text-decoration: none; margin: 0 10px;">📞 Contact</a>
              </div>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #999;">
                © 2024 Shithaa. All rights reserved.<br>
                If you no longer wish to receive these emails, you can <a href="#" style="color: #999;">unsubscribe here</a>.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Order status update email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Error sending order status update email:', error);
    return false;
  }
}; 