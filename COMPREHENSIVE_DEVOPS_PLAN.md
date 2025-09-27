# 🚀 Comprehensive DevOps & Staging Environment Plan
## Shithaa E-commerce Platform Enhancement

### 📋 **Executive Summary**
This plan addresses critical issues in your e-commerce platform and implements a robust DevOps infrastructure with proper staging environment, CI/CD pipeline, monitoring, and performance optimization.

---

## 🎯 **Phase 1: Critical Fixes (Week 1)**

### 1.1 Payment System Stabilization
**Priority: CRITICAL**

#### Issues:
- PhonePe webhooks not configured properly
- Payment failures due to webhook signature validation
- Inconsistent error handling

#### Solutions:
```bash
# 1. Configure PhonePe webhooks
cd backend
chmod +x add-webhook-env.sh
./add-webhook-env.sh

# 2. Update environment variables
echo "PHONEPE_CALLBACK_USERNAME=shithaa_webhook" >> .env
echo "PHONEPE_CALLBACK_PASSWORD=webhook_secure_2024" >> .env

# 3. Restart services
pm2 restart shithaa-backend
```

#### Files to Update:
- `backend/controllers/webhookController.js` - Enhanced error handling
- `backend/controllers/paymentController.js` - Retry mechanisms
- `backend/middleware/paymentValidation.js` - New validation layer

### 1.2 Cart System Optimization
**Priority: HIGH**

#### Issues:
- Price fluctuation in cart
- Inefficient cache invalidation
- Race conditions in cart calculations

#### Solutions:
- Implement atomic cart operations
- Add cart state persistence
- Optimize cache strategies

---

## 🏗️ **Phase 2: Staging Environment Setup (Week 2)**

### 2.1 Staging Infrastructure
**Target: cheetah-ecom-staging folder**

#### Directory Structure:
```
/var/www/
├── shithaa-ecom/              # Production
│   ├── frontend/
│   ├── backend/
│   └── admin/
└── cheetah-ecom-staging/      # Staging
    ├── frontend/
    ├── backend/
    ├── admin/
    ├── docker-compose.yml
    ├── .env.staging
    └── nginx-staging.conf
```

#### Staging Configuration:
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=staging
      - NEXT_PUBLIC_API_URL=http://localhost:4001
  
  backend:
    build: ./backend
    ports:
      - "4001:4000"
    environment:
      - NODE_ENV=staging
      - MONGODB_URI=mongodb://mongo:27017/shithaa-staging
  
  admin:
    build: ./admin
    ports:
      - "5174:5173"
    environment:
      - NODE_ENV=staging
  
  mongo:
    image: mongo:latest
    ports:
      - "27018:27017"
    volumes:
      - mongo_data:/data/db
  
  redis:
    image: redis:alpine
    ports:
      - "6380:6379"

volumes:
  mongo_data:
```

### 2.2 Staging Domain Setup
```nginx
# nginx-staging.conf
server {
    listen 80;
    server_name staging.shithaa.in;
    
    location / {
        proxy_pass http://127.0.0.1:3001;
        # ... proxy configuration
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:4001;
        # ... proxy configuration
    }
    
    location /admin/ {
        proxy_pass http://127.0.0.1:5174;
        # ... proxy configuration
    }
}
```

---

## 🐳 **Phase 3: Docker Containerization (Week 3)**

### 3.1 Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package*.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

### 3.2 Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### 3.3 Docker Compose for Production
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
  
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    depends_on:
      - mongo
      - redis
  
  mongo:
    image: mongo:latest
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped
  
  redis:
    image: redis:alpine
    restart: unless-stopped
```

---

## 🔄 **Phase 4: CI/CD Pipeline (Week 4)**

### 4.1 Jenkins Pipeline Setup
```groovy
// Jenkinsfile
pipeline {
    agent any
    
    environment {
        DOCKER_REGISTRY = 'your-registry.com'
        IMAGE_TAG = "${env.BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Test') {
            parallel {
                stage('Frontend Tests') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci'
                            sh 'npm run test'
                        }
                    }
                }
                stage('Backend Tests') {
                    steps {
                        dir('backend') {
                            sh 'npm ci'
                            sh 'npm run test'
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Images') {
            steps {
                script {
                    docker.build("${DOCKER_REGISTRY}/shithaa-frontend:${IMAGE_TAG}", "./frontend")
                    docker.build("${DOCKER_REGISTRY}/shithaa-backend:${IMAGE_TAG}", "./backend")
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                sh 'docker-compose -f docker-compose.staging.yml up -d'
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                sh 'docker-compose -f docker-compose.prod.yml up -d'
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        failure {
            emailext (
                subject: "Build Failed: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Build failed. Check console output.",
                to: "admin@shithaa.in"
            )
        }
    }
}
```

### 4.2 GitHub Actions Alternative
```yaml
# .github/workflows/deploy.yml
name: Deploy to Staging/Production

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd frontend && npm ci
          cd ../backend && npm ci
      
      - name: Run tests
        run: |
          cd frontend && npm run test
          cd ../backend && npm run test

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to staging
        run: |
          # Deploy to staging server
          ssh user@staging-server 'cd /var/www/cheetah-ecom-staging && git pull && docker-compose up -d'

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          # Deploy to production server
          ssh user@production-server 'cd /var/www/shithaa-ecom && git pull && docker-compose up -d'
```

---

## 📊 **Phase 5: Advanced Monitoring & Analytics (Week 5)**

### 5.1 Comprehensive Monitoring Stack
```yaml
# monitoring/docker-compose.monitoring.yml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana
  
  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"
  
  cadvisor:
    image: gcr.io/cadvisor/cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
```

