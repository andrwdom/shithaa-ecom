// backend/utils/productionLogger.js (ESM)
import pino from 'pino';
import rfs from 'rotating-file-stream';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const service = process.env.SERVICE_NAME || 'payment-service';
const level = process.env.LOG_LEVEL || 'info';

// rotating streams example (daily rotation)
const paymentStream = rfs.createStream('payment.log', {
  interval: '1d',
  path: path.join(logDir, 'payment'),
  compress: 'gzip'
});

const webhookStream = rfs.createStream('webhook.log', {
  interval: '1d',
  path: path.join(logDir, 'webhook'),
  compress: 'gzip'
});

const errorStream = rfs.createStream('error.log', {
  interval: '1d',
  path: path.join(logDir, 'error'),
  compress: 'gzip'
});

// pino multi-stream (basic)
const pinoMulti = pino.multistream([
  { level: 'info', stream: paymentStream },
  { level: 'info', stream: webhookStream },
  { level: 'error', stream: errorStream },
  { level: level, stream: process.stdout }
]);

const logger = pino({
  level,
  base: {
    service,
    env: process.env.NODE_ENV || 'development',
    hostname: process.env.HOSTNAME || os.hostname(),
    pid: process.pid
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  }
}, pinoMulti);

export default logger;
