import crypto from 'crypto';

/**
 * Verify PhonePe webhook signature according to official documentation
 * PhonePe uses Authorization header with SHA256(username:password)
 * @param {string} username - PhonePe webhook username
 * @param {string} password - PhonePe webhook password
 * @param {string} authorizationHeader - Authorization header value from request
 * @returns {boolean} - True if signature is valid
 */
export function verifyPhonePeSignature(username, password, authorizationHeader) {
  try {
    // PhonePe signature format: SHA256(username:password)
    const credentials = `${username}:${password}`;
    const expectedSignature = crypto
      .createHash('sha256')
      .update(credentials)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(authorizationHeader, 'hex'),
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
