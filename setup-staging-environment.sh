#!/bin/bash

# 🏗️ Staging Environment Setup Script
# This script sets up the cheetah-ecom-staging environment

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🏗️ Setting up Staging Environment...${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Create staging directory
echo -e "${YELLOW}📁 Creating staging directory...${NC}"
mkdir -p /var/www/cheetah-ecom-staging
cd /var/www/cheetah-ecom-staging

# Clone repository (replace with your actual repo URL)
echo -e "${YELLOW}📥 Cloning repository...${NC}"
if [ ! -d ".git" ]; then
    # Replace with your actual repository URL
    git clone https://github.com/your-username/shithaa-ecom-V3.git .
else
    echo -e "${GREEN}✅ Repository already exists, updating...${NC}"
    git pull origin main
fi

# Create staging branch
echo -e "${YELLOW}🌿 Creating staging branch...${NC}"
git checkout -b develop 2>/dev/null || git checkout develop

# Create staging environment file
echo -e "${YELLOW}⚙️ Creating staging environment configuration...${NC}"

cat > .env.staging << 'EOF'
# Staging Environment Configuration
NODE_ENV=staging
PORT=4000

# Database
MONGODB_URI=mongodb://localhost:27017/shithaa-staging

# JWT
JWT_SECRET=staging_jwt_secret_2024_secure_key

# Payment (Test credentials)
RAZORPAY_KEY_ID=your_test_razorpay_key
RAZORPAY_KEY_SECRET=your_test_razorpay_secret
PHONEPE_MERCHANT_ID=your_test_phonepe_merchant_id
PHONEPE_API_KEY=your_test_phonepe_api_key
PHONEPE_SALT_KEY=your_test_phonepe_salt_key

# PhonePe Webhook (Staging)
PHONEPE_CALLBACK_USERNAME=staging_webhook
PHONEPE_CALLBACK_PASSWORD=staging_webhook_2024
PHONEPE_WEBHOOK_URL=https://staging.shithaa.in/api/payment/phonepe/webhook

# Frontend URLs
FRONTEND_URL=https://staging.shithaa.in
ADMIN_URL=https://staging.shithaa.in/admin

# Redis
REDIS_URL=redis://localhost:6380

# Monitoring
SENTRY_DSN=your_staging_sentry_dsn
MONITORING_WEBHOOK_URL=your_staging_monitoring_webhook

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/var/www/cheetah-ecom-staging/uploads

# Security
CORS_ORIGINS=https://staging.shithaa.in,https://admin.staging.shithaa.in
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Payment Configuration
PAYMENT_RETRY_ATTEMPTS=3
PAYMENT_TIMEOUT=30000
PAYMENT_WEBHOOK_TIMEOUT=10000
EOF

# Create Docker Compose for staging
echo -e "${YELLOW}🐳 Creating Docker Compose configuration...${NC}"

cat > docker-compose.staging.yml << 'EOF'
version: '3.8'

services:
  frontend:
    build: 
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=staging
      - NEXT_PUBLIC_API_URL=http://localhost:4001
      - NEXT_PUBLIC_SITE_URL=https://staging.shithaa.in
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4001:4000"
    environment:
      - NODE_ENV=staging
      - MONGODB_URI=mongodb://mongo:27017/shithaa-staging
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./uploads:/app/uploads
    depends_on:
      - mongo
      - redis
    restart: unless-stopped

  admin:
    build:
      context: ./admin
      dockerfile: Dockerfile
    ports:
      - "5174:5173"
    environment:
      - NODE_ENV=staging
      - VITE_API_URL=http://localhost:4001
    volumes:
      - ./admin:/app
      - /app/node_modules
    depends_on:
      - backend
    restart: unless-stopped

  mongo:
    image: mongo:latest
    ports:
      - "27018:27017"
    volumes:
      - mongo_staging_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=shithaa-staging
    restart: unless-stopped

  redis:
    image: redis:alpine
    ports:
      - "6380:6379"
    volumes:
      - redis_staging_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-staging.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
      - admin
    restart: unless-stopped

volumes:
  mongo_staging_data:
  redis_staging_data:
EOF

# Create staging nginx configuration
echo -e "${YELLOW}🌐 Creating staging nginx configuration...${NC}"

cat > nginx-staging.conf << 'EOF'
# Staging Nginx Configuration
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:4000;
}

upstream admin {
    server admin:5173;
}

