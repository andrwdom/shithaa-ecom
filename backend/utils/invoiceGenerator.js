import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

// Generate invoice PDF as a buffer (for email attachment)
export async function generateInvoiceBuffer(order) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const BRAND_NAME = 'SHITHAA'
      const BRAND_COLOR = '#473C66'

      // --- HEADER ---
      doc.font('Helvetica-Bold').fontSize(30).fillColor(BRAND_COLOR).text(BRAND_NAME, { align: 'center' });
      doc.moveDown(0.1);
      doc.font('Helvetica').fontSize(13).fillColor('#B39DDB').text('Elegance for Every Mother', { align: 'center' });
      doc.moveDown(0.5);
      if (order.isTestOrder) {
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#1976D2').text('TEST ORDER', { align: 'center' });
        doc.moveDown(0.5);
      }
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
      doc.moveDown(0.7);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#333').text(`Order ID: `, { continued: true }).font('Helvetica').text(order.orderId || order._id);
      doc.font('Helvetica-Bold').text(`Order Date: `, { continued: true }).font('Helvetica').text(new Date(order.createdAt).toLocaleDateString('en-IN'));
      doc.moveDown(0.7);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
      doc.moveDown(0.7);

      // --- CUSTOMER INFO ---
      const shipping = order.shippingInfo || order.address;
      const billing = order.billingInfo;
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#473C66').text('Customer Information');
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(11).fillColor('#333');
      doc.text(`Name: `, { continued: true }).font('Helvetica-Bold').text(shipping?.fullName || order.customerName);
      doc.font('Helvetica').text(`Email: `, { continued: true }).font('Helvetica-Bold').text(shipping?.email || order.email);
      doc.font('Helvetica').text(`Phone: `, { continued: true }).font('Helvetica-Bold').text(shipping?.phone || order.phone);
      doc.font('Helvetica').text(`Address: `, { continued: true }).font('Helvetica-Bold').text([
        shipping?.addressLine1 || shipping?.line1,
        shipping?.addressLine2 || shipping?.line2,
        shipping?.city,
        shipping?.state,
        shipping?.zip || shipping?.pincode,
        shipping?.country
      ].filter(Boolean).join(', '));
      if (billing) {
        doc.moveDown(0.2);
        doc.font('Helvetica').text(`Billing Address: `, { continued: true }).font('Helvetica-Bold').text([
          billing.addressLine1,
          billing.addressLine2,
          billing.city,
          billing.state,
          billing.zip,
          billing.country
        ].filter(Boolean).join(', '));
      }
      doc.moveDown(0.7);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
      doc.moveDown(0.7);

      // --- PRODUCT SUMMARY TABLE ---
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#473C66').text('Product Summary');
      doc.moveDown(0.3);
      const tableTop = doc.y;
      // 🔧 FIX: Significantly increased product name column width to prevent text truncation
      const colX = [40, 380, 430, 500, 570];
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#333');
      doc.text('Product', colX[0], tableTop, { width: colX[1] - colX[0] - 5 });
      doc.text('Qty', colX[1], tableTop, { width: colX[2] - colX[1] - 5, align: 'center' });
      doc.text('Size', colX[2], tableTop, { width: colX[3] - colX[2] - 5, align: 'center' });
      doc.text('Price (INR)', colX[3], tableTop, { width: colX[4] - colX[3] - 5, align: 'right' });
      doc.text('Subtotal (INR)', colX[4], tableTop, { align: 'right' });
      doc.moveDown(0.2);
      doc.moveTo(colX[0], doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1).stroke();
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(11).fillColor('#333');
      const items = order.cartItems?.length ? order.cartItems : order.items;
      items.forEach(item => {
        const startY = doc.y;
        
        // 🔧 FIX: Properly handle long product names with better column layout
        const productNameWidth = colX[1] - colX[0] - 10; // Extra padding for product name
        const productNameHeight = doc.heightOfString(item.name, { width: productNameWidth });
        
        // Draw product name with proper wrapping
        doc.text(item.name, colX[0], startY, { 
          width: productNameWidth,
          align: 'left',
          lineGap: 1
        });
        
        // Calculate the actual height used by the product name
        const actualProductHeight = Math.max(15, productNameHeight); // Minimum 15 points height
        
        // Position other columns at the top of the row, not centered
        doc.text(String(item.quantity), colX[1], startY, { 
          width: colX[2] - colX[1] - 5, 
          align: 'center' 
        });
        doc.text(item.size || '-', colX[2], startY, { 
          width: colX[3] - colX[2] - 5, 
          align: 'center' 
        });
        doc.text(`INR ${item.price}`, colX[3], startY, { 
          width: colX[4] - colX[3] - 5, 
          align: 'right' 
        });
        doc.text(`INR ${item.price * item.quantity}`, colX[4], startY, { 
          align: 'right' 
        });
        
        // Move down based on the actual height of the product name
        const moveDownAmount = Math.max(0.3, actualProductHeight / 15);
        doc.y = startY + actualProductHeight + 5; // Add 5 points spacing
      });
      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
      doc.moveDown(0.7);

      // --- ORDER SUMMARY ---
      // Robust totals calculation
      const itemsList = Array.isArray(order.cartItems) && order.cartItems.length > 0 ? order.cartItems : (order.items || [])
      const safeSubtotal = itemsList.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
      const couponPct = (order.couponUsed?.discount || (order.discount?.type === 'percentage' ? order.discount?.value : 0)) || 0
      const fixedDiscount = order.discount?.type && order.discount?.type !== 'percentage' ? (Number(order.discount?.value) || 0) : 0
      const discountAmt = Math.round((safeSubtotal * couponPct) / 100) + fixedDiscount
      const coupon = order.couponUsed?.code || order.discount?.appliedCouponCode
      const shippingCost = Number(order.shippingCost) || 0
      const total = order.totalAmount || order.total || order.totalPrice || order.amount || (safeSubtotal - discountAmt + shippingCost)
      doc.font('Helvetica-Bold').fontSize(13).fillColor(BRAND_COLOR).text('Order Summary');
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(11).fillColor('#333');
      doc.text(`Subtotal: `, { continued: true }).font('Helvetica-Bold').text(`INR ${safeSubtotal}`)
      
      // 🔧 FIX: Display loungewear offer discount if applied
      if (order.offerDetails?.offerApplied && order.offerDetails?.offerDiscount > 0) {
        doc.moveDown(0.2)
        doc.font('Helvetica').text(`Loungewear Offer (${order.offerDetails.offerDescription}): `, { continued: true }).font('Helvetica-Bold').text(`-INR ${order.offerDetails.offerDiscount}`)
      }
      
      if (discountAmt > 0) {
        doc.moveDown(0.2)
        doc.font('Helvetica').text(`Discount: `, { continued: true }).font('Helvetica-Bold').text(`-INR ${discountAmt}${coupon ? ` (Coupon: ${coupon})` : ''}`)
      }
      doc.moveDown(0.2)
      doc.font('Helvetica').text(`Shipping: `, { continued: true }).font('Helvetica-Bold').text(`INR ${shippingCost}`)
      doc.moveDown(0.2)
      doc.font('Helvetica').text(`Total: `, { continued: true }).font('Helvetica-Bold').text(`INR ${total}`)
      doc.moveDown(0.2)
      doc.font('Helvetica').text(`Payment Method: `, { continued: true }).font('Helvetica-Bold').text(order.paymentMethod || '-')
      doc.moveDown(0.2)
      doc.font('Helvetica').text(`Order Status: `, { continued: true }).font('Helvetica-Bold').text(order.status || order.orderStatus || '-')
      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
      doc.moveDown(1);

      // --- FOOTER ---
      doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_COLOR).text('Thank you for shopping with SHITHAA!', { align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#888').text(`${process.env.BASE_URL?.replace('https://', 'www.').replace('http://', 'www.') || 'www.shithaa.in'} | info.shithaa@gmail.com`, { align: 'center' });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function sendInvoiceEmail(order, pdfBuffer) {
  // Configure transporter: prefer explicit SMTP_*, otherwise fall back to Gmail via EMAIL_*
  const hasSmtpConfig = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS
  );

  const transporter = hasSmtpConfig
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

  const toEmail = order.email || order.shippingInfo?.email;
  if (!toEmail) throw new Error('No recipient email found for invoice');

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER,
    to: toEmail,
    subject: `Your Invoice for Order #${order.orderId || order._id}`,
    text: `Thank you for your order! Please find your invoice attached.\nOrder ID: ${order.orderId || order._id}`,
    attachments: [
      {
        filename: `Invoice_${order.orderId || order._id}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
} 