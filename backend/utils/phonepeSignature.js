import crypto from 'crypto';

/**
 * Verify PhonePe webhook signature
 * @param {string} payload - Raw webhook payload
 * @param {string} signature - X-VERIFY header value
 * @param {string} saltKey - PhonePe salt key
 * @param {number} saltIndex - PhonePe salt index
 * @returns {boolean} - True if signature is valid
 */
export function verifyPhonePeSignature(payload, signature, saltKey, saltIndex) {
  try {
    // PhonePe signature format: SHA256(payload + saltKey + saltIndex)
    const dataToSign = payload + saltKey + saltIndex;
    const expectedSignature = crypto
      .createHash('sha256')
      .update(dataToSign)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('PhonePe signature verification error:', error);
    return false;
  }
}

/**
 * Generate event ID for idempotency
 * @param {string} provider - Payment provider
 * @param {string} paymentId - Payment ID from provider
 * @param {string} timestamp - Webhook timestamp
 * @returns {string} - Unique event ID
 */
export function generateEventId(provider, paymentId, timestamp) {
  return `${provider}_${paymentId}_${timestamp}`;
}

/**
 * Extract payment details from PhonePe webhook payload
 * @param {string} payload - Raw webhook payload
 * @returns {object} - Parsed payment details
 */
export function parsePhonePeWebhook(payload) {
  try {
    const data = JSON.parse(payload);
    const response = data.response || data;
    
    return {
      paymentId: response.merchantTransactionId,
      transactionId: response.transactionId,
      status: response.state,
      amount: response.amount,
      currency: response.currency,
      merchantId: response.merchantId,
      timestamp: response.timestamp || Date.now()
    };
  } catch (error) {
    console.error('PhonePe webhook parsing error:', error);
    return null;
  }
}
