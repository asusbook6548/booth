# Booth Command — Backend Deployment Guide

This guide provides end-to-end instructions for deploying the **Booth Command Backend** (Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL) to production across:

1. **[Render](#1-deployment-on-render)** (Managed Cloud PaaS — Zero-maintenance, instant setup)
2. **[Railway](#2-deployment-on-railway)** (Developer-centric PaaS — Built-in PostgreSQL, instant preview)
3. **[Hostinger](#3-deployment-on-hostinger)**
   - **[Option A: Hostinger VPS (Ubuntu 22.04 / 24.04 LTS)](#option-a-hostinger-vps-ubuntu-recommended)** (Recommended for high performance, dedicated resources & total control)
   - **[Option B: Hostinger Cloud / Node.js Hosting (hPanel)](#option-b-hostinger-nodejs-application-hpanel)** (Managed shared/cloud environment)
4. **[Universal Docker Deployment](#4-universal-docker--docker-compose-deployment)** (Works on any Docker-compatible server or cloud)
5. **[Post-Deployment Verification & Checklist](#5-post-deployment-verification--checklist)**
6. **[Troubleshooting & Common Pitfalls](#6-troubleshooting--common-pitfalls)**

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │           PostgreSQL Database           │
                      │  (Render Postgres / Railway / Supabase  │
                      │        or Self-Hosted Postgres)         │
                      └────────────────────▲────────────────────┘
                                           │ DATABASE_URL (SSL)
                                           │ Prisma 7 + @prisma/adapter-pg
                      ┌────────────────────┴────────────────────┐
                      │       Booth Command Backend API         │
                      │     (Node.js 22 LTS + Express 5)        │
                      └────────────┬───────────────┬────────────┘
                                   │               │
                 HTTPS / REST API  │               │ HTTPS / REST API
                                   ▼               ▼
                      ┌─────────────────┐   ┌───────────────────┐
                      │ Admin Web App   │   │  Volunteer App    │
                      │ (React 19/Vite) │   │ (React Native)    │
                      └─────────────────┘   └───────────────────┘
```

---

## Required Environment Variables

Configure these environment variables in your hosting provider's dashboard or server `.env`:

| Variable | Required | Description | Example / Recommended Value |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Node environment mode | `production` |
| `PORT` | **Yes** | Port for Express HTTP server | `5000` (Render & Railway inject `$PORT` automatically) |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `JWT_SECRET` | **Yes** | 64+ char random secret for signing tokens | Generate via: `openssl rand -hex 32` |
| `CORS_ORIGIN` | **Yes** | Allowed web frontend origin URL(s) | `https://admin.yourdomain.com` |

> [!WARNING]
> **Production Security Rules**:
> 1. Never use default values for `JWT_SECRET` in production.
> 2. Ensure `CORS_ORIGIN` matches the exact scheme, domain, and port of your deployed frontend (e.g. `https://booth-admin.vercel.app`), without a trailing slash.
> 3. Ensure your PostgreSQL connection string enforces SSL (`?sslmode=require` or `?ssl=true`) when connecting to remote databases.

---

## 1. Deployment on Render

[Render](https://render.com) provides fully managed web services and PostgreSQL databases with automatic SSL, continuous deployment from GitHub, and zero-downtime rollouts.

### Step 1.1: Create a PostgreSQL Database on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **PostgreSQL**.
3. Fill in the details:
   - **Name**: `booth-command-db`
   - **Database**: `booth_command`
   - **User**: `booth_user`
   - **Region**: Choose the region closest to your users (e.g., `Singapore`, `Frankfurt`, `Oregon`).
   - **Instance Type**: Select **Free** (or Starter/Standard for production).
4. Click **Create Database**.
5. Once provisioned, locate the **Connections** section:
   - Copy the **Internal Database URL** (use this if the backend Web Service is also hosted on Render).
   - If hosting backend elsewhere, copy the **External Database URL**.

---

### Step 1.2: Create the Backend Web Service on Render

1. From the Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository containing `booth-command`.
3. Configure the service settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `booth-command-api` |
| **Region** | Same region as your database |
| **Branch** | `main` (or your production branch) |
| **Root Directory** | `backend` *(Critical: Leave empty only if repo root is the backend)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npx prisma migrate deploy && npm run start` |
| **Instance Type** | Free / Starter |

4. Scroll down to **Environment Variables** and add:

```env
NODE_ENV=production
DATABASE_URL=<Paste your Render Internal Database URL here>
JWT_SECRET=<Generate with: openssl rand -hex 32>
CORS_ORIGIN=https://your-frontend-domain.com
```

> [!NOTE]
> Render sets the `PORT` environment variable automatically. Express will listen on `process.env.PORT`.

5. Under **Health Check Path**, enter:
   ```
   /api/health
   ```
6. Click **Create Web Service**.

---

### Step 1.3: Run Initial Database Seed (Create Admin User)

Once the deployment completes and status turns to **Live**:

1. In the Render Web Service dashboard, click the **Shell** tab on the left sidebar.
2. In the terminal, execute:
   ```bash
   npx tsx prisma/seed.ts
   ```
3. You will see:
   ```text
   Admin created:
   { id: '...', email: 'admin@boothcommand.com', role: 'ADMIN' }
   ```
4. **Default Admin Credentials**:
   - **Email**: `admin@boothcommand.com`
   - **Password**: `Admin@123456`
   > [!IMPORTANT]
   > Log into the admin portal immediately and change this default password!

---

### Step 1.4: (Optional) Render Blueprint (`render.yaml`)

You can automate the entire setup using Render's Infrastructure as Code. Create `render.yaml` at your repository root:

```yaml
services:
  - type: web
    name: booth-command-api
    runtime: node
    rootDir: backend
    plan: starter
    region: singapore
    buildCommand: npm install && npm run build
    startCommand: npx prisma migrate deploy && npm run start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: booth-command-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: CORS_ORIGIN
        value: https://your-admin-portal.com

databases:
  - name: booth-command-db
    databaseName: booth_command
    user: booth_admin
    region: singapore
    plan: starter
```

---

## 2. Deployment on Railway

[Railway](https://railway.app) allows rapid full-stack deployments with native PostgreSQL plugins, zero-config private networking, and automatic branch previews.

### Step 2.1: Create Project & Provision PostgreSQL

1. Log in to [Railway](https://railway.app).
2. Click **New Project** → **Provision PostgreSQL**.
3. Railway will provision a managed PostgreSQL database container within seconds.

---

### Step 2.2: Add the Backend Service from GitHub

1. In the same project canvas, click **Create** / **New Service** → **GitHub Repo**.
2. Select your repository.
3. Click on the newly created service card and open **Settings**:
   - Under **General** → **Service Name**: Set to `booth-command-backend`.
   - Under **Source Directory** / **Root Directory**: Set to `/backend`.
4. Go to the **Build** tab:
   - **Build Command**:
     ```bash
     npm install && npm run build
     ```
5. Go to the **Deploy** tab:
   - **Custom Start Command**:
     ```bash
     npx prisma migrate deploy && npm run start
     ```
   - **Healthcheck Path**: `/api/health`

---

### Step 2.3: Configure Environment Variables in Railway

Go to the **Variables** tab of the backend service:

1. Click **New Variable** → **Add Reference**:
   - Variable Name: `DATABASE_URL`
   - Value: Select `${{Postgres.DATABASE_URL}}` (Railway links internal database URL automatically).
2. Add custom variables:

```env
NODE_ENV=production
JWT_SECRET=<Generate with: openssl rand -hex 32>
CORS_ORIGIN=https://your-frontend-app.up.railway.app
```

*(Railway automatically sets `PORT`, which your backend reads directly).*

---

### Step 2.4: Generate Public Domain & Seed Database

1. Under service **Settings** → **Networking** → **Public Networking**:
   - Click **Generate Domain** (e.g. `booth-command-backend-production.up.railway.app`).
2. Run database seed to create initial admin account:
   - In Railway, click the service → click **View Logs** or open **Terminal** (CLI icon).
   - Run:
     ```bash
     npx tsx prisma/seed.ts
     ```
3. Test your health check:
   ```bash
   curl https://booth-command-backend-production.up.railway.app/api/health
   ```
   Expected response:
   ```json
   {
     "success": true,
     "message": "Booth Command Backend is running",
     "database": "connected"
   }
   ```

---

## 3. Deployment on Hostinger

Hostinger offers two main deployment routes:
- **Option A: Hostinger VPS (Virtual Private Server running Ubuntu)** — **Recommended** (Best performance, full control, PM2, persistent uploads).
- **Option B: Hostinger Cloud Hosting / Node.js Application Manager (hPanel)**.

---

### Option A: Hostinger VPS (Ubuntu) [RECOMMENDED]

A VPS with Ubuntu 22.04 or 24.04 LTS gives you dedicated CPU, memory, and complete freedom to run Node.js, PM2, PostgreSQL, and Nginx.

#### 1. Server Prerequisites & System Updates

Connect to your VPS via SSH:

```bash
ssh root@<YOUR_VPS_IP>
```

Update system packages:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw nginx
```

#### 2. Install Node.js 22 LTS & PM2

```bash
# Add NodeSource official Node 22 repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v   # Should be v22.x.x
npm -v    # Should be 10.x.x

# Install PM2 process manager globally
sudo npm install -g pm2
```

#### 3. Install & Configure PostgreSQL 16

```bash
# Install PostgreSQL and contrib
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user and create database + user
sudo -u postgres psql
```

Inside PostgreSQL prompt:

```sql
CREATE DATABASE booth_command;
CREATE USER booth_admin WITH ENCRYPTED PASSWORD 'StrongProductionPasswordHere#2026';
GRANT ALL PRIVILEGES ON DATABASE booth_command TO booth_admin;
ALTER DATABASE booth_command OWNER TO booth_admin;

-- Grant schema permissions for PostgreSQL 15+
\c booth_command
GRANT ALL ON SCHEMA public TO booth_admin;
\q
```

#### 4. Clone and Build Backend Application

```bash
# Create directory for application
sudo mkdir -p /var/www/booth-command
sudo chown -R $USER:$USER /var/www/booth-command

# Clone your repository
cd /var/www/booth-command
git clone https://github.com/your-org/booth-command.git .

# Move into backend directory
cd /var/www/booth-command/backend

# Create uploads directory with correct write permissions
mkdir -p uploads
chmod 775 uploads

# Install dependencies
npm install

# Setup production environment file
cp .env.example .env
nano .env
```

Configure `.env` with production parameters:

```env
DATABASE_URL="postgresql://booth_admin:StrongProductionPasswordHere%232026@localhost:5432/booth_command"
PORT=5000
NODE_ENV=production
JWT_SECRET="c4f8d93e1b2a4567890abcdef1234567890abcdef1234567890abcdef1234567"
CORS_ORIGIN="https://admin.yourdomain.com"
```

> [!NOTE]
> If your database password contains special characters (like `#`, `@`, `%`), ensure they are URL-encoded in the `DATABASE_URL` (e.g. `#` becomes `%23`).

#### 5. Run Database Migrations & Initial Seed

```bash
# Apply all migrations to PostgreSQL
npx prisma migrate deploy

# Run seed to create default system admin
npx tsx prisma/seed.ts

# Build TypeScript to production JavaScript (runs prisma generate + tsc)
npm run build
```

#### 6. Configure PM2 Process Manager

Create an ecosystem file in `/var/www/booth-command/backend/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: "booth-command-backend",
      script: "dist/server.js",
      instances: "max",       // Scale across all available CPU cores
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
    },
  ],
};
```

Start the application with PM2 and configure auto-start on server boot:

```bash
# Start backend via PM2
pm2 start ecosystem.config.cjs

# Save active process list
pm2 save

# Setup PM2 startup script on system reboot
pm2 startup
# Follow the printed command instruction (e.g. sudo env PATH=... pm2 startup systemd -u root --hp /root)
```

Useful PM2 commands:
```bash
pm2 status                  # Check process status
pm2 logs booth-command-backend  # View real-time logs
pm2 reload booth-command-backend # Zero-downtime reload
```

#### 7. Configure Nginx Reverse Proxy & SSL (Certbot)

Create an Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/booth-api.conf
```

Paste the following block (replace `api.yourdomain.com` with your domain or subdomain):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Allow up to 50MB file uploads for large voter rolls / excel imports
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for large file imports
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }
}
```

Enable site configuration and test Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/booth-api.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Secure with free Let's Encrypt SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

Certbot will configure SSL certificates automatically and set up auto-renewal.

#### 8. Configure UFW Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

### Option B: Hostinger Node.js Application (hPanel)

If you are using Hostinger Cloud Hosting or Business Web Hosting with the **Node.js Selector / Application Manager**:

1. **Database Setup**:
   - Hostinger shared web hosting databases are MySQL/MariaDB. Because this backend requires **PostgreSQL**, you must either:
     - Use a free managed PostgreSQL instance (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Render Postgres]).
     - Or connect to a PostgreSQL database hosted on your Hostinger VPS.
2. **Setup Node.js App in hPanel**:
   - In hPanel, go to **Websites** → **Node.js**.
   - Click **Create Application**.
   - **Node.js Version**: Select `20.x` or `22.x`.
   - **Application Root**: `booth-command/backend`
   - **Application Startup File**: `dist/server.js`
   - **Application URL**: `api.yourdomain.com`
3. **Environment Variables in hPanel**:
   - In the Node.js application settings, add the environment variables:
     - `DATABASE_URL`
     - `PORT`
     - `NODE_ENV=production`
     - `JWT_SECRET`
     - `CORS_ORIGIN`
4. **Build & Deploy via SSH / Terminal**:
   - Open hPanel **SSH Access** / **Web Terminal**:
     ```bash
     cd ~/domains/yourdomain.com/public_html/booth-command/backend
     npm install
     npx prisma migrate deploy
     npx tsx prisma/seed.ts
     npm run build
     ```
   - Restart the Node.js application in hPanel.

---

## 4. Universal Docker & Docker Compose Deployment

If you prefer deploying via Docker on any VPS, cloud VM, or container service:

### Multi-Stage Production `Dockerfile`

Create `backend/Dockerfile`:

```dockerfile
# ==========================================
# 1. BUILD STAGE
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl libc6-compat

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY tsconfig.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Generate Prisma Client & compile TypeScript (npm run build does both)
RUN npm run build

# ==========================================
# 2. PRODUCTION RUNNER STAGE
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=5000

# Create application user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy package manifests and production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy generated Prisma engine & schema
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Create uploads directory with write access
RUN mkdir -p uploads && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

# Run migrations and start app
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### Production `docker-compose.yml`

Create `backend/docker-compose.yml`:

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    container_name: booth_command_postgres
    restart: always
    environment:
      POSTGRES_USER: booth_user
      POSTGRES_PASSWORD: StrongProductionPassword2026!
      POSTGRES_DB: booth_command
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U booth_user -d booth_command"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: booth_command_api
    restart: always
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      DATABASE_URL: "postgresql://booth_user:StrongProductionPassword2026!@db:5432/booth_command"
      JWT_SECRET: "replace_with_openssl_rand_hex_32_secret_key"
      CORS_ORIGIN: "https://admin.yourdomain.com"
    volumes:
      - upload_data:/app/uploads

volumes:
  postgres_data:
  upload_data:
```

Run containers:

```bash
docker compose up -d --build
```

---

## 5. Post-Deployment Verification & Checklist

Once your backend is live, execute these validation steps:

### 1. Health Check & Database Connectivity

Send a GET request to the `/api/health` endpoint:

```bash
curl -i https://api.yourdomain.com/api/health
```

Expected HTTP 200 response:
```json
{
  "success": true,
  "message": "Booth Command Backend is running",
  "database": "connected"
}
```

### 2. Verify Swagger API Documentation

Open your browser and navigate to:
```
https://api.yourdomain.com/api-docs
```
You should see the interactive Swagger UI listing all authentication, voter, booth, assembly, and analytics endpoints.

### 3. Verify Admin Authentication

Send a test login request:

```bash
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@boothcommand.com","password":"Admin@123456"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "...",
      "name": "System Admin",
      "email": "admin@boothcommand.com",
      "role": "ADMIN"
    }
  }
}
```

### 4. Production Checklist

- [ ] **SSL / TLS**: Verified HTTPS is active with a valid SSL certificate.
- [ ] **CORS**: `CORS_ORIGIN` matches frontend domain without a trailing slash.
- [ ] **Admin Password Changed**: Updated default `Admin@123456` password.
- [ ] **Database Backups**: Scheduled daily automated backups in Render/Railway or via `pg_dump` cron on VPS.
- [ ] **Uploads Directory**: Ensure `uploads/` directory exists and has write permissions for processing Excel voter imports.
- [ ] **Process Monitoring**: PM2 or PaaS container auto-restart is active on crashes or reboots.

---

## 6. Troubleshooting & Common Pitfalls

### Issue 1: `PrismaClientInitializationError: Can't reach database server`
- **Cause**: Incorrect database credentials, PostgreSQL service stopped, or missing firewall rule.
- **Fix**:
  - Test connection string directly: `psql "<DATABASE_URL>"`
  - For external databases (AWS RDS, Supabase, Neon), append `?sslmode=require` to `DATABASE_URL`.
  - On Render, ensure you are using the **Internal Database URL** if both services are in the same Render region.

### Issue 2: `CORS policy: No 'Access-Control-Allow-Origin' header`
- **Cause**: Frontend URL does not match `CORS_ORIGIN` environment variable.
- **Fix**:
  - Check that `CORS_ORIGIN` in `.env` is exact (e.g. `https://admin.yourdomain.com`, **not** `https://admin.yourdomain.com/`).
  - Remember that in `production`, requests without matching origins are blocked by CORS.

### Issue 3: `ENOENT: no such file or directory, open 'uploads/...'`
- **Cause**: The `uploads/` directory was not created or was git-ignored.
- **Fix**:
  - On your server or build command, add: `mkdir -p uploads`.
  - Ensure permissions: `chmod 775 uploads`.

### Issue 4: `413 Payload Too Large` when importing Voter Excel rolls
- **Cause**: Nginx default client upload limit is 1MB.
- **Fix**: In your Nginx configuration, add:
  ```nginx
  client_max_body_size 50M;
  ```
  Then reload Nginx: `sudo systemctl reload nginx`.

### Issue 5: `Error: P3005: The database schema is not empty`
- **Cause**: Running `prisma migrate dev` in production against an existing database.
- **Fix**: Always use `npx prisma migrate deploy` in production environments. Never use `migrate dev` on production databases.
