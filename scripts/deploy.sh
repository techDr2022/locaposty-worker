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
if npx pm2 describe locaposty-worker >/dev/null 2>&1; then
  npm run pm2:restart
else
  npm run pm2:start
fi

echo ""
echo "Done. Status:"
npm run pm2:status