server {
    listen 80;
    server_name staging.shithaa.in admin.staging.shithaa.in;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Staging-specific headers
        add_header X-Environment "staging" always;
    }

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # No caching for API in staging
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Admin Panel
    location /admin/ {
        proxy_pass http://admin/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /static/ {
        proxy_pass http://frontend;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://backend;
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
    }
}
EOF

# Create Dockerfiles
echo -e "${YELLOW}🐳 Creating Dockerfiles...${NC}"

# Frontend Dockerfile
cat > frontend/Dockerfile << 'EOF'
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
EOF

# Backend Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
EOF

# Admin Dockerfile
cat > admin/Dockerfile << 'EOF'
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
EOF

# Create staging deployment script
echo -e "${YELLOW}📜 Creating staging deployment script...${NC}"

cat > deploy-staging.sh << 'EOF'
#!/bin/bash

# Staging Deployment Script
set -e

echo "🚀 Deploying to staging environment..."

# Pull latest changes
git pull origin develop

# Build and start services
docker-compose -f docker-compose.staging.yml down
docker-compose -f docker-compose.staging.yml build
docker-compose -f docker-compose.staging.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🏥 Running health checks..."
curl -f http://localhost:4001/api/health || echo "❌ Backend health check failed"
curl -f http://localhost:3001 || echo "❌ Frontend health check failed"
curl -f http://localhost:5174 || echo "❌ Admin health check failed"

echo "✅ Staging deployment completed!"
EOF

chmod +x deploy-staging.sh

# Create staging test script
echo -e "${YELLOW}🧪 Creating staging test script...${NC}"

cat > test-staging.js << 'EOF'
#!/usr/bin/env node

// Staging Environment Test Script
import fetch from 'node-fetch';

const testStagingEnvironment = async () => {
  const baseUrl = 'http://localhost';
  
  const tests = [
    {
      name: 'Frontend Health Check',
      url: `${baseUrl}:3001`,
      expectedStatus: 200
    },
    {
      name: 'Backend Health Check',
      url: `${baseUrl}:4001/api/health`,
      expectedStatus: 200
    },
    {
      name: 'Admin Panel Health Check',
      url: `${baseUrl}:5174`,
      expectedStatus: 200
    },
    {
      name: 'API Products Endpoint',
      url: `${baseUrl}:4001/api/products`,
      expectedStatus: 200
    }
  ];
  
  console.log('🧪 Testing Staging Environment...\n');
  
  for (const test of tests) {
    try {
      const response = await fetch(test.url);
      const status = response.status;
      
      if (status === test.expectedStatus) {
        console.log(`✅ ${test.name}: ${status}`);
      } else {
        console.log(`❌ ${test.name}: Expected ${test.expectedStatus}, got ${status}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Staging environment test completed!');
};

testStagingEnvironment().catch(console.error);
EOF

chmod +x test-staging.js

# Create staging monitoring script
echo -e "${YELLOW}📊 Creating staging monitoring script...${NC}"

cat > monitor-staging.sh << 'EOF'
#!/bin/bash

# Staging Environment Monitoring Script
echo "📊 Staging Environment Status"
echo "=============================="

# Check Docker containers
echo "🐳 Docker Containers:"
docker-compose -f docker-compose.staging.yml ps

echo ""
echo "📈 Resource Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "🔍 Service Health:"
curl -s http://localhost:4001/api/health | jq '.' 2>/dev/null || echo "Backend health check failed"

echo ""
echo "📝 Recent Logs:"
docker-compose -f docker-compose.staging.yml logs --tail=10
EOF

chmod +x monitor-staging.sh

# Set up permissions
echo -e "${YELLOW}🔐 Setting up permissions...${NC}"
chown -R www-data:www-data /var/www/cheetah-ecom-staging
chmod -R 755 /var/www/cheetah-ecom-staging

# Create staging database
echo -e "${YELLOW}🗄️ Setting up staging database...${NC}"
mkdir -p /var/www/cheetah-ecom-staging/data/mongo
mkdir -p /var/www/cheetah-ecom-staging/data/redis

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐳 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl start docker
    systemctl enable docker
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}✅ Staging environment setup completed!${NC}"

echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "1. Update environment variables in .env.staging"
echo -e "2. Configure DNS for staging.shithaa.in"
echo -e "3. Run: cd /var/www/cheetah-ecom-staging && ./deploy-staging.sh"
echo -e "4. Test: ./test-staging.js"
echo -e "5. Monitor: ./monitor-staging.sh"
echo -e ""
echo -e "${GREEN}🎉 Staging environment is ready!${NC}"
