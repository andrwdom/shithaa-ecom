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
        PORT: 4000,
        LOG_LEVEL: 'info',
        LOG_DIR: '/var/log/shithaa',
        SERVICE_NAME: 'payment-service'
      },
      error_file: './backend/logs/backend-err.log',
      out_file: './backend/logs/backend-out.log',
      log_file: './backend/logs/backend-combined.log',
      time: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
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
      error_file: './frontend/logs/frontend-err.log',
      out_file: './frontend/logs/frontend-out.log',
      log_file: './frontend/logs/frontend-combined.log',
      time: true
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
      error_file: './admin/logs/admin-err.log',
      out_file: './admin/logs/admin-out.log',
      log_file: './admin/logs/admin-combined.log',
      time: true
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
      error_file: './backend/logs/stock-cleanup-worker-err.log',
      out_file: './backend/logs/stock-cleanup-worker-out.log',
      log_file: './backend/logs/stock-cleanup-worker-combined.log',
      time: true
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
      error_file: './backend/logs/reservation-expiry-worker-err.log',
      out_file: './backend/logs/reservation-expiry-worker-out.log',
      log_file: './backend/logs/reservation-expiry-worker-combined.log',
      time: true
    }
    // REMOVED: shithaa-reconcile-payments to avoid conflict with existing shithaa-reconciliation-worker
  ]
};