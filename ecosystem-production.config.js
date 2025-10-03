module.exports = {
  apps: [
    {
      name: 'shithaa-backend',
      script: 'backend/server.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '/var/www/shithaa-ecom/backend/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './backend/logs/backend-error.log',
      out_file: './backend/logs/backend-out.log',
      log_file: './backend/logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_interval: 30000
    },
    {
      name: 'shithaa-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/shithaa-ecom/frontend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './frontend/logs/frontend-error.log',
      out_file: './frontend/logs/frontend-out.log',
      log_file: './frontend/logs/frontend-combined.log',
      time: true,
      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },
    {
      name: 'shithaa-admin',
      script: 'npm',
      args: 'run preview',
      cwd: '/var/www/shithaa-ecom/admin',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4173
      },
      error_file: './admin/logs/admin-error.log',
      out_file: './admin/logs/admin-out.log',
      log_file: './admin/logs/admin-combined.log',
      time: true,
      // Process management
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },
    {
      name: 'shithaa-stock-monitoring-worker',
      script: 'backend/workers/stockMonitoringWorker.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_file: '/var/www/shithaa-ecom/backend/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './backend/logs/stock-monitoring-worker-error.log',
      out_file: './backend/logs/stock-monitoring-worker-out.log',
      log_file: './backend/logs/stock-monitoring-worker-combined.log',
      time: true,
      // Process management
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 10000
    },
    {
      name: 'shithaa-stock-cleanup-worker',
      script: 'backend/workers/stockCleanupWorker.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_file: '/var/www/shithaa-ecom/backend/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './backend/logs/stock-cleanup-worker-error.log',
      out_file: './backend/logs/stock-cleanup-worker-out.log',
      log_file: './backend/logs/stock-cleanup-worker-combined.log',
      time: true,
      // Process management
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 10000
    },
    {
      name: 'shithaa-reservation-expiry-worker',
      script: 'backend/workers/reservationExpiryWorker.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_file: '/var/www/shithaa-ecom/backend/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './backend/logs/reservation-expiry-worker-error.log',
      out_file: './backend/logs/reservation-expiry-worker-out.log',
      log_file: './backend/logs/reservation-expiry-worker-combined.log',
      time: true,
      // Process management - CRITICAL: Prevent SIGINT loop
      min_uptime: '30s',
      max_restarts: 3,
      restart_delay: 30000,
      // Health monitoring
      health_check_grace_period: 10000,
      health_check_interval: 60000
    },
    {
      name: 'shithaa-webhook-processor',
      script: 'backend/jobs/webhookProcessorWorker.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_file: '/var/www/shithaa-ecom/backend/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './backend/logs/webhook-processor-error.log',
      out_file: './backend/logs/webhook-processor-out.log',
      log_file: './backend/logs/webhook-processor-combined.log',
      time: true,
      // Process management
      min_uptime: '30s',
      max_restarts: 10,
      restart_delay: 10000,
      // No cron restart - this is a persistent worker
      kill_timeout: 5000
    },
    {
      name: 'shithaa-reconciliation-worker',
      script: 'backend/scripts/reconcileMissingOrders.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_file: '/var/www/shithaa-ecom/backend/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './backend/logs/reconciliation-worker-error.log',
      out_file: './backend/logs/reconciliation-worker-out.log',
      log_file: './backend/logs/reconciliation-worker-combined.log',
      time: true,
      // Process management
      min_uptime: '10s',
      max_restarts: 3,
      restart_delay: 30000,
      // Run every 30 minutes
      cron_restart: '*/30 * * * *'
    }
  ],
  
  // PM2 Configuration
  deploy: {
    production: {
      user: 'root',
      host: '145.223.19.218',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/shithaa-ecom.git',
      path: '/var/www/shithaa-ecom',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem-production.config.js --env production',
      'pre-setup': ''
    }
  }
};
