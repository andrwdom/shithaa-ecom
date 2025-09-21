import mongoose from 'mongoose';
import CheckoutSession from '../models/CheckoutSession.js';
import PaymentEvent from '../models/PaymentEvent.js';
import { releaseStockReservation } from '../utils/stock.js';

/**
 * Cleanup job that runs periodically to:
 * 1. Find abandoned payment sessions (no activity for 14 mins)
 * 2. Release reserved stock
 * 3. Mark sessions as expired
 * 4. Log events for monitoring
 */
export async function cleanupAbandonedPaymentSessions() {
  const correlationId = `cleanup_${Date.now()}`;
  console.log(`[${correlationId}] Starting payment session cleanup`);

  try {
    // Find sessions that have timed out (14 mins PhonePe window)
    const timeoutThreshold = new Date(Date.now() - 14 * 60 * 1000); // 14 minutes ago
    
    const abandonedSessions = await CheckoutSession.find({
      status: 'awaiting_payment',
      stockReserved: true,
      timeoutAt: { $lt: new Date() },
      updatedAt: { $lt: timeoutThreshold }
    });

    console.log(`[${correlationId}] Found ${abandonedSessions.length} abandoned payment sessions`);

    for (const session of abandonedSessions) {
      const sessionId = session.sessionId;
      console.log(`[${correlationId}] Processing abandoned session: ${sessionId}`);

      // Start a transaction for atomic operations
      const dbSession = await mongoose.startSession();
      await dbSession.withTransaction(async () => {
        // Release stock for all items
        const releasePromises = session.items.map(item =>
          releaseStockReservation(item.productId, item.size, item.quantity, { session: dbSession })
            .catch(error => {
              console.error(`[${correlationId}] Failed to release stock for product ${item.productId}:`, error);
              // Log the error but continue processing other items
              return { success: false, error };
            })
        );

        const releaseResults = await Promise.all(releasePromises);
        const allReleased = releaseResults.every(result => result.success !== false);

        // Update session status
        session.status = 'expired';
        session.stockReserved = false;
        await session.save({ session: dbSession });

        // Log the cleanup event
        await PaymentEvent.create([{
          correlationId,
          eventType: 'payment_session_expired',
          source: 'cleanup_job',
          checkoutSessionId: sessionId,
          userId: session.userId,
          userEmail: session.userEmail,
          status: allReleased ? 'success' : 'partial_success',
          data: {
            releaseResults,
            reason: 'payment_timeout',
            timeoutThreshold: timeoutThreshold.toISOString()
          }
        }], { session: dbSession });

        console.log(`[${correlationId}] Successfully processed abandoned session: ${sessionId}`);
      });

      await dbSession.endSession();
    }

    console.log(`[${correlationId}] Completed payment session cleanup`);
    return { processed: abandonedSessions.length };
  } catch (error) {
    console.error(`[${correlationId}] Error in payment session cleanup:`, error);
    throw error;
  }
}

// Export a function to start the cleanup job
export function startCleanupJob(intervalMinutes = 1) {
  console.log(`Starting payment session cleanup job (interval: ${intervalMinutes} minutes)`);
  
  // Run immediately on start
  cleanupAbandonedPaymentSessions().catch(console.error);
  
  // Then schedule periodic runs
  const interval = setInterval(() => {
    cleanupAbandonedPaymentSessions().catch(console.error);
  }, intervalMinutes * 60 * 1000);

  return interval;
}
