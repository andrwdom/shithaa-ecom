import fs from 'fs';
import path from 'path';
import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * Enhanced Request Logger Middleware
 * Logs all requests to checkout, webhook, and order endpoints
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  // Check if this is a critical endpoint
  const isCriticalEndpoint = req.path.match(/checkout|webhook|order|payment|phonepe/i);
  
  if (isCriticalEndpoint) {
    // Log to console for immediate visibility
    console.log(`🔍 REQ ${timestamp} ${req.ip} ${req.method} ${req.path} ${req.get('User-Agent') || 'Unknown'}`);
    
    // Enhanced logging with correlation ID
    const correlationId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.correlationId = correlationId;
    
    // Log request details
    const requestLog = {
      correlationId,
      timestamp,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      headers: {
        'content-type': req.get('Content-Type'),
        'authorization': req.get('Authorization') ? 'Bearer ***' : 'None',
        'x-request-id': req.get('X-Request-ID'),
        'referer': req.get('Referer'),
        'origin': req.get('Origin')
      },
      query: req.query,
      body: req.body,
      startTime
    };
    
    // Log to enhanced logger
    EnhancedLogger.webhookLog('INFO', 'Critical endpoint request received', requestLog);
    
    // Log to file for grep analysis
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, `requests-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = `${timestamp} ${req.ip} ${req.method} ${req.path} | Headers: ${JSON.stringify(requestLog.headers)} | Body: ${JSON.stringify(req.body)} | CorrelationID: ${correlationId}\n`;
    
    fs.appendFileSync(logFile, logLine);
  }
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (isCriticalEndpoint) {
      const responseLog = {
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: chunk ? chunk.length : 0,
        ip: req.ip
      };
      
      // Log response
      console.log(`📤 RES ${responseLog.timestamp} ${req.ip} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      
      // Log to enhanced logger
      const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
      EnhancedLogger.webhookLog(logLevel, 'Critical endpoint response sent', responseLog);
      
      // Log to file
      const logFile = path.join(process.cwd(), 'logs', `requests-${new Date().toISOString().split('T')[0]}.log`);
      const responseLine = `${responseLog.timestamp} RESPONSE ${req.ip} ${req.method} ${req.path} ${res.statusCode} ${duration}ms | Size: ${responseLog.responseSize} | CorrelationID: ${req.correlationId}\n`;
      
      fs.appendFileSync(logFile, responseLine);
    }
    
    // Call original end
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Quick Request Logger (Minimal)
 * For immediate deployment without complex logging
 */
export const quickRequestLogger = (req, res, next) => {
  if (req.path.includes('/checkout') || req.path.includes('/webhook') || req.path.includes('/payment')) {
    console.log(`🔍 REQ ${new Date().toISOString()} ${req.ip} ${req.method} ${req.path} ${req.get('User-Agent') || 'Unknown'}`);
  }
  next();
};

/**
 * File Request Logger
 * Logs requests to file for grep analysis
 */
export const fileRequestLogger = (req, res, next) => {
  if (req.path.match(/checkout|webhook|order|payment|phonepe/i)) {
    const timestamp = new Date().toISOString();
    const logDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'requests.log');
    const line = `${timestamp} ${req.ip} ${req.method} ${req.path} | Headers: ${JSON.stringify(req.headers)} | Body: ${JSON.stringify(req.body)}\n`;
    
    fs.appendFileSync(logFile, line);
  }
  next();
};
