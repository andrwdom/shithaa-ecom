import CheckoutSession from '../models/CheckoutSession.js';
import orderModel from '../models/orderModel.js';
import { isDuplicateKeyError } from '../lib/idempotency.js';

/**
 * Create an Order from a CheckoutSession snapshot (idempotent).
 * Returns existing order if already created for this session or transaction.
 */
export async function createOrderFromCheckoutSession(sessionId, { paymentStatus, phonepeTransactionId, providerPayload } = {}) {
  const s = await CheckoutSession.findOne({ sessionId });
  if (!s) throw new Error('CheckoutSession not found');
  if (paymentStatus !== 'success') throw new Error('Cannot create order from failed payment');

  // Idempotency: one order per checkout session or per gateway transaction
  const existingBySession = await orderModel.findOne({ checkoutSessionId: sessionId });
  if (existingBySession) return existingBySession;
  if (phonepeTransactionId) {
    const existingByTxn = await orderModel.findOne({ phonepeTransactionId });
    if (existingByTxn) return existingByTxn;
  }

  const order = new orderModel({
    checkoutSessionId: s.sessionId,
    source: s.source,
    userInfo: s.userId ? { userId: s.userId, email: s.userEmail } : { email: s.userEmail },
    shippingInfo: s.shippingInfo || {},
    cartItems: s.items.map(({ productId, name, price, quantity, size }) => ({ productId, name, price, quantity, size })),
    subtotal: s.subtotal,
    total: s.total,
    paymentStatus: 'paid',
    orderStatus: 'Confirmed',
    placedAt: new Date(),
    phonepeTransactionId,
    status: 'Order Placed',
    metadata: { providerPayload }
  });
  try {
    await order.save();
    
    // Mark session as paid (best-effort)
    try {
      s.status = 'paid';
      await s.save();
    } catch {}
    
    return order;
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      console.info('Duplicate order creation (idempotency) for session', sessionId);
      // Return existing order
      const existing = await orderModel.findOne({ checkoutSessionId: sessionId });
      if (existing) return existing;
    }
    throw err;
  }
}

export default { createOrderFromCheckoutSession };


