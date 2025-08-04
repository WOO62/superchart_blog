module.exports = {
  apps: [
    {
      name: 'review-monitor-local',
      script: './local_monitor.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/review-monitor-error.log',
      out_file: './logs/review-monitor-out.log',
      log_file: './logs/review-monitor-combined.log',
      time: true,
      merge_logs: true,
      // 컴퓨터 재시작 시 자동 시작하지 않음 (수동 시작)
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
};