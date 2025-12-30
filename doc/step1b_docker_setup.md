# STEP 1B: Docker Setup (RECOMMENDED)

## ⚠️ ALTERNATIVE TO TRADITIONAL SETUP
**This is the RECOMMENDED approach for production deployment**

You can choose:
- **Option A:** Traditional setup (step1 → step2 → step3)
- **Option B:** Docker setup (THIS FILE) - Faster & More Reliable

---

## 🎯 Why Docker?

### ✅ Advantages:
- 🚀 **One command setup** - No manual PostgreSQL/Redis installation
- 🔒 **Consistent environment** - Works same on all machines
- 📦 **Isolated dependencies** - No conflicts with system packages
- 🔄 **Easy deployment** - Deploy anywhere with Docker
- 🧹 **Clean uninstall** - Remove everything with one command
- 🔧 **Pre-configured** - Database, cache, app all connected

### ⚠️ Considerations:
- Interactive Brokers TWS must run on **host machine** (not in container)
- Need Docker Desktop installed
- Slightly more complex debugging initially

---

## 📋 Prerequisites

- ✅ Docker Desktop installed ([Download](https://www.docker.com/products/docker-desktop))
- ✅ Git installed
- ✅ Code editor (VS Code recommended)

---

## ⏱️ Estimated Duration
**1-2 hours** (much faster than traditional setup!)

---

## 📝 Implementation Steps

### 1.1 Install Docker Desktop

**Windows:**
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Run installer
3. Restart computer
4. Verify installation:
   ```bash
   docker --version
   docker-compose --version
   ```

**Expected Output:**
```
Docker version 24.x.x
Docker Compose version v2.x.x
```

### 1.2 Create Project Structure

Since you're already in `c:\projects\teblab\botrade`:

```bash
# Create essential folders
mkdir -p src/{part1-sentiment,part2-technical/indicators,ai,portfolio,execution,database,utils,ui/routes,ui/public/{css,js}}
mkdir -p config logs data
```

### 1.3 Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Use Node.js LTS
FROM node:18-alpine

# Install required system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application
CMD ["node", "src/index.js"]
```

### 1.4 Create docker-compose.yml

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: botrade-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: botrade
      POSTGRES_USER: botrade_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-your_secure_password_here}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    networks:
      - botrade-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U botrade_user -d botrade"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: botrade-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - botrade-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes

  # Trading Bot Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: botrade-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DATABASE_URL: postgresql://botrade_user:${DB_PASSWORD:-your_secure_password_here}@postgres:5432/botrade
      REDIS_URL: redis://redis:6379
      
      # API Keys
      FMP_API_KEY: ${FMP_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      POLYGON_API_KEY: ${POLYGON_API_KEY}
      NEWSAPI_KEY: ${NEWSAPI_KEY}
      
      # IBKR (connects to host machine)
      IB_HOST: host.docker.internal
      IB_PORT: ${IB_PORT:-7497}
      IB_CLIENT_ID: ${IB_CLIENT_ID:-1}
      
      # Trading Settings
      MIN_CONFIDENCE: ${MIN_CONFIDENCE:-70}
      MAX_POSITION_PCT: ${MAX_POSITION_PCT:-10}
      MAX_DAILY_TRADES: ${MAX_DAILY_TRADES:-10}
      
      PORT: 3000
      LOG_LEVEL: ${LOG_LEVEL:-info}
    ports:
      - "3000:3000"
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    networks:
      - botrade-network
    extra_hosts:
      - "host.docker.internal:host-gateway"

  # Prisma Studio (optional - for database management)
  prisma-studio:
    image: node:18-alpine
    container_name: botrade-prisma
    working_dir: /app
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://botrade_user:${DB_PASSWORD:-your_secure_password_here}@postgres:5432/botrade
    ports:
      - "5555:5555"
    volumes:
      - .:/app
    networks:
      - botrade-network
    command: sh -c "npm install -g prisma && npx prisma studio --port 5555 --browser none"
    profiles:
      - tools

networks:
  botrade-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
```

### 1.5 Create .dockerignore

Create `.dockerignore`:

```
node_modules
npm-debug.log
logs/*.log
.env
.git
.gitignore
.vscode
.idea
*.md
Dockerfile
docker-compose.yml
.dockerignore
data/*.json
tests/
```

### 1.6 Create .env File

Create `.env`:

```bash
# Database
DB_PASSWORD=your_secure_password_here

# Environment
NODE_ENV=development
LOG_LEVEL=debug

# API Keys (GET THESE BEFORE RUNNING!)
FMP_API_KEY=your_fmp_key_here
OPENAI_API_KEY=your_openai_key_here
POLYGON_API_KEY=your_polygon_key_here
NEWSAPI_KEY=your_newsapi_key_here

# Interactive Brokers (TWS running on host)
IB_PORT=7497
IB_CLIENT_ID=1

# Trading Settings
MIN_CONFIDENCE=70
MAX_POSITION_PCT=10
MAX_DAILY_TRADES=10
```

### 1.7 Create package.json

Create `package.json`:

```json
{
  "name": "botrade",
  "version": "1.0.0",
  "description": "AI-Powered Algorithmic Trading Platform",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f app",
    "docker:restart": "docker-compose restart app",
    "docker:prisma": "docker-compose --profile tools up prisma-studio",
    "prisma:migrate": "docker-compose exec app npx prisma migrate dev",
    "prisma:generate": "docker-compose exec app npx prisma generate",
    "prisma:studio": "docker-compose --profile tools up prisma-studio",
    "logs:tail": "docker-compose exec app tail -f logs/combined-*.log",
    "test": "docker-compose exec app node tests/test.js"
  },
  "keywords": ["trading", "ai", "algorithmic", "docker"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "@prisma/client": "^5.7.1",
    "openai": "^4.20.0",
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.1",
    "redis": "^4.6.11",
    "technicalindicators": "^3.1.0",
    "@stoqey/ib": "^1.4.0"
  },
  "devDependencies": {
    "prisma": "^5.7.1",
    "nodemon": "^3.0.2"
  }
}
```

### 1.8 Create Initial Files

Create `src/index.js`:

```javascript
const config = require('../config/settings');

console.log('🐳 Botrade starting in Docker...');
console.log(`Environment: ${config.env}`);
console.log(`Database: ${config.database.url.split('@')[1]}`);
console.log(`Redis: ${config.redis.url}`);

console.log('✅ Docker environment validated');
console.log('\n📝 Next: Run Prisma migrations');
```

Create `config/settings.js`:

```javascript
require('dotenv').config();

module.exports = {
    api: {
        fmp: process.env.FMP_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        polygon: process.env.POLYGON_API_KEY,
        newsapi: process.env.NEWSAPI_KEY
    },
    
    ibkr: {
        host: process.env.IB_HOST || 'host.docker.internal',
        port: parseInt(process.env.IB_PORT) || 7497,
        clientId: parseInt(process.env.IB_CLIENT_ID) || 1
    },
    
    database: {
        url: process.env.DATABASE_URL
    },
    
    redis: {
        url: process.env.REDIS_URL || 'redis://redis:6379'
    },
    
    portfolio: {
        initialBudget: 100000,
        maxPositionPct: parseInt(process.env.MAX_POSITION_PCT) || 10,
        maxSectorExposure: 50,
        maxTotalExposure: 80,
        reserveCashPct: 20,
        maxRiskPerTradePct: 2
    },
    
    cache: {
        sentimentTTL: 3600,
        analysisTTL: 1800,
        newsTTL: 1800
    },
    
    trading: {
        minConfidence: parseInt(process.env.MIN_CONFIDENCE) || 70,
        maxDailyTrades: parseInt(process.env.MAX_DAILY_TRADES) || 10,
        maxDailyLossPct: 5,
        stopLossMultiplier: 2
    },
    
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000
};
```

### 1.9 Build and Start Containers

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

**Expected Output:**
```
✔ Container botrade-db      Started
✔ Container botrade-redis   Started
✔ Container botrade-app     Started
```

### 1.10 Initialize Database

```bash
# Copy Prisma schema from step2_database.md
# Then run migrations inside container
docker-compose exec app npx prisma migrate dev --name init
docker-compose exec app npx prisma generate
```

---

## ✅ Completion Checklist

- [ ] Docker Desktop installed and running
- [ ] `Dockerfile` created
- [ ] `docker-compose.yml` created
- [ ] `.dockerignore` created
- [ ] `.env` configured with API keys
- [ ] `package.json` created
- [ ] All containers running: `docker-compose ps` shows UP
- [ ] Database accessible: `docker-compose exec postgres psql -U botrade_user -d botrade`
- [ ] Redis accessible: `docker-compose exec redis redis-cli ping` returns PONG
- [ ] App running: `curl http://localhost:3000/health` (after implementing health endpoint)

---

## 🧪 Testing

```bash
# Test 1: Check Docker
docker --version
# Expected: Docker version 24.x.x

# Test 2: Check containers
docker-compose ps
# Expected: All services UP and healthy

# Test 3: Check PostgreSQL
docker-compose exec postgres psql -U botrade_user -d botrade -c "SELECT version();"
# Expected: PostgreSQL version info

# Test 4: Check Redis
docker-compose exec redis redis-cli ping
# Expected: PONG

# Test 5: View app logs
docker-compose logs app
# Expected: Initialization messages

# Test 6: Open Prisma Studio (optional)
npm run prisma:studio
# Opens http://localhost:5555
```

---

## 📋 Useful Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart just the app
docker-compose restart app

# View real-time logs
docker-compose logs -f app

# Execute command in app container
docker-compose exec app npm --version

# Shell access to app
docker-compose exec app sh

# Shell access to database
docker-compose exec postgres psql -U botrade_user -d botrade

# View all containers
docker ps

# Clean everything (WARNING: deletes data!)
docker-compose down -v

# Rebuild after code changes
docker-compose build app
docker-compose up -d app
```

---

## 🚨 Blocking Issues & Solutions

### Issue 1: "Docker Desktop is not running"
**Solution:**
1. Start Docker Desktop application
2. Wait for "Docker Desktop is running" message
3. Try command again

### Issue 2: Port 5432 already in use
**Solution:**
```bash
# Stop local PostgreSQL first
net stop postgresql-x64-15
# Or change port in docker-compose.yml: "5433:5432"
```

### Issue 3: "Cannot connect to IBKR"
**Solution:**
1. Ensure TWS/Gateway is running on **host machine** (not in Docker)
2. Enable API in TWS: Configure → Settings → API
3. Check `IB_HOST: host.docker.internal` in docker-compose.yml
4. Verify port 7497 (paper) or 7496 (live) matches TWS settings

### Issue 4: Containers keep restarting
**Solution:**
```bash
# Check logs for errors
docker-compose logs app

# Common causes:
# - Missing .env variables
# - Database not ready (check health)
# - Code syntax errors
```

---

## 🔄 Development Workflow

### Making Code Changes:
```bash
# 1. Edit code files
# 2. Rebuild app container
docker-compose build app

# 3. Restart app
docker-compose up -d app

# 4. Watch logs
docker-compose logs -f app
```

### Database Changes:
```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
docker-compose exec app npx prisma migrate dev --name your_change

# 3. Regenerate client
docker-compose exec app npx prisma generate
```

### Debugging:
```bash
# Access app shell
docker-compose exec app sh

# View logs
cd /app/logs
tail -f combined-*.log

# Check environment
env | grep DATABASE_URL
```

---

## 🚀 Production Deployment

### Deploy to VPS:
```bash
# 1. Copy files to server
scp -r . user@server:/opt/botrade

# 2. SSH into server
ssh user@server

# 3. Set production env
export NODE_ENV=production

# 4. Start services
cd /opt/botrade
docker-compose up -d

# 5. Check logs
docker-compose logs -f
```

### Deploy with Docker Hub:
```bash
# 1. Build and tag
docker build -t yourusername/botrade:latest .

# 2. Push to Docker Hub
docker push yourusername/botrade:latest

# 3. On server, update docker-compose.yml:
# image: yourusername/botrade:latest

# 4. Pull and start
docker-compose pull
docker-compose up -d
```

---

## 📊 Progress Tracking

**Current Status:** 🔴 NOT STARTED

- [ ] Started: YYYY-MM-DD
- [ ] Docker installed: YYYY-MM-DD
- [ ] Containers built: YYYY-MM-DD
- [ ] All services running: YYYY-MM-DD
- [ ] Database migrated: YYYY-MM-DD
- [ ] **COMPLETED:** YYYY-MM-DD

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Skip to:** `step2_database.md` (Section 2.3 onwards - just Prisma schema)

**You can SKIP these steps:**
- ❌ Step 1 (traditional setup) - already done with Docker!
- ❌ PostgreSQL installation - using Docker container
- ❌ Redis installation - using Docker container

**Continue with:**
- ✅ Prisma schema creation
- ✅ Migration commands (using docker-compose exec)

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)

---

**Last Updated:** December 30, 2025  
**Recommended Approach:** ⭐ Use this instead of traditional setup!
