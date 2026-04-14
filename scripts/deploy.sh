#!/bin/bash
# Deploy worker updates on EC2 (run from project root on EC2)
# Usage: bash scripts/deploy.sh

set -e

echo "=== Deploying LocaPosty Worker ==="

cd "$(dirname "$0")/.."

if [ -d .git ]; then
  echo "Pulling latest code..."
  git pull origin main
fi

echo "Installing dependencies..."
npm ci

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Generating Prisma client..."
npx prisma generate

echo "Restarting worker..."
if pm2 describe locaposty-worker >/dev/null 2>&1; then
  pm2 restart locaposty-worker
else
  pm2 start ecosystem.config.cjs --only locaposty-worker
fi

echo ""
echo "Done. Status:"
pm2 status
