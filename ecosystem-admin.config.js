module.exports = {
  apps: [
    {
      name: 'admin-panel',
      cwd: '/var/www/shithaa-ecom/admin',
      script: 'npm',
      args: 'run dev',
      env: {
        NODE_ENV: 'production',
        PORT: 5174,
        HOST: '0.0.0.0'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/admin-error.log',
      out_file: '/var/log/pm2/admin-out.log',
      log_file: '/var/log/pm2/admin-combined.log',
      time: true
    }
  ]
};
