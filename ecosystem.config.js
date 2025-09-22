module.exports = {
  apps: [
    {
      name: 'shithaa-frontend',
      script: 'npm',
      args: 'run start',
      cwd: './frontend',
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
      name: 'shithaa-backend',
      script: 'backend/server.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: '/var/www/shithaa-ecom/backend/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './backend/logs/backend-err.log',
      out_file: './backend/logs/backend-out.log',
      log_file: './backend/logs/backend-combined.log',
      time: true
    },
    {
      name: 'shithaa-admin',
      script: 'npm',
      args: 'run preview',
      cwd: './admin',
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
      script: 'workers/stockCleanupWorker.js',
      cwd: '/var/www/shithaa-ecom/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        JWT_SECRET: 'shithaa-ecom-secret-key-for-jwt-2025'
      },
      error_file: './logs/stock-cleanup-worker-err.log',
      out_file: './logs/stock-cleanup-worker-out.log',
      log_file: './logs/stock-cleanup-worker-combined.log',
      time: true,
      min_uptime: '10s',
      max_restarts: 5
    }
    ,
    {
      name: 'shithaa-stock-monitoring-worker',
      script: 'workers/monitoringWorker.js',
      cwd: '/var/www/shithaa-ecom/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        JWT_SECRET: 'shithaa-ecom-secret-key-for-jwt-2025',
        MONITORING_WEBHOOK_URL: process.env.MONITORING_WEBHOOK_URL,
        NOTIFICATION_WEBHOOK_URL: process.env.NOTIFICATION_WEBHOOK_URL
      },
      error_file: './logs/stock-monitoring-worker-err.log',
      out_file: './logs/stock-monitoring-worker-out.log',
      log_file: './logs/stock-monitoring-worker-combined.log',
      time: true,
      min_uptime: '10s',
      max_restarts: 5
    }
  ]
} 