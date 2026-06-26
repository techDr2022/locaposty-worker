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
bash scripts/pm2-restart.sh

echo ""
echo "Health check:"
curl -sf http://localhost:3002/health || echo "WARN: /health not reachable yet — check: npm run pm2:logs"
