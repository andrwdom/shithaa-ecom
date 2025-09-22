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
      doc.moveDown(0.4);

      // 🔧 IMPROVED: Better column layout with proper spacing (matching admin panel)
      const tableTop = doc.y;
      const colX = [40, 280, 320, 380, 450, 520]; // Adjusted column X coordinates

      // Table header with better spacing
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333');
      doc.text('Product', colX[0], tableTop, { width: colX[1] - colX[0] - 5 });
      doc.text('Qty', colX[1], tableTop, { width: colX[2] - colX[1] - 5, align: 'center' });
      doc.text('Size', colX[2], tableTop, { width: colX[3] - colX[2] - 5, align: 'center' });
      doc.text('Price', colX[3], tableTop, { width: colX[4] - colX[3] - 5, align: 'right' });
      doc.text('Subtotal', colX[4], tableTop, { width: colX[5] - colX[4] - 5, align: 'right' });

      // Header underline
      doc.moveDown(0.2);
      doc.moveTo(colX[0], doc.y).lineTo(colX[5], doc.y).strokeColor('#E1D5F6').lineWidth(1).stroke();
      doc.moveDown(0.3);
      
      doc.font('Helvetica').fontSize(11).fillColor('#333');
      const items = order.cartItems?.length ? order.cartItems : order.items;
      
      // Product rows
      doc.font('Helvetica').fontSize(10).fillColor('#333');
      items.forEach((item, index) => {
        const startY = doc.y;
        
        // 🔧 IMPROVED: Better product name handling with truncation for long names
        const productNameWidth = colX[1] - colX[0] - 10;
        let productName = item.name;
        
        // Truncate very long product names to fit better
        if (productName.length > 50) {
          productName = productName.substring(0, 47) + '...';
        }
        
        const productNameHeight = doc.heightOfString(productName, { width: productNameWidth });
        
        // Draw product name with proper wrapping
        doc.text(productName, colX[0], startY, { 
          width: productNameWidth,
          align: 'left',
          lineGap: 1
        });
        
        // Calculate the actual height used by the product name
        const actualProductHeight = Math.max(12, productNameHeight);
        
        // Position other columns at the top of the row
        doc.text(String(item.quantity), colX[1], startY, { 
          width: colX[2] - colX[1] - 5, 
          align: 'center' 
        });
        doc.text(item.size || '-', colX[2], startY, { 
          width: colX[3] - colX[2] - 5, 
          align: 'center' 
        });
        doc.text(`Rs ${item.price}`, colX[3], startY, { 
          width: colX[4] - colX[3] - 5, 
          align: 'right' 
        });
        doc.text(`Rs ${item.price * item.quantity}`, colX[4], startY, { 
          width: colX[5] - colX[4] - 5,
          align: 'right' 
        });
        
        // Move down based on the actual height of the product name
        doc.y = startY + actualProductHeight + 3; // Reduced spacing for better density
        
        // Add subtle row separator for every other row
        if (index % 2 === 1) {
          doc.moveTo(colX[0], doc.y - 1).lineTo(colX[5], doc.y - 1).strokeColor('#F5F5F5').lineWidth(0.5).stroke();
        }
      });
      
      // Table bottom border
      doc.moveDown(0.5);
      doc.moveTo(colX[0], doc.y).lineTo(colX[5], doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
      doc.moveDown(0.7);

      // --- ORDER SUMMARY ---
      // Robust totals calculation
      const itemsList = Array.isArray(order.cartItems) && order.cartItems.length > 0 ? order.cartItems : (order.items || [])
      const safeSubtotal = itemsList.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
      
      // 🔧 FIX: Calculate loungwear offer discount
      const loungwearOfferDiscount = order.offerDetails?.offerApplied ? (order.offerDetails?.offerDiscount || 0) : 0;
      
      const couponPct = (order.couponUsed?.discount || (order.discount?.type === 'percentage' ? (order.discount?.value || 0) : 0));
      const fixedDiscount = order.discount?.type && order.discount?.type !== 'percentage' ? (Number(order.discount?.value) || 0) : 0;
      const couponDiscount = Math.round((safeSubtotal * (couponPct || 0)) / 100);
      const coupon = order.couponUsed?.code || order.discount?.appliedCouponCode;
      const shippingCost = Number(order.shippingCost) || 0;
      
      // 🔧 FIX: Include loungwear offer discount in total calculation
      const totalDiscount = loungwearOfferDiscount + couponDiscount;
      const total = order.totalAmount || order.total || order.totalPrice || order.amount || (safeSubtotal - totalDiscount + shippingCost);
      
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#473C66').text('Order Summary');
      doc.moveDown(0.5);
      
      // 🔧 FIXED: Use much more of the available width with proper alignment
      const summaryLeft = 100;  // Start much earlier to use more space
      const summaryRight = 480; // End earlier to balance the layout
      
      doc.font('Helvetica').fontSize(11).fillColor('#333');
      
      // Subtotal
      doc.text('Subtotal:', summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
      doc.font('Helvetica-Bold').text(`Rs ${safeSubtotal}`, summaryRight, doc.y, { align: 'right' });
      doc.moveDown(0.3);
      
      // Loungewear offer discount
      if (loungwearOfferDiscount > 0) {
        doc.font('Helvetica').text(`${order.offerDetails?.offerDescription || 'Loungewear Offer (Buy 3 @ Rs 1299)'}:`, summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#E53E3E').text(`-Rs ${loungwearOfferDiscount}`, summaryRight, doc.y, { align: 'right' });
        doc.fillColor('#333'); // Reset color
        doc.moveDown(0.3);
      }
      
      // Coupon discount
      if (couponDiscount > 0) {
        doc.font('Helvetica').text(`Discount${coupon ? ` (${coupon})` : ''}:`, summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#E53E3E').text(`-Rs ${couponDiscount}`, summaryRight, doc.y, { align: 'right' });
        doc.fillColor('#333'); // Reset color
        doc.moveDown(0.3);
      }
      
      // Shipping
      doc.font('Helvetica').text('Shipping:', summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
      doc.font('Helvetica-Bold').text(`Rs ${shippingCost}`, summaryRight, doc.y, { align: 'right' });
      doc.moveDown(0.3);
      
      // Total with emphasis
      doc.moveDown(0.2);
      doc.moveTo(summaryLeft - 10, doc.y).lineTo(summaryRight + 10, doc.y).strokeColor('#E1D5F6').lineWidth(1).stroke();
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(12).text('Total:', summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#473C66').text(`Rs ${total}`, summaryRight, doc.y, { align: 'right' });
      doc.fillColor('#333'); // Reset color
      doc.moveDown(0.8);
      
      // Order details - PROPERLY ALIGNED
      doc.font('Helvetica').fontSize(10).fillColor('#666');
      doc.text(`Payment Method: `, summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
      doc.font('Helvetica-Bold').text(order.paymentMethod || '-', summaryRight, doc.y, { align: 'right' });
      doc.moveDown(0.2);
      doc.font('Helvetica').text(`Order Status: `, summaryLeft, doc.y, { width: summaryRight - summaryLeft - 5, align: 'right' });
      doc.font('Helvetica-Bold').text(order.status || order.orderStatus || '-', summaryRight, doc.y, { align: 'right' });
      doc.moveDown(0.8);
      
      // Final separator
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(1.2).stroke();
      doc.moveDown(0.8);

      // --- FOOTER ---
    // Add proper spacing before footer
    doc.moveDown(1.5);

    // Add a subtle line above footer
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#E1D5F6').lineWidth(0.5).stroke();
    doc.moveDown(0.5);

      // Thank you message with proper spacing - CENTERED with width constraint
      doc.font('Helvetica-Bold').fontSize(12).fillColor(BRAND_COLOR).text('Thank you for shopping with SHITHAA!', 40, doc.y, { width: 515, align: 'center' });
      doc.moveDown(0.3);

      // Contact info with proper spacing - CENTERED with width constraint
      doc.font('Helvetica').fontSize(10).fillColor('#888').text(`${process.env.BASE_URL?.replace('https://', 'www.').replace('http://', 'www.') || 'www.shithaa.in'} | info.shithaa@gmail.com`, 40, doc.y, { width: 515, align: 'center' });
      doc.moveDown(0.5);

    // Add final spacing to ensure proper bottom margin
      doc.moveDown(1);

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