# Docker Commands Reference

## 🚀 Quick Start

```bash
# Build and start all services
npm run docker:build
npm run docker:up

# Or manually
docker-compose build
docker-compose up -d
```

---

## 📦 Container Management

### Start/Stop Services
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data!)
docker-compose down -v

# Restart specific service
docker-compose restart app
docker-compose restart postgres
docker-compose restart redis

# Restart all services
docker-compose restart
```

### View Container Status
```bash
# List running containers
docker-compose ps

# View all Docker containers
docker ps

# View stopped containers too
docker ps -a
```

---

## 📊 Logs & Monitoring

### View Logs
```bash
# Follow app logs (real-time)
npm run docker:logs
# or
docker-compose logs -f app

# View last 50 lines
docker-compose logs --tail=50 app

# View all service logs
docker-compose logs -f

# View specific service
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Monitor Resources
```bash
# View container stats (CPU, Memory, Network)
docker stats

# View specific container
docker stats botrade-app
```

---

## 🔧 Application Commands

### Rebuild After Code Changes
```bash
# Rebuild app container
docker-compose build app

# Restart with new build
docker-compose up -d app

# Or combined
npm run docker:build && npm run docker:up
```

### Execute Commands Inside Container
```bash
# Open shell in app container
docker-compose exec app sh

# Run Node.js commands
docker-compose exec app node --version
docker-compose exec app npm --version

# View environment variables
docker-compose exec app env

# View files
docker-compose exec app ls -la
docker-compose exec app cat package.json
```

---

## 🗄️ Database Commands

### PostgreSQL Access
```bash
# Connect to database
docker-compose exec postgres psql -U botrade_user -d botrade

# Run SQL query
docker-compose exec postgres psql -U botrade_user -d botrade -c "SELECT version();"

# List databases
docker-compose exec postgres psql -U botrade_user -c "\l"

# List tables (once migrations are run)
docker-compose exec postgres psql -U botrade_user -d botrade -c "\dt"

# Backup database
docker-compose exec postgres pg_dump -U botrade_user botrade > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U botrade_user -d botrade
```

### Prisma Commands
```bash
# Install Prisma (first time only)
docker-compose exec app npm install @prisma/client
docker-compose exec app npm install --save-dev prisma

# Initialize Prisma
docker-compose exec app npx prisma init

# Generate Prisma client
docker-compose exec app npx prisma generate

# Create and run migration
npm run prisma:migrate
# or
docker-compose exec app npx prisma migrate dev --name migration_name

# View migration status
docker-compose exec app npx prisma migrate status

# Reset database (WARNING: deletes all data!)
docker-compose exec app npx prisma migrate reset

# Open Prisma Studio (database GUI)
npm run prisma:studio
# or
docker-compose --profile tools up prisma-studio
# Then open: http://localhost:5555
```

---

## 💾 Redis Commands

### Redis Access
```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Test connection
docker-compose exec redis redis-cli ping

# View all keys
docker-compose exec redis redis-cli KEYS "*"

# Get specific key
docker-compose exec redis redis-cli GET key_name

# Delete key
docker-compose exec redis redis-cli DEL key_name

# Flush all data (WARNING: deletes everything!)
docker-compose exec redis redis-cli FLUSHALL

# View Redis info
docker-compose exec redis redis-cli INFO
```

---

## 🧪 Testing & Debugging

### Health Checks
```bash
# Test app health endpoint
curl http://localhost:3000/health

# Or with PowerShell
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing

# Check PostgreSQL
docker-compose exec postgres pg_isready -U botrade_user

# Check Redis
docker-compose exec redis redis-cli ping
```

### Run Tests
```bash
# Run tests in container
docker-compose exec app npm test

# Run specific test file
docker-compose exec app node tests/test-database.js
```

### Interactive Debugging
```bash
# Access app container shell
docker-compose exec app sh

# Inside container, you can:
cd /app
ls -la
cat logs/combined-*.log
node src/index.js
```

---

## 🔄 Volume & Data Management

### View Volumes
```bash
# List all volumes
docker volume ls

# Inspect volume
docker volume inspect botrade_postgres_data
docker volume inspect botrade_redis_data
```

### Backup & Restore Volumes
```bash
# Backup PostgreSQL data volume
docker run --rm -v botrade_postgres_data:/data -v ${PWD}:/backup alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore PostgreSQL data volume
docker run --rm -v botrade_postgres_data:/data -v ${PWD}:/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /data

# Backup Redis data volume
docker run --rm -v botrade_redis_data:/data -v ${PWD}:/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .
```

---

## 🧹 Cleanup

### Remove Containers
```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all
```

### Clean Docker System
```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything unused (careful!)
docker system prune -a

# View disk usage
docker system df
```

---

## 🔍 Troubleshooting

### Container Won't Start
```bash
# View detailed logs
docker-compose logs app

# Check container status
docker-compose ps

# Inspect container
docker inspect botrade-app

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <PID> /F

# Or change port in docker-compose.yml
# ports: "3001:3000"
```

### Database Connection Issues
```bash
# Check if database is healthy
docker-compose ps

# View database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U botrade_user -d botrade -c "SELECT 1;"

# Restart database
docker-compose restart postgres
```

### Out of Disk Space
```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a
docker volume prune
```

---

## 📝 Development Workflow

### Daily Development
```bash
# 1. Start services
docker-compose up -d

# 2. Watch logs while developing
docker-compose logs -f app

# 3. After code changes
docker-compose restart app

# 4. If package.json changed
docker-compose build app
docker-compose up -d app

# 5. End of day
docker-compose down
```

### Full Rebuild
```bash
# When you need a clean slate
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
docker-compose exec app npx prisma migrate dev
```

---

## 🚀 Production Deployment

### Build for Production
```bash
# Set production environment
export NODE_ENV=production

# Build and start
docker-compose -f docker-compose.yml up -d --build

# View production logs
docker-compose logs -f
```

### Push to Registry
```bash
# Tag image
docker tag botrade-app yourusername/botrade:latest
docker tag botrade-app yourusername/botrade:v1.0.0

# Push to Docker Hub
docker push yourusername/botrade:latest
docker push yourusername/botrade:v1.0.0

# On server, pull and run
docker pull yourusername/botrade:latest
docker-compose up -d
```

---

## 📚 Useful npm Scripts

All these are defined in `package.json`:

```bash
npm run start              # Start app (local, no Docker)
npm run dev                # Start with nodemon (local, no Docker)
npm run test               # Run tests (local, no Docker)
npm run docker:build       # Build Docker images
npm run docker:up          # Start containers
npm run docker:down        # Stop containers
npm run docker:logs        # Follow app logs
npm run docker:restart     # Restart app container
npm run prisma:migrate     # Run Prisma migration in container
npm run prisma:generate    # Generate Prisma client in container
npm run prisma:studio      # Open Prisma Studio
npm run logs:tail          # Tail log files in container
```

---

## 🔗 Useful Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose CLI Reference](https://docs.docker.com/compose/reference/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Prisma Documentation](https://www.prisma.io/docs)

---

**Last Updated:** December 30, 2025
