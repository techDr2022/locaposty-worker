/**
 * PM2 ecosystem config for LocaPosty Worker (standalone)
 * Run: pm2 start ecosystem.config.cjs
 *
 * With custom env file:
 *   DOTENV_CONFIG_PATH=.env pm2 start ecosystem.config.cjs
 */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "locaposty-worker",
      script: "worker.ts",
      interpreter: "node",
      interpreter_args: "-r ts-node/register",
      cwd: path.join(__dirname),
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        DOTENV_CONFIG_PATH: ".env",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
        DB_READY_RETRIES: "30",
        DB_READY_RETRY_DELAY_MS: "3000",
      },
      error_file: "logs/worker-error.log",
      out_file: "logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
