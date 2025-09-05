import express from 'express';
import { 
  emergencyStockCleanup, 
  regularStockCleanup, 
  getSystemHealth 
} from '../controllers/adminController.js';
import { verifyToken } from '../middleware/auth.js';

const adminRouter = express.Router();

// All admin routes require authentication
adminRouter.use(verifyToken);

// Emergency stock cleanup - resets all reserved stock to 0
adminRouter.post('/emergency-stock-cleanup', emergencyStockCleanup);

// Regular stock cleanup - only cleans up expired reservations
adminRouter.post('/stock-cleanup', regularStockCleanup);

// Get system health and stock status
adminRouter.get('/system-health', getSystemHealth);

export default adminRouter;
