# Plan 4: Production — Nginx, SSL, Docker, Monitoring

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Prerequisite:** Plans 1–3 must be complete and tested locally.

**Goal:** Deploy Publix to a production server at publix.dk with Nginx as reverse proxy, Let's Encrypt SSL, production Docker Compose, Sentry error monitoring, and structured log output.

**Architecture:** Docker Compose runs three services: `neo4j`, `app` (Next.js). Nginx runs on the host (not in Docker) as a reverse proxy handling SSL termination and forwarding to the app container on port 3000. Let's Encrypt via Certbot manages certificates. Sentry captures unhandled errors.

**Target environment:** A Linux VPS (Ubuntu 22.04 recommended) with Docker and Docker Compose installed.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `nginx/nginx.conf` | Nginx reverse proxy config with SSL |
| Create | `docker-compose.prod.yml` | Production Docker Compose (app + neo4j) |
| Modify | `frontend/Dockerfile` | Optimised multi-stage Next.js build |
| Create | `frontend/lib/sentry.ts` | Sentry initialisation |
| Modify | `frontend/pages/_app.tsx` | Wrap with Sentry error boundary |
| Create | `scripts/deploy.sh` | One-command deploy script |
| Create | `scripts/ssl-setup.sh` | Certbot SSL setup script |
| Modify | `frontend/pages/api/health.ts` | Return structured JSON for uptime monitors |

---

## Task 1: Production Dockerfile

**Files:**
- Modify: `frontend/Dockerfile`

- [ ] **Step 1: Replace frontend/Dockerfile with multi-stage build**

```dockerfile
# frontend/Dockerfile

# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Run
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

- [ ] **Step 2: Enable standalone output in next.config.js**

Create `frontend/next.config.js` if it doesn't exist, or add:

```javascript
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
}

module.exports = nextConfig
```

- [ ] **Step 3: Verify build works**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm run build
```

Expected: Successful build with `.next/standalone` directory created.

- [ ] **Step 4: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/Dockerfile frontend/next.config.js
git commit -m "feat: multi-stage Dockerfile with standalone Next.js output"
```

---

## Task 2: Production Docker Compose

**Files:**
- Create: `docker-compose.prod.yml`

- [ ] **Step 1: Create docker-compose.prod.yml**

```yaml
# docker-compose.prod.yml
services:
  neo4j:
    image: neo4j:5.26
    restart: unless-stopped
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
      - NEO4J_server_memory_heap_initial__size=512m
      - NEO4J_server_memory_heap_max__size=1G
    volumes:
      - neo4j_data:/data
      - ./frontend/scripts:/scripts
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "${NEO4J_PASSWORD}", "RETURN 1"]
      interval: 30s
      timeout: 10s
      retries: 5
    networks:
      - internal

  app:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - SALT=${SALT}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL}
      - HIBP_API_KEY=${HIBP_API_KEY}
      - DEHASHED_USERNAME=${DEHASHED_USERNAME}
      - DEHASHED_API_KEY=${DEHASHED_API_KEY}
      - INTELX_API_KEY=${INTELX_API_KEY}
      - INTELX_API_URL=${INTELX_API_URL}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - STRIPE_PAID_PRICE_ID=${STRIPE_PAID_PRICE_ID}
      - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      - SENTRY_DSN=${SENTRY_DSN}
      - LOG_LEVEL=info
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      neo4j:
        condition: service_healthy
    networks:
      - internal

volumes:
  neo4j_data:

networks:
  internal:
    driver: bridge
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add docker-compose.prod.yml
git commit -m "feat: production Docker Compose with health checks and network isolation"
```

---

## Task 3: Nginx Configuration

**Files:**
- Create: `nginx/nginx.conf`

- [ ] **Step 1: Create nginx/nginx.conf**

```nginx
# nginx/nginx.conf
# Install on host: sudo apt install nginx
# SSL managed by certbot: sudo certbot --nginx -d publix.dk -d www.publix.dk

upstream nextjs {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name publix.dk www.publix.dk;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://publix.dk$request_uri;
    }
}

# Redirect www to non-www
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.publix.dk;

    ssl_certificate /etc/letsencrypt/live/publix.dk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/publix.dk/privkey.pem;

    return 301 https://publix.dk$request_uri;
}

