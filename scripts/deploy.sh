#!/bin/bash
# Deploy worker updates on EC2 (run from project root on EC2)
# Usage: bash scripts/deploy.sh

set -e

echo "=== Deploying LocaPosty Worker ==="

cd "$(dirname "$0")/.."

if [ -d .git ]; then
  git pull origin main
fi

npm ci
npx prisma generate

echo "Restarting worker..."
pm2 restart locaposty-worker

echo ""
echo "Done. Status:"
pm2 status
