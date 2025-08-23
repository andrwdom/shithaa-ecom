module.exports = {
  apps: [{
    name: 'shithaa-backend',
    script: 'server.js',
    cwd: __dirname, // Ensures the app starts in the correct directory
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    // Auto-restart on crashes
    autorestart: true,
    // Watch for file changes (disable in production)
    watch: false,
    // Ignore specific files
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    // Environment variables
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    }
  }]
}
