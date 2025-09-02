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
      script: 'server.js',
      cwd: '/var/www/shithaa-ecom/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './logs/backend-err.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
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
      name: 'shithaa-reservation-worker',
      script: 'workers/reservationExpiryWorker.js',
      cwd: '/var/www/shithaa-ecom/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      cron_restart: '*/5 * * * *', // Restart every 5 minutes to run the worker
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/reservation-worker-err.log',
      out_file: './logs/reservation-worker-out.log',
      log_file: './logs/reservation-worker-combined.log',
      time: true
    }
  ]
} 