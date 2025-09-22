#!/bin/bash

# ========================================
# SHITHAA E-COMMERCE VPS SETUP SCRIPT
# ========================================
# This script completely sets up the Shithaa e-commerce backend on VPS
# Run as root: sudo bash vps-setup.sh

set -e  # Exit on any error

echo "🚀 Starting Shithaa E-commerce VPS Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root: sudo bash vps-setup.sh"
    exit 1
fi

print_header "STEP 1: STOP ALL EXISTING PROCESSES"

# Stop all PM2 processes
print_status "Stopping all PM2 processes..."
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Kill any remaining Node.js processes
print_status "Killing remaining Node.js processes..."
pkill -f node 2>/dev/null || true

print_header "STEP 2: UPDATE SYSTEM PACKAGES"

# Update system packages
print_status "Updating system packages..."
apt update -y
apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw fail2ban htop

print_header "STEP 3: INSTALL NODE.JS 20"

# Install Node.js 20
print_status "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js installation
print_status "Node.js version: $(node --version)"
print_status "NPM version: $(npm --version)"

print_header "STEP 4: INSTALL PM2 GLOBALLY"

# Install PM2 globally
print_status "Installing PM2..."
npm install -g pm2

# Setup PM2 startup
print_status "Setting up PM2 startup..."
pm2 startup systemd -u root --hp /root
pm2 save

print_header "STEP 5: SETUP PROJECT DIRECTORY"

# Create project directory
print_status "Setting up project directory..."
mkdir -p /var/www/shithaa-ecom
cd /var/www/shithaa-ecom

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p backend/logs
mkdir -p frontend/logs
mkdir -p admin/logs
mkdir -p uploads
mkdir -p scripts

print_header "STEP 6: CONFIGURE FIREWALL"

# Configure UFW firewall
print_status "Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000
ufw allow 4000
ufw allow 4173
ufw --force enable

print_header "STEP 7: CONFIGURE NGINX"

