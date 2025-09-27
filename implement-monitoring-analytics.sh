#!/bin/bash

# 📊 Monitoring & Analytics Implementation Script
# This script sets up comprehensive monitoring and analytics for the e-commerce platform

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📊 Setting up Monitoring & Analytics...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Navigate to project directory
cd /var/www/shithaa-ecom

echo -e "${YELLOW}📦 Installing monitoring dependencies...${NC}"

# Install monitoring packages for backend
cd backend
npm install prom-client express-prometheus-middleware winston winston-daily-rotate-file

# Install analytics packages for frontend
cd ../frontend
npm install @vercel/analytics gtag react-ga4

echo -e "${GREEN}✅ Monitoring dependencies installed${NC}"

# Create comprehensive monitoring system
echo -e "${YELLOW}🔧 Creating monitoring system...${NC}"

cd ../backend

# Create enhanced monitoring service
cat > services/monitoringService.js << 'EOF'
import client from 'prom-client';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Create custom registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'environment'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'environment']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const paymentSuccessTotal = new client.Counter({
  name: 'payment_success_total',
  help: 'Total number of successful payments',
  labelNames: ['payment_method', 'amount_range']
});

const paymentFailureTotal = new client.Counter({
  name: 'payment_failure_total',
  help: 'Total number of failed payments',
  labelNames: ['payment_method', 'error_type']
});

const cartOperationsTotal = new client.Counter({
  name: 'cart_operations_total',
  help: 'Total number of cart operations',
  labelNames: ['operation_type', 'user_type']
});

const productViewsTotal = new client.Counter({
  name: 'product_views_total',
  help: 'Total number of product views',
  labelNames: ['product_category', 'user_type']
});

const orderTotal = new client.Counter({
  name: 'orders_total',
  help: 'Total number of orders',
  labelNames: ['status', 'payment_method']
});

