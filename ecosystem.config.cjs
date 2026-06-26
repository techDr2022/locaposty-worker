/**
 * PM2 config — same on local and EC2.
 * All secrets and service URLs live in .env (DOTENV_CONFIG_PATH).
 *
 *   npm run pm2:start    # first start
 *   npm run pm2:restart  # after code/env changes
 *   npm run pm2:logs
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
      max_memory_restart: "1G",
      env: {
        DOTENV_CONFIG_PATH: ".env",
        NODE_OPTIONS: "--dns-result-order=ipv4first",
      },
      error_file: "logs/worker-error.log",
      out_file: "logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
