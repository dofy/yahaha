module.exports = {
  apps: [
    {
      name: 'yahaha',
      script: 'yarn start',
      instances: 1,
      autorestart: true,
      max_memory_restart: '1G',
      ignore_watch: ['.next', 'public'],
      env: {
        PORT: 8000,
        watch: true,
        NODE_ENV: 'development',
      },
      env_production: {
        PORT: 8000,
        watch: false,
        NODE_ENV: 'production',
      },
    },
  ],
}; 