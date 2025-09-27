import express from 'express';
import {
  getMaintenanceStatus,
  toggleMaintenanceMode
} from '../controllers/maintenanceController.js';

const router = express.Router();

// Get maintenance status
router.get('/status', getMaintenanceStatus);

// Toggle maintenance mode (admin only)
router.post('/toggle', toggleMaintenanceMode);

export default router;