const revenueTotal = new client.Counter({
  name: 'revenue_total',
  help: 'Total revenue in rupees',
  labelNames: ['payment_method', 'category']
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(paymentSuccessTotal);
register.registerMetric(paymentFailureTotal);
register.registerMetric(cartOperationsTotal);
register.registerMetric(productViewsTotal);
register.registerMetric(orderTotal);
register.registerMetric(revenueTotal);

// Winston logger configuration
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'shithaa-ecom' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

class MonitoringService {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
  }

  // HTTP Request Metrics
  recordHttpRequest(method, route, statusCode, duration) {
    const labels = {
      method,
      route: this.sanitizeRoute(route),
      status_code: statusCode.toString(),
      environment: process.env.NODE_ENV || 'development'
    };

    httpRequestDuration.observe(labels, duration / 1000);
    httpRequestTotal.inc(labels);

    this.requestCount++;
    
    if (statusCode >= 400) {
      this.errorCount++;
    }
  }

  // Payment Metrics
  recordPaymentSuccess(paymentMethod, amount) {
    const amountRange = this.getAmountRange(amount);
    paymentSuccessTotal.inc({
      payment_method: paymentMethod,
      amount_range: amountRange
    });

    logger.info('Payment successful', {
      paymentMethod,
      amount,
      timestamp: new Date().toISOString()
    });
  }

  recordPaymentFailure(paymentMethod, errorType, error) {
    paymentFailureTotal.inc({
      payment_method: paymentMethod,
      error_type: errorType
    });

    logger.error('Payment failed', {
      paymentMethod,
      errorType,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Cart Metrics
  recordCartOperation(operationType, userType = 'guest') {
    cartOperationsTotal.inc({
      operation_type: operationType,
      user_type: userType
    });
  }

  // Product Metrics
  recordProductView(productCategory, userType = 'guest') {
    productViewsTotal.inc({
      product_category: productCategory,
      user_type: userType
    });
  }

  // Order Metrics
  recordOrder(status, paymentMethod, revenue = 0) {
    orderTotal.inc({
      status,
      payment_method: paymentMethod
    });

    if (revenue > 0) {
      revenueTotal.inc({
        payment_method: paymentMethod,
        category: 'total'
      }, revenue);
    }
  }

  // System Metrics
  updateActiveConnections(count) {
    activeConnections.set(count);
  }

  // Health Check
  getHealthMetrics() {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      uptime: Math.floor(uptime / 1000),
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: Math.round(errorRate * 100) / 100,
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  // Utility Methods
  sanitizeRoute(route) {
    // Replace dynamic segments with placeholders
    return route
      .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // MongoDB ObjectId
      .replace(/\/[0-9]+/g, '/:id') // Numeric IDs
      .replace(/\?.*$/, ''); // Remove query parameters
  }

  getAmountRange(amount) {
    if (amount < 500) return '0-500';
    if (amount < 1000) return '500-1000';
    if (amount < 2000) return '1000-2000';
    if (amount < 5000) return '2000-5000';
    return '5000+';
  }

  // Logging methods
  info(message, meta = {}) {
    logger.info(message, meta);
  }

  error(message, meta = {}) {
    logger.error(message, meta);
  }

  warn(message, meta = {}) {
    logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    logger.debug(message, meta);
  }
}

export { register, logger };
export default new MonitoringService();
EOF

# Create analytics service for frontend
echo -e "${YELLOW}📈 Creating analytics service...${NC}"

cd ../frontend

cat > lib/analytics.ts << 'EOF'
// Comprehensive Analytics Service
interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

interface UserProperties {
  userId?: string;
  email?: string;
  userType: 'guest' | 'registered';
  isReturning: boolean;
}

class AnalyticsService {
  private sessionId: string;
  private userId?: string;
  private userProperties: UserProperties;
  private events: AnalyticsEvent[] = [];
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.userProperties = {
      userType: 'guest',
      isReturning: this.isReturningUser()
    };
    
    this.initialize();
  }

  private initialize() {
    if (typeof window === 'undefined') return;

    // Load Google Analytics
    this.loadGoogleAnalytics();
    
    // Load Vercel Analytics
    this.loadVercelAnalytics();
    
    // Track page view
    this.trackPageView();
    
    // Set up event listeners
    this.setupEventListeners();
    
    this.isInitialized = true;
  }

  private loadGoogleAnalytics() {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', process.env.NEXT_PUBLIC_GA_ID!);
  }

  private loadVercelAnalytics() {
    if (process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID) {
      import('@vercel/analytics').then(({ Analytics }) => {
        // Vercel Analytics will auto-initialize
      });
    }
  }

  private setupEventListeners() {
    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      // Track product clicks
      if (target.closest('[data-product-id]')) {
        const productId = target.closest('[data-product-id]')?.getAttribute('data-product-id');
        const productName = target.closest('[data-product-id]')?.getAttribute('data-product-name');
        if (productId) {
          this.trackProductClick(productId, productName || 'Unknown');
        }
      }
      
      // Track button clicks
      if (target.matches('button, .btn, [role="button"]')) {
        const buttonText = target.textContent?.trim() || 'Unknown Button';
        this.trackButtonClick(buttonText, target.className);
      }
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      const formName = form.getAttribute('name') || form.className || 'Unknown Form';
      this.trackFormSubmission(formName);
    });

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
      const scrollDepth = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        this.trackScrollDepth(scrollDepth);
      }
    });
  }

  // Core tracking methods
  track(event: string, properties: Record<string, any> = {}) {
    const eventData: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        ...this.userProperties
      }
    };

    this.events.push(eventData);
    
    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', event, properties);
    }

    // Send to backend
    this.sendToBackend(eventData);
  }

  // E-commerce specific tracking
  trackPageView(page?: string) {
    const pageName = page || window.location.pathname;
    this.track('page_view', {
      page: pageName,
      title: document.title
    });
  }

  trackProductView(productId: string, productName: string, category: string, price: number) {
    this.track('product_view', {
      productId,
      productName,
      category,
      price,
      currency: 'INR'
    });
  }

  trackProductClick(productId: string, productName: string) {
    this.track('product_click', {
      productId,
      productName
    });
  }

  trackAddToCart(productId: string, productName: string, category: string, price: number, quantity: number = 1) {
    this.track('add_to_cart', {
      productId,
      productName,
      category,
      price,
      quantity,
      currency: 'INR',
      value: price * quantity
    });
  }

  trackRemoveFromCart(productId: string, productName: string, quantity: number) {
    this.track('remove_from_cart', {
      productId,
      productName,
      quantity
    });
  }

  trackCartView(cartItems: any[], totalValue: number) {
    this.track('cart_view', {
      cartItems: cartItems.length,
      totalValue,
      currency: 'INR'
    });
  }

  trackCheckoutStarted(checkoutData: any) {
    this.track('checkout_started', {
      items: checkoutData.items?.length || 0,
      totalValue: checkoutData.total || 0,
      currency: 'INR'
    });
  }

  trackPurchase(orderId: string, total: number, items: any[], paymentMethod: string) {
    this.track('purchase', {
      orderId,
      total,
      items: items.length,
      paymentMethod,
      currency: 'INR',
      value: total
    });
  }

  trackPaymentSuccess(orderId: string, paymentMethod: string, amount: number) {
    this.track('payment_success', {
      orderId,
      paymentMethod,
      amount,
      currency: 'INR'
    });
  }

  trackPaymentFailure(orderId: string, paymentMethod: string, error: string) {
    this.track('payment_failure', {
      orderId,
      paymentMethod,
      error
    });
  }

  // User behavior tracking
  trackButtonClick(buttonText: string, className: string) {
    this.track('button_click', {
      buttonText,
      className
    });
  }

  trackFormSubmission(formName: string) {
    this.track('form_submission', {
      formName
    });
  }

  trackScrollDepth(depth: number) {
    this.track('scroll_depth', {
      depth
    });
  }

  trackSearch(searchTerm: string, resultsCount: number) {
    this.track('search', {
      searchTerm,
      resultsCount
    });
  }

  trackFilter(category: string, filterType: string, filterValue: string) {
    this.track('filter', {
      category,
      filterType,
      filterValue
    });
  }

  // User identification
  identify(userId: string, userProperties: Partial<UserProperties>) {
    this.userId = userId;
    this.userProperties = {
      ...this.userProperties,
      ...userProperties,
      userId
    };

    // Update Google Analytics
    if (window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
        user_id: userId
      });
    }
  }

  // Utility methods
  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private isReturningUser(): boolean {
    return localStorage.getItem('shithaa_returning_user') === 'true';
  }

  private async sendToBackend(eventData: AnalyticsEvent) {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  // Get analytics data
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getUserProperties(): UserProperties {
    return { ...this.userProperties };
  }
}

