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
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      error_file: "logs/worker-error.log",
      out_file: "logs/worker-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
