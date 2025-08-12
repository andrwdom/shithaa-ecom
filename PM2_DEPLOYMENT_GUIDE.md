# 🚀 PM2 Deployment Guide for Shithaa E-commerce

## 📋 Prerequisites

- Node.js 18+ installed on VPS
- PM2 globally installed: `npm install -g pm2`
- MongoDB running on VPS
- Proper environment variables configured

## 🔧 Quick Setup

### 1. **Clone and Setup**
```bash
cd /var/www/
git clone <your-repo> shithaa-ecom
cd shithaa-ecom

# Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd admin && npm install && cd ..
```

### 2. **Environment Configuration**
Create `.env` files in each directory:

#### Frontend (`.env.production`)
```bash
cd frontend
nano .env.production
```
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NODE_ENV=production
```

#### Backend (`.env`)
```bash
cd backend
nano .env
```
```env
MONGODB_URI=mongodb://localhost:27017/shitha
JWT_SECRET=your_secure_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
NODE_ENV=production
PORT=4000
```

#### Admin (`.env`)
```bash
cd admin
nano .env
```
```env
VITE_API_URL=https://yourdomain.com/api
NODE_ENV=production
```

### 3. **Build Projects**
```bash
# Build frontend
cd frontend
npm run build
cd ..

# Build admin
cd admin
npm run build
cd ..
```

## 🚀 PM2 Deployment

### **Option 1: Using Ecosystem Config (Recommended)**
```bash
# Start all services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs
```

### **Option 2: Using Deployment Script**
```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh

# Or use specific commands
./deploy.sh deploy      # Build and deploy all
./deploy.sh start       # Start services only
./deploy.sh restart     # Restart services
```

### **Option 3: Using Quick Start Script**
```bash
# Make script executable
chmod +x start-pm2.sh

# Run quick start
./start-pm2.sh
```

## 📊 PM2 Management Commands

### **Basic Commands**
```bash
# View all processes
pm2 list
pm2 status

# View logs
pm2 logs                    # All services
pm2 logs shithaa-frontend   # Frontend only
pm2 logs shitha-backend     # Backend only
pm2 logs shitha-admin       # Admin only

# Monitor resources
pm2 monit

# Restart services
pm2 restart all             # All services
pm2 restart shithaa-frontend # Frontend only
pm2 restart shitha-backend   # Backend only
pm2 restart shitha-admin     # Admin only

# Stop services
pm2 stop all
pm2 stop shithaa-frontend

# Delete services
pm2 delete all
pm2 delete shithaa-frontend
```

### **Service-Specific Commands**
```bash
# Frontend
pm2 start npm --name "shithaa-frontend" -- start
pm2 env shithaa-frontend
pm2 restart shithaa-frontend

# Backend
pm2 start server.js --name "shitha-backend" --cwd ./backend
pm2 env shitha-backend
pm2 restart shitha-backend

# Admin
pm2 start npm --name "shitha-admin" -- run preview --cwd ./admin
pm2 env shitha-admin
pm2 restart shitha-admin
```

## 🔍 Troubleshooting

### **Common Issues**

#### 1. **Port Already in Use**
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :4000
lsof -i :4173

# Kill processes if needed
kill -9 <PID>
```

#### 2. **Permission Issues**
```bash
# Fix ownership
chown -R www-data:www-data /var/www/shithaa-ecom
chmod -R 755 /var/www/shithaa-ecom

# Fix logs directory
chmod 755 logs/
```

#### 3. **Build Failures**
```bash
# Clear Next.js cache
cd frontend
rm -rf .next/
rm -rf node_modules/.cache/
npm install
npm run build

# Clear admin build
cd ../admin
rm -rf dist/
npm install
npm run build
```

#### 4. **PM2 Process Issues**
```bash
# Reset PM2
pm2 kill
pm2 start ecosystem.config.js

# Clear PM2 logs
pm2 flush
```

### **Log Analysis**
```bash
# View error logs
pm2 logs shithaa-frontend --err --lines 100
pm2 logs shitha-backend --err --lines 100

# View specific log files
tail -f logs/frontend-err.log
tail -f logs/backend-err.log
```

## 📈 Monitoring & Maintenance

### **Health Checks**
```bash
# Check service health
./deploy.sh health

# Monitor in real-time
pm2 monit

# Check system resources
htop
df -h
free -h
```

### **Automatic Restart**
```bash
# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup

# Follow the instructions to enable auto-start
```

### **Log Rotation**
```bash
# Install PM2 log rotate
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## 🌐 Nginx Configuration

### **Basic Nginx Setup**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Admin panel (optional)
    location /admin {
        proxy_pass http://localhost:4173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

## 🔒 Security Considerations

### **Firewall Setup**
```bash
# Allow necessary ports
ufw allow 80
ufw allow 443
ufw allow 22
ufw enable
```

### **SSL/HTTPS Setup**
```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com
```

## 📝 Deployment Checklist

- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Projects built successfully
- [ ] PM2 processes started
- [ ] Services responding on correct ports
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Log rotation configured

## 🆘 Emergency Commands

```bash
# Emergency stop all
pm2 stop all

# Emergency restart
pm2 restart all

# View all logs for debugging
pm2 logs --lines 200

# Check system resources
top
df -h
free -h
netstat -tlnp
```

## 📞 Support

For deployment issues:
1. Check PM2 logs: `pm2 logs`
2. Check system resources: `htop`, `df -h`
3. Verify environment variables
4. Check port availability: `netstat -tlnp`
5. Review this guide for common solutions

---

**Happy Deploying! 🚀** 