// backend/utils/productionLogger.js
const pino = require('pino');
const rfs = require('rotating-file-stream');
const path = require('path');

const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const service = process.env.SERVICE_NAME || 'payment-service';
const level = process.env.LOG_LEVEL || 'info';

// rotating streams example (daily rotation)
const paymentStream = rfs.createStream('payment.log', { 
  interval: '1d', 
  path: path.join(logDir, 'payment'),
  maxFiles: 30,
  compress: 'gzip'
});

const webhookStream = rfs.createStream('webhook.log', { 
  interval: '1d', 
  path: path.join(logDir, 'webhook'),
  maxFiles: 30,
  compress: 'gzip'
});

const errorStream = rfs.createStream('error.log', { 
  interval: '1d', 
  path: path.join(logDir, 'error'),
  maxFiles: 90,
  compress: 'gzip'
});

// pino multi-stream (basic)
const pinoMulti = pino.multistream([
  { level: 'info', stream: paymentStream },
  { level: 'info', stream: webhookStream },
  { level: 'error', stream: errorStream },
  { level: level, stream: process.stdout } // keep stdout for container logs
]);

const logger = pino({
  level,
  base: {
    service,
    env: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || require('os').hostname(),
    pid: process.pid
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    }
  }
}, pinoMulti);

module.exports = logger;
