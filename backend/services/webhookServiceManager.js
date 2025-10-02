import BulletproofWebhookProcessor from './bulletproofWebhookProcessor.js';
import WebhookQueueManager from './webhookQueueManager.js';
import WebhookReconciliationService from './webhookReconciliationService.js';
import EnhancedLogger from '../utils/enhancedLogger.js';

/**
 * WEBHOOK SERVICE MANAGER
 * 
 * SINGLETON PATTERN - Ensures only one instance of each service
 * PROPER LIFECYCLE MANAGEMENT - Controlled startup/shutdown
 * DEPENDENCY INJECTION - Clean service dependencies
 * ENTERPRISE-GRADE - Industry standard patterns
 */
class WebhookServiceManager {
  constructor() {
    this.services = {
      processor: null,
      queueManager: null,
      reconciliationService: null
    };
    this.isInitialized = false;
    this.isStarting = false;
    this.startupPromise = null;
  }

  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!WebhookServiceManager.instance) {
      WebhookServiceManager.instance = new WebhookServiceManager();
    }
    return WebhookServiceManager.instance;
  }

  /**
   * Initialize all webhook services
   */
  async initialize() {
    if (this.isInitialized) {
      return this.services;
    }

    if (this.isStarting) {
      return this.startupPromise;
    }

    this.isStarting = true;
    this.startupPromise = this._initializeServices();
    
    try {
      const services = await this.startupPromise;
      this.isInitialized = true;
      this.isStarting = false;
      return services;
    } catch (error) {
      this.isStarting = false;
      throw error;
    }
  }

  /**
   * Internal service initialization
   */
  async _initializeServices() {
    try {
      EnhancedLogger.webhookLog('INFO', 'Initializing webhook services...');

      // Initialize processor first (no dependencies)
      this.services.processor = new BulletproofWebhookProcessor();
      EnhancedLogger.webhookLog('INFO', 'Webhook processor initialized');

      // Initialize queue manager (depends on processor)
      this.services.queueManager = new WebhookQueueManager();
      this.services.queueManager.processor = this.services.processor;
      EnhancedLogger.webhookLog('INFO', 'Webhook queue manager initialized');

      // Initialize reconciliation service (depends on processor)
      this.services.reconciliationService = new WebhookReconciliationService();
      this.services.reconciliationService.processor = this.services.processor;
      EnhancedLogger.webhookLog('INFO', 'Webhook reconciliation service initialized');

      // Start services in proper order
      await this.services.queueManager.start();
      await this.services.reconciliationService.start();

      EnhancedLogger.webhookLog('SUCCESS', 'All webhook services initialized and started');
      return this.services;

    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Service initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get webhook processor
   */
  getProcessor() {
    if (!this.isInitialized) {
      throw new Error('Webhook services not initialized. Call initialize() first.');
    }
    return this.services.processor;
  }

  /**
   * Get queue manager
   */
  getQueueManager() {
    if (!this.isInitialized) {
      throw new Error('Webhook services not initialized. Call initialize() first.');
    }
    return this.services.queueManager;
  }

  /**
   * Get reconciliation service
   */
  getReconciliationService() {
    if (!this.isInitialized) {
      throw new Error('Webhook services not initialized. Call initialize() first.');
    }
    return this.services.reconciliationService;
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown() {
    if (!this.isInitialized) {
      return;
    }

    try {
      EnhancedLogger.webhookLog('INFO', 'Shutting down webhook services...');

      if (this.services.queueManager) {
        await this.services.queueManager.stop();
      }

      if (this.services.reconciliationService) {
        await this.services.reconciliationService.stop();
      }

      this.isInitialized = false;
      EnhancedLogger.webhookLog('SUCCESS', 'All webhook services shut down');

    } catch (error) {
      EnhancedLogger.criticalAlert('WEBHOOK: Service shutdown failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      isInitialized: this.isInitialized,
      isStarting: this.isStarting,
      services: {
        processor: !!this.services.processor,
        queueManager: !!this.services.queueManager,
        reconciliationService: !!this.services.reconciliationService
      }
    };
  }
}

// Export singleton instance
export default WebhookServiceManager.getInstance();
