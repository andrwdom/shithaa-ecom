/**
 * Production-Grade Circuit Breaker Implementation
 * Prevents cascading failures by monitoring and blocking failing operations
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'Default';
    this.failureThreshold = options.failureThreshold || 5;
    this.timeout = options.timeout || 60000; // 1 minute
    this.retryTimePeriod = options.retryTimePeriod || 60000; // 1 minute
    this.expectedErrors = options.expectedErrors || [];
    
    // States: CLOSED, OPEN, HALF_OPEN
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = null;
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      lastFailure: null,
      lastSuccess: null
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(operation, ...args) {
    this.metrics.totalRequests++;

    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const error = new Error(`Circuit breaker ${this.name} is OPEN. Next retry in ${Math.round((this.nextAttempt - Date.now()) / 1000)}s`);
        error.circuitBreakerOpen = true;
        throw error;
      }
      // Move to half-open to test if service is back
      this.state = 'HALF_OPEN';
      console.log(`🔄 Circuit breaker ${this.name} entering HALF_OPEN state`);
    }

    try {
      const startTime = Date.now();
      const result = await Promise.race([
        operation(...args),
        this.createTimeoutPromise()
      ]);

      // Success
      this.onSuccess(Date.now() - startTime);
      return result;

    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  createTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Operation timeout after ${this.timeout}ms`);
        error.timeout = true;
        reject(error);
      }, this.timeout);
    });
  }

  onSuccess(responseTime) {
    this.failureCount = 0;
    this.metrics.totalSuccesses++;
    this.metrics.lastSuccess = {
      timestamp: new Date(),
      responseTime
    };

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log(`✅ Circuit breaker ${this.name} recovered - state: CLOSED`);
    }
  }

  onFailure(error) {
    this.failureCount++;
    this.metrics.totalFailures++;
    this.metrics.lastFailure = {
      timestamp: new Date(),
      error: error.message
    };

    // Don't count expected errors as failures
    if (this.expectedErrors.some(expectedError => error.message.includes(expectedError))) {
      console.log(`⚠️ Circuit breaker ${this.name} - expected error: ${error.message}`);
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.retryTimePeriod;
      console.error(`🚨 Circuit breaker ${this.name} OPENED after ${this.failureCount} failures. Next retry: ${new Date(this.nextAttempt)}`);
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      nextAttempt: this.nextAttempt,
      metrics: this.metrics,
      healthScore: this.calculateHealthScore()
    };
  }

  calculateHealthScore() {
    if (this.metrics.totalRequests === 0) return 100;
    
    const successRate = (this.metrics.totalSuccesses / this.metrics.totalRequests) * 100;
    const stateBonus = this.state === 'CLOSED' ? 0 : (this.state === 'HALF_OPEN' ? -10 : -30);
    
    return Math.max(0, Math.min(100, Math.round(successRate + stateBonus)));
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = null;
    console.log(`🔄 Circuit breaker ${this.name} manually reset`);
  }

  /**
   * Force open the circuit breaker
   */
  forceOpen() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.retryTimePeriod;
    console.log(`🚨 Circuit breaker ${this.name} manually opened`);
  }
}

/**
 * Circuit Breaker Manager - Handles multiple circuit breakers
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Create or get a circuit breaker
   */
  getCircuitBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ ...options, name }));
    }
    return this.breakers.get(name);
  }

  /**
   * Get all circuit breaker statuses
   */
  getAllStatuses() {
    const statuses = {};
    for (const [name, breaker] of this.breakers) {
      statuses[name] = breaker.getStatus();
    }
    return statuses;
  }

  /**
   * Get unhealthy circuit breakers
   */
  getUnhealthyBreakers() {
    const unhealthy = [];
    for (const [name, breaker] of this.breakers) {
      const status = breaker.getStatus();
      if (status.state !== 'CLOSED' || status.healthScore < 80) {
        unhealthy.push(status);
      }
    }
    return unhealthy;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

// Global circuit breaker manager
const circuitBreakerManager = new CircuitBreakerManager();

// Pre-configured circuit breakers for critical operations
export const stockOperationBreaker = circuitBreakerManager.getCircuitBreaker('stockOperations', {
  failureThreshold: 3,
  timeout: 30000, // 30 seconds
  retryTimePeriod: 120000, // 2 minutes
  expectedErrors: ['Insufficient stock', 'Product not found']
});

export const paymentOperationBreaker = circuitBreakerManager.getCircuitBreaker('paymentOperations', {
  failureThreshold: 5,
  timeout: 45000, // 45 seconds
  retryTimePeriod: 300000, // 5 minutes
  expectedErrors: ['Payment cancelled', 'Invalid transaction']
});

export const databaseOperationBreaker = circuitBreakerManager.getCircuitBreaker('databaseOperations', {
  failureThreshold: 10,
  timeout: 60000, // 1 minute
  retryTimePeriod: 180000, // 3 minutes
  expectedErrors: []
});

export const orderCreationBreaker = circuitBreakerManager.getCircuitBreaker('orderCreation', {
  failureThreshold: 5,
  timeout: 30000, // 30 seconds
  retryTimePeriod: 120000, // 2 minutes
  expectedErrors: ['Validation failed']
});

export { CircuitBreaker, circuitBreakerManager };
export default CircuitBreaker;