# Create Nginx configuration
print_status "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/shithaa-ecom << 'EOF'
server {
    listen 80;
    server_name shithaa.in www.shithaa.in admin.shithaa.in;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin Panel
    location /admin {
        proxy_pass http://localhost:4173;
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
    location /uploads/ {
        alias /var/www/shithaa-ecom/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
EOF

# Enable the site
print_status "Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/shithaa-ecom /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
nginx -t

# Restart Nginx
print_status "Restarting Nginx..."
systemctl restart nginx
systemctl enable nginx

print_header "STEP 8: INSTALL MONGODB"

# Install MongoDB
print_status "Installing MongoDB..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org

# Start and enable MongoDB
print_status "Starting MongoDB..."
systemctl start mongod
systemctl enable mongod

# Create MongoDB user
print_status "Creating MongoDB user..."
mongosh --eval "
use admin;
db.createUser({
  user: 'shithaa',
  pwd: 'shithaamongopassword255506511ypyq2jvcl',
  roles: [
    { role: 'readWrite', db: 'shitha_maternity_db' },
    { role: 'dbAdmin', db: 'shitha_maternity_db' }
  ]
});
"

print_header "STEP 9: CREATE ENVIRONMENT FILE"

# Create .env file
print_status "Creating environment file..."
cat > /var/www/shithaa-ecom/backend/.env << 'EOF'
MONGODB_URI=mongodb://shithaa:shithaamongopassword255506511ypyq2jvcl@localhost:27017/shitha_maternity_db?authSource=shitha_maternity_db

# API URL (used by frontend, not backend, but kept for reference)
BASE_URL=https://shithaa.in

# Server
PORT=4000

# JWT
JWT_SECRET=aVeryStrongAndSimpleSecretKeyForShithaaEcom2024NoSpecialChars

# Admin credentials
ADMIN_EMAIL=info.shithaa@gmail.com
ADMIN_PASSWORD=shithaaweb@14525!

# PhonePe Configuration
PHONEPE_ENV=PRODUCTION
PHONEPE_MERCHANT_ID=SU2507101644104455172815
PHONEPE_API_KEY=5cb0064a-f4dd-411a-a80c-e8f67479725c
PHONEPE_SALT_INDEX=1
PHONEPE_REDIRECT_URL=https://shithaa.in

# Firebase Admin SDK (REQUIRED for backend to verify Firebase tokens)
GOOGLE_APPLICATION_CREDENTIALS=/var/www/shithaa-ecom/backend/shithaa-ecom-firebase-adminsdk-fbsvc-e8a1fde3d9.json

# Email Configuration
EMAIL_USER=info.shithaa@gmail.com
EMAIL_PASS=fpowkrouhmzbmpfp
FRONTEND_URL=https://shithaa.in

# PhonePe Webhook Authentication
PHONEPE_CALLBACK_USERNAME=shithaa_webhook
PHONEPE_CALLBACK_PASSWORD=webhook_secure_2024

# Reservation System
RESERVATION_ENABLED=true
RESERVATION_EXPIRY_MINUTES=15
RESERVATION_AUTO_EXPIRY=true
EOF

print_header "STEP 10: SETUP LOG ROTATION"

# Setup log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/shithaa-ecom << 'EOF'
/var/www/shithaa-ecom/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

print_header "STEP 11: CREATE MONITORING SCRIPT"

# Create monitoring script
print_status "Creating monitoring script..."
cat > /var/www/shithaa-ecom/scripts/monitor.sh << 'EOF'
#!/bin/bash

# Shithaa E-commerce Monitoring Script
LOG_FILE="/var/www/shithaa-ecom/backend/logs/monitor.log"

echo "$(date): Starting health check..." >> $LOG_FILE

# Check if PM2 is running
if ! pgrep -f "PM2" > /dev/null; then
    echo "$(date): PM2 not running, starting..." >> $LOG_FILE
    cd /var/www/shithaa-ecom
    pm2 start ecosystem.config.js
fi

# Check backend health
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health)
if [ "$BACKEND_STATUS" != "200" ]; then
    echo "$(date): Backend unhealthy (HTTP $BACKEND_STATUS), restarting..." >> $LOG_FILE
    pm2 restart shithaa-backend
fi

# Check frontend health
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "$(date): Frontend unhealthy (HTTP $FRONTEND_STATUS), restarting..." >> $LOG_FILE
    pm2 restart shithaa-frontend
fi

echo "$(date): Health check completed" >> $LOG_FILE
EOF

chmod +x /var/www/shithaa-ecom/scripts/monitor.sh

# Add to crontab
print_status "Adding monitoring to crontab..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /var/www/shithaa-ecom/scripts/monitor.sh") | crontab -

print_header "STEP 12: SETUP SSL CERTIFICATE"

# Setup SSL with Let's Encrypt
print_status "Setting up SSL certificate..."
print_warning "Make sure your domain is pointing to this server before running SSL setup!"
print_warning "Run this command after DNS propagation:"
echo "certbot --nginx -d shithaa.in -d www.shithaa.in -d admin.shithaa.in"

print_header "STEP 13: FINAL PERMISSIONS"

# Set proper permissions
print_status "Setting proper permissions..."
chown -R www-data:www-data /var/www/shithaa-ecom
chmod -R 755 /var/www/shithaa-ecom
chmod 600 /var/www/shithaa-ecom/backend/.env

print_header "SETUP COMPLETE! 🎉"

print_status "VPS setup completed successfully!"
print_status "Next steps:"
echo "1. Upload your code to /var/www/shithaa-ecom/"
echo "2. Install dependencies: cd /var/www/shithaa-ecom/backend && npm install"
echo "3. Install frontend dependencies: cd /var/www/shithaa-ecom/frontend && npm install"
echo "4. Install admin dependencies: cd /var/www/shithaa-ecom/admin && npm install"
echo "5. Start the application: cd /var/www/shithaa-ecom && pm2 start ecosystem.config.js"
echo "6. Setup SSL: certbot --nginx -d shithaa.in -d www.shithaa.in -d admin.shithaa.in"
echo "7. Check status: pm2 status"
echo "8. View logs: pm2 logs"

print_status "Environment file created at: /var/www/shithaa-ecom/backend/.env"
print_status "Please review and update the environment variables as needed."

print_header "QUICK START COMMANDS"

echo "cd /var/www/shithaa-ecom"
echo "pm2 start ecosystem.config.js"
echo "pm2 status"
echo "pm2 logs"

print_status "Setup script completed! 🚀"