// Create singleton instance
const analytics = new AnalyticsService();

// Mark as returning user
if (typeof window !== 'undefined') {
  localStorage.setItem('shithaa_returning_user', 'true');
}

export default analytics;
EOF

# Create analytics API endpoint
echo -e "${YELLOW}🔌 Creating analytics API endpoint...${NC}"

cd ../backend

cat > routes/analyticsRoute.js << 'EOF'
import express from 'express';
import { successResponse, errorResponse } from '../utils/response.js';
import monitoringService from '../services/monitoringService.js';

const router = express.Router();

// Track analytics event
router.post('/track', async (req, res) => {
  try {
    const { event, properties } = req.body;
    
    if (!event) {
      return errorResponse(res, 400, 'Event name is required');
    }

    // Log the event
    monitoringService.info('Analytics event received', {
      event,
      properties,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Record specific metrics based on event type
    switch (event) {
      case 'product_view':
        monitoringService.recordProductView(
          properties.category || 'unknown',
          properties.userType || 'guest'
        );
        break;
        
      case 'add_to_cart':
        monitoringService.recordCartOperation('add_to_cart', properties.userType || 'guest');
        break;
        
      case 'remove_from_cart':
        monitoringService.recordCartOperation('remove_from_cart', properties.userType || 'guest');
        break;
        
      case 'purchase':
        monitoringService.recordOrder(
          'completed',
          properties.paymentMethod || 'unknown',
          properties.total || 0
        );
        break;
        
      case 'payment_success':
        monitoringService.recordPaymentSuccess(
          properties.paymentMethod || 'unknown',
          properties.amount || 0
        );
        break;
        
      case 'payment_failure':
        monitoringService.recordPaymentFailure(
          properties.paymentMethod || 'unknown',
          'user_error',
          new Error(properties.error || 'Unknown error')
        );
        break;
    }

    return successResponse(res, { message: 'Event tracked successfully' });
    
  } catch (error) {
    monitoringService.error('Analytics tracking error', {
      error: error.message,
      stack: error.stack
    });
    return errorResponse(res, 500, 'Failed to track event');
  }
});

// Get analytics metrics
router.get('/metrics', async (req, res) => {
  try {
    const healthMetrics = monitoringService.getHealthMetrics();
    
    return successResponse(res, {
      health: healthMetrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    monitoringService.error('Analytics metrics error', {
      error: error.message,
      stack: error.stack
    });
    return errorResponse(res, 500, 'Failed to get metrics');
  }
});

// Get Prometheus metrics
router.get('/prometheus', async (req, res) => {
  try {
    const { register } = await import('../services/monitoringService.js');
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    monitoringService.error('Prometheus metrics error', {
      error: error.message,
      stack: error.stack
    });
    return errorResponse(res, 500, 'Failed to get Prometheus metrics');
  }
});

export default router;
EOF

# Update server.js to include analytics
echo -e "${YELLOW}🔧 Updating server configuration...${NC}"

# Add analytics route to server.js
sed -i '/\/api\/admin/a\\n// Analytics routes\nimport analyticsRouter from "./routes/analyticsRoute.js"\napp.use("/api/analytics", analyticsRouter)' server.js

# Add monitoring middleware
sed -i '/\/\/ PRODUCTION MONITORING: Request tracking middleware/a\\n// Enhanced monitoring middleware\nimport monitoringService from "./services/monitoringService.js";\n\napp.use((req, res, next) => {\n  const startTime = Date.now();\n  \n  // Override res.end to track metrics\n  const originalEnd = res.end;\n  res.end = function(...args) {\n    const duration = Date.now() - startTime;\n    monitoringService.recordHttpRequest(req.method, req.path, res.statusCode, duration);\n    originalEnd.apply(this, args);\n  };\n  \n  next();\n});' server.js

# Create monitoring dashboard
echo -e "${YELLOW}📊 Creating monitoring dashboard...${NC}"

cat > monitoring/docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    privileged: true
    devices:
      - /dev/kmsg

volumes:
  prometheus_data:
  grafana_data:
EOF

# Create Prometheus configuration
mkdir -p monitoring
cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "rules/*.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'shithaa-backend'
    static_configs:
      - targets: ['host.docker.internal:4000']
    metrics_path: '/api/analytics/prometheus'
    scrape_interval: 30s
EOF

# Create Grafana dashboards
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/provisioning/datasources

cat > monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF

# Create monitoring deployment script
cat > deploy-monitoring.sh << 'EOF'
#!/bin/bash

# Deploy Monitoring Stack
echo "🚀 Deploying monitoring stack..."

cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

echo "✅ Monitoring stack deployed!"
echo "📊 Grafana: http://localhost:3001 (admin/admin123)"
echo "📈 Prometheus: http://localhost:9090"
echo "🔍 cAdvisor: http://localhost:8080"
EOF

chmod +x deploy-monitoring.sh

# Create analytics test script
cat > test-analytics.js << 'EOF'
#!/usr/bin/env node

// Analytics Test Script
import fetch from 'node-fetch';

const testAnalytics = async () => {
  const baseUrl = 'http://localhost:4000';
  
  console.log('🧪 Testing Analytics System...\n');
  
  // Test analytics tracking
  const testEvents = [
    {
      event: 'product_view',
      properties: {
        productId: 'test-product-1',
        productName: 'Test Product',
        category: 'maternity',
        price: 1299,
        userType: 'guest'
      }
    },
    {
      event: 'add_to_cart',
      properties: {
        productId: 'test-product-1',
        productName: 'Test Product',
        quantity: 1,
        userType: 'guest'
      }
    },
    {
      event: 'purchase',
      properties: {
        orderId: 'test-order-1',
        total: 1299,
        paymentMethod: 'razorpay',
        userType: 'registered'
      }
    }
  ];
  
  for (const eventData of testEvents) {
    try {
      const response = await fetch(`${baseUrl}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      
      if (response.ok) {
        console.log(`✅ ${eventData.event}: Tracked successfully`);
      } else {
        console.log(`❌ ${eventData.event}: Failed to track`);
      }
    } catch (error) {
      console.log(`❌ ${eventData.event}: ${error.message}`);
    }
  }
  
  // Test metrics endpoint
  try {
    const response = await fetch(`${baseUrl}/api/analytics/metrics`);
    const metrics = await response.json();
    console.log('\n📊 Health Metrics:', metrics);
  } catch (error) {
    console.log('❌ Metrics endpoint failed:', error.message);
  }
  
  console.log('\n🎉 Analytics test completed!');
};

testAnalytics().catch(console.error);
EOF

chmod +x test-analytics.js

# Set up permissions
chown -R www-data:www-data /var/www/shithaa-ecom
chmod -R 755 /var/www/shithaa-ecom

echo -e "${GREEN}✅ Monitoring & Analytics setup completed!${NC}"

echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "1. Update environment variables with analytics IDs"
echo -e "2. Deploy monitoring stack: ./deploy-monitoring.sh"
echo -e "3. Test analytics: node test-analytics.js"
echo -e "4. Access Grafana: http://localhost:3001 (admin/admin123)"
echo -e "5. Access Prometheus: http://localhost:9090"
echo -e ""
echo -e "${GREEN}🎉 Monitoring & Analytics is ready!${NC}"
