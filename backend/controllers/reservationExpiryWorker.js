// backend/controllers/reservationExpiryWorker.js

import { cleanupExpiredReservations } from '../utils/stock.js';
import CheckoutSession from '../models/CheckoutSession.js'; // Import CheckoutSession model

export const manualExpiryTrigger = async (req, res) => {
  try {
    console.log('Manual reservation expiry triggered');
    const result = await cleanupExpiredReservations();
    res.json({ success: true, message: 'Reservation expiry triggered successfully', result });
  } catch (error) {
    console.error('Error triggering reservation expiry:', error);
    res.status(500).json({ success: false, message: 'Failed to trigger expiry' });
  }
};

export const getReservationStats = async (req, res) => {
  try {
    console.log('Getting reservation statistics');
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const activeReservations = await CheckoutSession.countDocuments({
        status: { $in: ['pending', 'awaiting_payment'] },
        stockReserved: true,
        createdAt: { $gte: tenMinutesAgo }
    });

    const expiredReservations = await CheckoutSession.countDocuments({
        status: { $in: ['pending', 'awaiting_payment'] },
        stockReserved: true,
        createdAt: { $lt: tenMinutesAgo }
    });

    const totalReservations = await CheckoutSession.countDocuments({
        stockReserved: true
    });

    res.json({ 
      success: true, 
      stats: {
        totalReservations,
        activeReservations,
        expiredReservations
      }
    });
  } catch (error) {
    console.error('Error getting reservation stats:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats' });
  }
};
