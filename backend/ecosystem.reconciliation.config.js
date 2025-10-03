/**
 * PM2 Ecosystem Configuration for Reconciliation Job
 * 
 * This runs the draft reconciliation job as a separate PM2 process
 * to ensure it runs independently of the main application.
 */

module.exports = {
  apps: [
    {
      name: 'shithaa-reconciliation',
      script: './jobs/reconcileDrafts.js',
      cwd: '/var/www/shithaa-ecom/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        MONGODB_URI: process.env.MONGODB_URI,
        PHONEPE_MERCHANT_ID: process.env.PHONEPE_MERCHANT_ID,
        PHONEPE_SALT_KEY: process.env.PHONEPE_SALT_KEY,
        PHONEPE_SALT_INDEX: process.env.PHONEPE_SALT_INDEX || '1'
      },
      log_file: './logs/reconciliation.log',
      out_file: './logs/reconciliation-out.log',
      error_file: './logs/reconciliation-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
