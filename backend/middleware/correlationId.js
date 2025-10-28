// backend/middleware/correlationId.js
const { v4: uuidv4 } = require('uuid');

module.exports = function correlationIdMiddleware(req, res, next) {
  const incoming = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const correlationId = incoming || `cid_${uuidv4()}`;
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // attach a simple logger helper if you use express-pino-logger or productionLogger
  if (req.log) {
    req.log = req.log.child({ correlationId });
  }
  next();
};
