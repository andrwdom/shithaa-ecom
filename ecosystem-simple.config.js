module.exports = {
  apps: [
    {
      name: 'shithaa-backend',
      script: './backend/server.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './backend/logs/backend-error.log',
      out_file: './backend/logs/backend-out.log',
      log_file: './backend/logs/backend-combined.log',
      time: true,
      merge_logs: true
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
      error_file: './admin/logs/admin-error.log',
      out_file: './admin/logs/admin-out.log',
      log_file: './admin/logs/admin-combined.log',
      time: true
    },
    {
      name: 'shithaa-reservation-expiry-worker',
      script: './backend/workers/reservationExpiryWorker.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './backend/logs/reservation-expiry-worker-error.log',
      out_file: './backend/logs/reservation-expiry-worker-out.log',
      log_file: './backend/logs/reservation-expiry-worker-combined.log',
      time: true
    }
  ]
};
