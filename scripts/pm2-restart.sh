#!/bin/bash
# Restart locaposty-worker (local + EC2)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -x "./node_modules/.bin/pm2" ]; then
  PM2="./node_modules/.bin/pm2"
elif command -v pm2 >/dev/null 2>&1; then
  PM2="pm2"
else
  echo "[pm2-restart] ERROR: pm2 not found. Run: npm ci"
  exit 1
fi

if $PM2 describe locaposty-worker >/dev/null 2>&1; then
  $PM2 restart locaposty-worker --update-env
else
  bash scripts/pm2-up.sh
fi

$PM2 status locaposty-worker
