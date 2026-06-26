#!/bin/bash
# Start locaposty-worker via PM2 (local + EC2)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p logs

if [ ! -f .env ]; then
  echo "[pm2-up] ERROR: .env not found in $ROOT"
  echo "Copy .env.example to .env and fill in production values."
  exit 1
fi

if [ -x "./node_modules/.bin/pm2" ]; then
  PM2="./node_modules/.bin/pm2"
elif command -v pm2 >/dev/null 2>&1; then
  PM2="pm2"
else
  echo "[pm2-up] ERROR: pm2 not found. Run: npm ci"
  exit 1
fi

echo "[pm2-up] Using: $PM2 ($( $PM2 -v ))"
echo "[pm2-up] Node: $(node -v)"

$PM2 delete locaposty-worker 2>/dev/null || true
$PM2 start ecosystem.config.cjs --only locaposty-worker

echo ""
$PM2 status locaposty-worker
