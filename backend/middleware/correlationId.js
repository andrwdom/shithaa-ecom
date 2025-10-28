/**
 * CORRELATION ID MIDDLEWARE
 * 
 * Injects correlation IDs into every request to track payments across systems
 * Similar to AWS X-Ray or Google Cloud Trace
 */

import { generateCorrelationId } from '../utils/productionLogger.js';

/**
 * Middleware to add correlation ID to request
 */
export function correlationIdMiddleware(req, res, next) {
  // Check if correlation ID already exists (from upstream proxy or previous request)
  const existingId = 
    req.headers['x-correlation-id'] ||
    req.headers['x-request-id'] ||
    req.headers['x-trace-id'];
  
  // Generate or use existing correlation ID
  req.correlationId = existingId || generateCorrelationId('req');
  
  // Add to response headers for debugging
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  // Add to request object for easy access
  req.headers['x-correlation-id'] = req.correlationId;
  
  next();
}

/**
 * Get correlation ID from request, with fallback
 */
export function getCorrelationId(req) {
  return req?.correlationId || 
         req?.headers?.['x-correlation-id'] ||
         req?.headers?.['x-request-id'] ||
         generateCorrelationId('fallback');
}

/**
 * Generate a correlation ID for background jobs/crons
 */
export function generateJobCorrelationId(jobName) {
  return generateCorrelationId(`job_${jobName}`);
}

export default { correlationIdMiddleware, getCorrelationId, generateJobCorrelationId };

