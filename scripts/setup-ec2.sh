#!/bin/bash
# LocaPosty Worker - EC2 initial setup
# Run on fresh Ubuntu/Debian EC2: bash scripts/setup-ec2.sh

set -e

echo "=== LocaPosty Worker EC2 Setup ==="

# System updates
echo "Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js 20
if ! command -v node &>/dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node $(node -v) | npm $(npm -v)"

# Install PM2
if ! command -v pm2 &>/dev/null; then
  echo "Installing PM2..."
  sudo npm install -g pm2
fi
echo "PM2 $(pm2 -v)"

# Create logs dir
mkdir -p logs

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Create .env from .env.example and fill in:"
echo "   - DATABASE_URL (PostgreSQL)"
echo "   - REDIS_HOST, REDIS_PORT, REDIS_PASSWORD"
echo "   - GOOGLE_CLIENT_ID_GMB, GOOGLE_CLIENT_SECRET_GMB"
echo "   - NEXTAUTH_URL"
echo ""
echo "2. Install deps & generate Prisma:"
echo "   npm install"
echo ""
echo "3. Start worker:"
echo "   npm run pm2:start"
echo ""
echo "4. Persist across reboot:"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