# Main server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name publix.dk;

    # SSL — managed by certbot
    ssl_certificate /etc/letsencrypt/live/publix.dk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/publix.dk/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Hide server info
    server_tokens off;

    # Rate limiting zones (defined in http block — add to /etc/nginx/nginx.conf http{} block)
    # limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;

    # Stripe webhook — larger body, no rate limit
    location /api/stripe/webhook {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 1m;
    }

    # API routes
    location /api/ {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10m;
    }

    # Static assets — long cache
    location /_next/static/ {
        proxy_pass http://nextjs;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # All other routes
    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add nginx/nginx.conf
git commit -m "feat: Nginx reverse proxy config with SSL headers and caching"
```

---

## Task 4: SSL Setup Script

**Files:**
- Create: `scripts/ssl-setup.sh`

- [ ] **Step 1: Create scripts/ssl-setup.sh**

```bash
#!/bin/bash
# scripts/ssl-setup.sh
# Run once on the production server to set up Let's Encrypt SSL
# Usage: sudo bash scripts/ssl-setup.sh

set -e

echo "=== Installing Certbot ==="
apt-get update
apt-get install -y certbot python3-certbot-nginx

echo "=== Obtaining SSL certificate for publix.dk ==="
certbot --nginx \
  -d publix.dk \
  -d www.publix.dk \
  --non-interactive \
  --agree-tos \
  --email admin@publix.dk \
  --redirect

echo "=== Setting up auto-renewal ==="
# Certbot auto-renewal is set up via systemd timer by default on Ubuntu
systemctl enable certbot.timer
systemctl start certbot.timer

echo "=== Testing renewal ==="
certbot renew --dry-run

echo "=== SSL setup complete ==="
```

```bash
chmod +x /home/cocodedk/0-projects/publix/scripts/ssl-setup.sh
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add scripts/ssl-setup.sh
git commit -m "feat: SSL setup script with Let's Encrypt and auto-renewal"
```

---

## Task 5: Deploy Script

**Files:**
- Create: `scripts/deploy.sh`

- [ ] **Step 1: Create scripts/deploy.sh**

```bash
#!/bin/bash
# scripts/deploy.sh
# Run on the production server to deploy/update the application
# Usage: bash scripts/deploy.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env file not found at $REPO_DIR/.env"
  echo "Copy .env.example to .env and fill in your values."
  exit 1
fi

echo "=== Pulling latest code ==="
cd "$REPO_DIR"
git pull origin main

echo "=== Building and starting containers ==="
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

echo "=== Waiting for app to be healthy ==="
sleep 10

STATUS=$(curl -sf http://localhost:3000/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','unknown'))" 2>/dev/null || echo "unreachable")
echo "Health status: $STATUS"

if [ "$STATUS" != "ok" ]; then
  echo "WARNING: App health check returned: $STATUS"
  echo "Check logs: docker compose -f docker-compose.prod.yml logs app"
else
  echo "=== Deploy complete. publix.dk is live. ==="
fi
```

```bash
chmod +x /home/cocodedk/0-projects/publix/scripts/deploy.sh
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add scripts/deploy.sh
git commit -m "feat: one-command deploy script"
```

---

## Task 6: Sentry Error Monitoring

**Files:**
- Create: `frontend/lib/sentry.ts`
- Modify: `frontend/pages/_app.tsx`

- [ ] **Step 1: Install Sentry**

```bash
cd /home/cocodedk/0-projects/publix/frontend
npm install @sentry/nextjs
```

- [ ] **Step 2: Create frontend/lib/sentry.ts**

```typescript
// frontend/lib/sentry.ts
import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Never send PII
    beforeSend(event) {
      if (event.request?.data) delete event.request.data
      if (event.user?.email) event.user.email = '[redacted]'
      return event
    },
  })
}
```

- [ ] **Step 3: Call initSentry in _app.tsx**

In `frontend/pages/_app.tsx`, add at the top before the component:

```typescript
import { initSentry } from '../lib/sentry'
initSentry()
```

- [ ] **Step 4: Add SENTRY_DSN to .env.example**

```
SENTRY_DSN=https://your_key@sentry.io/your_project_id
```

- [ ] **Step 5: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/lib/sentry.ts frontend/pages/_app.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add Sentry error monitoring with PII scrubbing"
```

---

## Task 7: Health Endpoint Improvements

**Files:**
- Modify: `frontend/pages/api/health.ts`

- [ ] **Step 1: Update frontend/pages/api/health.ts**

Replace with:

```typescript
// frontend/pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { neo4jClient } from '../../lib/neo4jClient'

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error'
  version: string
  checks: {
    database: 'ok' | 'error'
  }
  timestamp: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HealthResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).end()
  }

  let dbStatus: 'ok' | 'error' = 'error'
  try {
    const connected = await neo4jClient.verifyConnectivity()
    dbStatus = connected ? 'ok' : 'error'
  } catch {
    dbStatus = 'error'
  }

  const allOk = dbStatus === 'ok'
  const status = allOk ? 'ok' : 'degraded'

  return res.status(allOk ? 200 : 503).json({
    status,
    version: process.env.npm_package_version || '1.0.0',
    checks: { database: dbStatus },
    timestamp: new Date().toISOString(),
  })
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/cocodedk/0-projects/publix
git add frontend/pages/api/health.ts
git commit -m "feat: improve health endpoint with structured status and 503 on degraded"
```

---

## Server Setup Checklist (Manual Steps on VPS)

Run these once when setting up the production server. They are not automated because they require interactive input or root access.

- [ ] `sudo apt update && sudo apt install -y docker.io docker-compose-plugin nginx git`
- [ ] `sudo systemctl enable docker && sudo systemctl start docker`
- [ ] `git clone https://github.com/babakbandpey/publix.git /opt/publix`
- [ ] `cp /opt/publix/.env.example /opt/publix/.env && nano /opt/publix/.env` — fill in all values
- [ ] Copy `nginx/nginx.conf` to `/etc/nginx/sites-available/publix.dk` and symlink to `sites-enabled/`
- [ ] `sudo nginx -t && sudo systemctl restart nginx`
- [ ] `sudo bash /opt/publix/scripts/ssl-setup.sh`
- [ ] `bash /opt/publix/scripts/deploy.sh`
- [ ] Point `publix.dk` DNS A record to the VPS IP
- [ ] Verify: `curl https://publix.dk/api/health` returns `{"status":"ok",...}`

---

*This plan is Part 4 of 5. See `plan-5-quality.md` for CI/CD, testing, and code quality.*
