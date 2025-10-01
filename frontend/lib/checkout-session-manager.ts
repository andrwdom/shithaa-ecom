/**
 * Checkout Session Manager
 * Handles checkout session lifecycle and cleanup
 */

interface CheckoutSessionManager {
  sessionId: string | null;
  token: string | null;
  isActive: boolean;
}

class CheckoutSessionManagerClass {
  private sessionId: string | null = null;
  private token: string | null = null;
  private isActive: boolean = false;
  private paymentInitiated: boolean = false; // 🔧 NEW: Track if payment was initiated
  private sessionStartTime: number = 0; // 🔧 CRITICAL FIX: Track when session started
  private cleanupHandlers: (() => void)[] = [];
  private readonly GRACE_PERIOD_MS = 8000; // 🔧 CRITICAL FIX: 8 second grace period to prevent false triggers

  /**
   * Start managing a checkout session
   */
  startSession(sessionId: string, token: string) {
    this.sessionId = sessionId;
    this.token = token;
    this.isActive = true;
    this.sessionStartTime = Date.now(); // 🔧 CRITICAL FIX: Record when we started managing
    console.log('[CheckoutSession] ✅ Started managing session:', sessionId, '- Grace period: 8s');
    this.wireUpGuards();
  }

  /**
   * Stop managing the current session
   */
  stopSession() {
    console.log('[CheckoutSession] 🛑 Stopped managing session');
    this.isActive = false;
    this.sessionStartTime = 0;
    this.cleanupHandlers.forEach(cleanup => cleanup());
    this.cleanupHandlers = [];
  }

  /**
   * 🔧 NEW: Mark that payment has been initiated
   * This prevents automatic session cancellation on page unload
   */
  markPaymentInitiated() {
    this.paymentInitiated = true;
    console.log('[CheckoutSession] 💳 Payment initiated - session will NOT be cancelled on redirect');
  }

  /**
   * Cancel the current checkout session
   */
  async cancelSession(): Promise<boolean> {
    if (!this.sessionId || !this.token || !this.isActive) {
      return false;
    }

    const url = `/api/checkout/session/${this.sessionId}/cancel`;
    const headers = { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' };

    try {
      // 🔧 FIX: Use fetch with keepalive ONLY (more reliable than sendBeacon)
      // sendBeacon was causing double requests
      const response = await fetch(url, { 
        method: 'POST', 
        headers, 
        keepalive: true,
        body: JSON.stringify({}) // Empty body to satisfy backend
      });
      
      if (response.ok) {
        console.log('[CheckoutSession] ✅ Session cancelled successfully');
        return true;
      } else {
        console.warn('[CheckoutSession] ⚠️ Cancel request failed:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('[CheckoutSession] ❌ Cancel request error:', error);
      return false;
    }
  }

  /**
   * Wire up event listeners for checkout session cleanup
   */
  private wireUpGuards() {
    const handler = () => {
      // 🔧 CRITICAL FIX: Check if we're within the grace period
      const timeSinceStart = Date.now() - this.sessionStartTime;
      const withinGracePeriod = timeSinceStart < this.GRACE_PERIOD_MS;
      
      if (withinGracePeriod) {
        console.log(`[CheckoutSession] ⏰ Within grace period (${Math.round(timeSinceStart/1000)}s) - IGNORING cancel trigger`);
        return; // 🔧 CRITICAL: Don't cancel during grace period (prevents false triggers from navigation)
      }
      
      // 🔧 CRITICAL FIX: Don't cancel if payment was initiated
      if (this.isActive && !this.paymentInitiated) {
        console.log('[CheckoutSession] 🚨 User leaving checkout (after grace period), cancelling session...');
        this.cancelSession();
      } else if (this.paymentInitiated) {
        console.log('[CheckoutSession] ✅ Payment initiated - skipping cancel');
      }
    };

    // User closes/navigates away
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      handler();
      // Don't prevent the unload, just clean up
    };

    const pageHideHandler = () => {
      handler();
    };

    // App goes background (e.g., mobile app switching)
    const visibilityChangeHandler = () => {
      if (document.visibilityState === 'hidden') {
        handler();
      }
    };

    // Add event listeners
    window.addEventListener('beforeunload', beforeUnloadHandler);
    window.addEventListener('pagehide', pageHideHandler);
    document.addEventListener('visibilitychange', visibilityChangeHandler);

    // Store cleanup functions
    this.cleanupHandlers.push(() => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      window.removeEventListener('pagehide', pageHideHandler);
      document.removeEventListener('visibilitychange', visibilityChangeHandler);
    });
  }

  /**
   * Get current session info
   */
  getSessionInfo(): CheckoutSessionManager {
    return {
      sessionId: this.sessionId,
      token: this.token,
      isActive: this.isActive
    };
  }
}

// Export singleton instance
export const checkoutSessionManager = new CheckoutSessionManagerClass();

// Export utility functions for easy use
export const startCheckoutSession = (sessionId: string, token: string) => {
  checkoutSessionManager.startSession(sessionId, token);
};

export const stopCheckoutSession = () => {
  checkoutSessionManager.stopSession();
};

export const cancelCheckoutSession = () => {
  return checkoutSessionManager.cancelSession();
};

export const markPaymentInitiated = () => {
  checkoutSessionManager.markPaymentInitiated();
};

export const getCheckoutSessionInfo = () => {
  return checkoutSessionManager.getSessionInfo();
};
