module.exports = {
  apps: [
    {
      name: 'shithaa-frontend',
      script: 'npm',
      args: 'start',
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
      time: true,
      // Add better error handling and startup options
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },
    // Alternative frontend configuration using start script
    // Uncomment the section below if the npm start approach fails
    /*
    {
      name: 'shithaa-frontend-alt',
      script: './frontend/start.sh',
      cwd: '.',
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
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },
    */
    {
      name: 'shithaa-backend',
      script: 'backend/server.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
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
      script: 'admin/server.js',
      cwd: '/var/www/shithaa-ecom',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './admin/logs/admin-err.log',
      out_file: './admin/logs/admin-out.log',
      log_file: './admin/logs/admin-combined.log',
      time: true
    }
  ]
} 