// backend/middleware/correlationId.js (ESM)
import { v4 as uuidv4 } from 'uuid';

export default function correlationIdMiddleware(req, res, next) {
  const incoming = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const correlationId = incoming || `cid_${uuidv4()}`;
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  if (req.log && typeof req.log.child === 'function') {
    req.log = req.log.child({ correlationId });
  }
  next();
}
