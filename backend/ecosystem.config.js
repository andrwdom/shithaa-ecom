export default {
  apps: [
    {
      name: 'shithaa-backend',
      script: './server.js',
      // CRITICAL FIX: Change from 'cluster' to 'fork' mode
      // This ensures a single, stable process and reliable environment variable loading.
      exec_mode: 'fork',
      instances: 1,
      // autorestart: true, // Keep this commented out until stable
      watch: false,
      max_memory_restart: '250M', // Increased memory limit
      env: {
        NODE_ENV: 'production',
      },
      // Log file configuration
      log_date_format: 'YYYY-MM-DDTHH:mm:ss',
      error_file: '/var/www/shithaa-ecom/backend/logs/err.log',
      out_file: '/var/www/shithaa-ecom/backend/logs/out.log',
      merge_logs: true,
    },
  ],
};