### 5.2 Application Metrics Integration
```javascript
// backend/middleware/metrics.js
import client from 'prom-client';

const register = new client.Registry();

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);

export { register, httpRequestDuration, httpRequestTotal, activeConnections };
```

### 5.3 User Analytics Implementation
```javascript
// frontend/lib/analytics.js
class Analytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.events = [];
  }
  
  track(event, properties = {}) {
    const eventData = {
      event,
      properties: {
        ...properties,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };
    
    this.events.push(eventData);
    this.sendToServer(eventData);
  }
  
  trackPageView() {
    this.track('page_view', {
      page: window.location.pathname,
      title: document.title
    });
  }
  
  trackProductView(productId, productName) {
    this.track('product_view', {
      productId,
      productName
    });
  }
  
  trackAddToCart(productId, quantity, price) {
    this.track('add_to_cart', {
      productId,
      quantity,
      price
    });
  }
  
  trackPurchase(orderId, total, items) {
    this.track('purchase', {
      orderId,
      total,
      items
    });
  }
  
  async sendToServer(eventData) {
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
  
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export default new Analytics();
```

---

## 🚀 **Phase 6: Performance Optimization (Week 6)**

### 6.1 CloudFlare CDN Activation
```bash
# 1. Deploy CloudFlare configuration
sudo ./deploy-cloudflare-optimization.sh

# 2. Verify CDN is working
node verify-cloudflare-cdn.js

# 3. Test image optimization
curl -H "Accept: image/webp" https://shithaa.in/images/logo.jpg
```

### 6.2 Database Optimization
```javascript
// backend/scripts/optimize-database.js
import mongoose from 'mongoose';

// Add indexes for better performance
const optimizeDatabase = async () => {
  const db = mongoose.connection.db;
  
  // Product indexes
  await db.collection('products').createIndex({ category: 1, price: 1 });
  await db.collection('products').createIndex({ name: 'text', description: 'text' });
  await db.collection('products').createIndex({ 'sizes.stock': 1 });
  
  // Order indexes
  await db.collection('orders').createIndex({ userId: 1, createdAt: -1 });
  await db.collection('orders').createIndex({ orderStatus: 1, createdAt: -1 });
  
  // User indexes
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  
  console.log('Database optimization completed');
};
```

### 6.3 Caching Strategy Enhancement
```javascript
// backend/services/cacheService.js
import redisService from './redisService.js';

class CacheService {
  constructor() {
    this.defaultTTL = 300; // 5 minutes
    this.longTTL = 3600; // 1 hour
    this.shortTTL = 60; // 1 minute
  }
  
  async get(key) {
    try {
      const cached = await redisService.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  async set(key, value, ttl = this.defaultTTL) {
    try {
      await redisService.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }
  
  async invalidate(pattern) {
    try {
      const keys = await redisService.keys(pattern);
      if (keys.length > 0) {
        await redisService.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  // Smart caching for different data types
  async cacheProducts(category, products) {
    const key = `products:category:${category}`;
    await this.set(key, products, this.longTTL);
  }
  
  async cacheUser(userId, userData) {
    const key = `user:${userId}`;
    await this.set(key, userData, this.longTTL);
  }
  
  async cacheCart(userId, cartData) {
    const key = `cart:${userId}`;
    await this.set(key, cartData, this.shortTTL);
  }
}

export default new CacheService();
```

---

## 🎯 **Implementation Timeline**

### Week 1: Critical Fixes
- [ ] Fix PhonePe webhook configuration
- [ ] Stabilize payment system
- [ ] Optimize cart functionality
- [ ] Deploy hotfixes to production

### Week 2: Staging Environment
- [ ] Set up cheetah-ecom-staging directory
- [ ] Configure staging database
- [ ] Set up staging domain
- [ ] Deploy staging environment

### Week 3: Docker Containerization
- [ ] Create Dockerfiles for all services
- [ ] Set up Docker Compose configurations
- [ ] Test containerized deployment
- [ ] Migrate to containerized architecture

### Week 4: CI/CD Pipeline
- [ ] Set up Jenkins or GitHub Actions
- [ ] Create automated testing pipeline
- [ ] Implement automated deployment
- [ ] Set up branch protection rules

### Week 5: Monitoring & Analytics
- [ ] Deploy monitoring stack (Prometheus/Grafana)
- [ ] Implement user analytics tracking
- [ ] Set up alerting system
- [ ] Create monitoring dashboards

### Week 6: Performance Optimization
- [ ] Activate CloudFlare CDN
- [ ] Optimize database queries
- [ ] Enhance caching strategies
- [ ] Performance testing and tuning

---

## 🚨 **Immediate Actions Required**

### 1. Fix Payment System (TODAY)
```bash
cd /var/www/shithaa-ecom/backend
chmod +x add-webhook-env.sh
./add-webhook-env.sh
pm2 restart shithaa-backend
```

### 2. Set Up Staging Environment (THIS WEEK)
```bash
# Create staging directory
sudo mkdir -p /var/www/cheetah-ecom-staging
cd /var/www/cheetah-ecom-staging

# Clone repository
git clone <your-repo-url> .

# Create staging branch
git checkout -b develop
```

### 3. Implement Basic Monitoring (THIS WEEK)
```bash
# Add monitoring endpoints
curl https://shithaa.in/api/health
curl https://shithaa.in/api/cache/stats
```

---

## 📞 **Support & Next Steps**

1. **Start with Phase 1** - Fix critical payment issues immediately
2. **Set up staging environment** - Use cheetah-ecom-staging folder
3. **Implement monitoring** - Track site performance and user behavior
4. **Gradually implement CI/CD** - Automate your deployment process

Would you like me to start implementing any specific phase, or do you have questions about any part of this plan?
