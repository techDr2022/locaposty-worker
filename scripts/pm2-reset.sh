#!/bin/bash
# Kill PM2 daemon (fixes ghost/corrupt process list)
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -x "./node_modules/.bin/pm2" ]; then
  ./node_modules/.bin/pm2 kill || true
elif command -v pm2 >/dev/null 2>&1; then
  pm2 kill || true
fi

echo "[pm2-reset] PM2 daemon stopped"
