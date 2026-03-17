# LocaPosty Worker - AWS EC2 Deployment

BullMQ worker that processes scheduled GMB (Google My Business) posts from Redis. Deploy on AWS EC2.

## Prerequisites

- **PostgreSQL** – RDS or existing Postgres instance (shared with main LocaPosty app)
- **Redis** – ElastiCache or self-hosted Redis (for BullMQ queues)

## EC2 Setup

### 1. Launch EC2 Instance

- **AMI:** Ubuntu 22.04 LTS
- **Instance type:** t3.micro or t3.small
- **Security group:** Allow inbound SSH (22), optionally port 3001 for health checks

### 2. Initial EC2 Setup (run on the instance)

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@<ec2-ip>

# Clone or copy project
git clone <your-repo-url> locaposty_worker
cd locaposty_worker

# Run setup script
chmod +x scripts/setup-ec2.sh
bash scripts/setup-ec2.sh
```

This installs:
- Node.js 20
- PM2

### 3. Environment Variables

```bash
cp .env.example .env
nano .env  # or vim
```

Set these in `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `REDIS_HOST` | Yes | ElastiCache endpoint or Redis host |
| `REDIS_PORT` | Yes | Usually `6379` |
| `REDIS_PASSWORD` | No | If Redis has auth |
| `GOOGLE_CLIENT_ID_GMB` | Yes | GMB OAuth client ID |
| `GOOGLE_CLIENT_SECRET_GMB` | Yes | GMB OAuth client secret |
| `NEXTAUTH_URL` | Yes | Main app URL (e.g. `https://locaposty.com`) |
| `PORT` | No | Health check port (default `3001`) |

### 4. Install & Start

```bash
npm install
npm run pm2:start
```

### 5. Persist Across Reboot

```bash
pm2 save
pm2 startup
# Run the command it outputs (typically a sudo command)
```

## Deploy Updates

On the EC2 instance:

```bash
cd locaposty_worker
bash scripts/deploy.sh
```

Or manually:

```bash
git pull origin main
npm ci --omit=dev
npx prisma generate
pm2 restart locaposty-worker
```

## Health Check

Worker exposes `/ping` on port 3001:

```bash
curl http://localhost:3001/ping
# pong
```

## AWS Checklist

- [ ] **EC2 Security Group**
  - Allow SSH (22) from your IP
  - Allow 3001 if you need external health checks (optional)

- [ ] **RDS/PostgreSQL**
  - Add EC2 security group to RDS ingress
  - Use `DATABASE_URL` with SSL (`?sslmode=require`)

- [ ] **ElastiCache Redis**
  - Create Redis cluster
  - Add EC2 security group to ElastiCache
  - Use cluster endpoint as `REDIS_HOST`

## PM2 Commands

| Command | Description |
|---------|-------------|
| `pm2 status` | Show process status |
| `pm2 logs locaposty-worker` | View logs |
| `pm2 restart locaposty-worker` | Restart |
| `pm2 stop locaposty-worker` | Stop |
| `pm2 delete locaposty-worker` | Remove from PM2 |
