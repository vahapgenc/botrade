# STEP 1: Project Foundation & Environment Setup

## ⚠️ BLOCKING REQUIREMENT
**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 2**

---

## 📋 Prerequisites
- ✅ Node.js v18+ installed
- ✅ PostgreSQL installed and running
- ✅ Git installed
- ✅ Code editor (VS Code recommended)

---

## 🎯 Objectives
1. Create project structure
2. Install core dependencies
3. Set up environment variables
4. Initialize Git repository
5. Create configuration files

---

## ⏱️ Estimated Duration
**1-2 days**

---

## 📝 Implementation Steps

### 1.1 Create Project Directory
```bash
# Navigate to your projects folder
cd c:\projects\teblab\botrade

# You're already in the botrade folder!
# No need to create it
```

### 1.2 Initialize Node.js Project
```bash
npm init -y
```

### 1.3 Install Core Dependencies
```bash
# Core dependencies
npm install express axios dotenv cors

# Development dependencies
npm install --save-dev nodemon
```

**Expected Output:**
```
added 57 packages, and audited 58 packages in 8s
```

### 1.4 Create Folder Structure
```bash
# Windows PowerShell
New-Item -ItemType Directory -Force -Path src\part1-sentiment
New-Item -ItemType Directory -Force -Path src\part2-technical\indicators
New-Item -ItemType Directory -Force -Path src\ai
New-Item -ItemType Directory -Force -Path src\portfolio
New-Item -ItemType Directory -Force -Path src\execution
New-Item -ItemType Directory -Force -Path src\database
New-Item -ItemType Directory -Force -Path src\utils
New-Item -ItemType Directory -Force -Path src\ui\routes
New-Item -ItemType Directory -Force -Path src\ui\public\css
New-Item -ItemType Directory -Force -Path src\ui\public\js
New-Item -ItemType Directory -Force -Path config
New-Item -ItemType Directory -Force -Path data
New-Item -ItemType Directory -Force -Path logs
New-Item -ItemType Directory -Force -Path prisma
New-Item -ItemType Directory -Force -Path tests
```

### 1.5 Create .env File
Create `c:\projects\teblab\botrade\.env`:

```bash
# API Keys (GET THESE BEFORE STEP 3!)
FMP_API_KEY=your_fmp_key_here
OPENAI_API_KEY=your_openai_key_here
POLYGON_API_KEY=your_polygon_key_here
NEWSAPI_KEY=your_newsapi_key_here

# Interactive Brokers
IB_HOST=127.0.0.1
IB_PORT=7497
IB_CLIENT_ID=1

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/botrade

# Redis (optional - for caching)
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
PORT=3000

# Trading Settings
MIN_CONFIDENCE=70
MAX_POSITION_PCT=10
MAX_DAILY_TRADES=10
```

### 1.6 Create .gitignore
Create `c:\projects\teblab\botrade\.gitignore`:

```
# Dependencies
node_modules/
package-lock.json

# Environment
.env
.env.local
.env.production

# Logs
logs/
*.log
npm-debug.log*

# Database
data/*.json
data/*.db
*.sqlite

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build
dist/
build/
```

### 1.7 Create package.json Scripts
Edit `package.json` and add scripts:

```json
{
  "name": "botrade",
  "version": "1.0.0",
  "description": "AI-Powered Algorithmic Trading Platform",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "node tests/test.js"
  },
  "keywords": ["trading", "ai", "algorithmic"],
  "author": "Your Name",
  "license": "MIT"
}
```

### 1.8 Create Basic Configuration File
Create `config/settings.js`:

```javascript
require('dotenv').config();

module.exports = {
    // API Keys
    api: {
        fmp: process.env.FMP_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        polygon: process.env.POLYGON_API_KEY,
        newsapi: process.env.NEWSAPI_KEY
    },
    
    // IBKR
    ibkr: {
        host: process.env.IB_HOST || '127.0.0.1',
        port: parseInt(process.env.IB_PORT) || 7497,
        clientId: parseInt(process.env.IB_CLIENT_ID) || 1
    },
    
    // Database
    database: {
        url: process.env.DATABASE_URL
    },
    
    // Redis
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    
    // Portfolio Settings
    portfolio: {
        initialBudget: 100000,
        maxPositionPct: parseInt(process.env.MAX_POSITION_PCT) || 10,
        maxSectorExposure: 50,
        maxTotalExposure: 80,
        reserveCashPct: 20,
        maxRiskPerTradePct: 2
    },
    
    // Cache Settings
    cache: {
        sentimentTTL: 3600,  // 1 hour
        analysisTTL: 1800,   // 30 minutes
        newsTTL: 1800        // 30 minutes
    },
    
    // Trading Settings
    trading: {
        minConfidence: parseInt(process.env.MIN_CONFIDENCE) || 70,
        maxDailyTrades: parseInt(process.env.MAX_DAILY_TRADES) || 10,
        maxDailyLossPct: 5,
        stopLossMultiplier: 2  // 2x ATR
    },
    
    // Environment
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000
};
```

### 1.9 Create Placeholder index.js
Create `src/index.js`:

```javascript
const config = require('../config/settings');

console.log('🚀 Trading Bot Initializing...');
console.log(`Environment: ${config.env}`);
console.log(`Port: ${config.port}`);

// Validate critical environment variables
const requiredVars = ['FMP_API_KEY', 'OPENAI_API_KEY', 'DATABASE_URL'];
const missing = requiredVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please configure .env file before continuing');
    process.exit(1);
}

console.log('✅ Environment validated');
console.log('\n📝 Next: Proceed to STEP 2 (Database Setup)');
```

### 1.10 Initialize Git
```bash
git init
git add .
git commit -m "Initial commit: Project foundation setup"
```

---

## ✅ Completion Checklist

Before proceeding to STEP 2, verify ALL items:

- [ ] Project folder exists: `c:\projects\teblab\botrade`
- [ ] `package.json` exists with correct scripts
- [ ] All folders created (src, config, logs, data, prisma, tests)
- [ ] `.env` file created with all variables
- [ ] `.gitignore` file created
- [ ] `config/settings.js` created and exports config object
- [ ] `src/index.js` created
- [ ] Dependencies installed (`node_modules` folder exists)
- [ ] Git repository initialized (`.git` folder exists)
- [ ] Test command works: `npm run dev` (should show initialization message)

---

## 🧪 Testing

Run these commands to verify completion:

```bash
# Test 1: Check Node.js installation
node --version
# Expected: v18.x.x or higher

# Test 2: Check dependencies
npm list express axios dotenv
# Expected: All packages listed

# Test 3: Check folder structure
dir src
# Expected: See part1-sentiment, part2-technical, ai, etc.

# Test 4: Test config loading
node -e "const config = require('./config/settings'); console.log('Config loaded:', config.env)"
# Expected: Config loaded: development

# Test 5: Run the app
npm run dev
# Expected: Environment validated message
```

---

## 🚨 Blocking Issues & Solutions

### Issue 1: Missing Environment Variables
**Symptom:** Error message about missing API keys
**Solution:** 
1. Get API keys from:
   - FMP: https://financialmodelingprep.com/developer/docs/
   - OpenAI: https://platform.openai.com/api-keys
   - NewsAPI: https://newsapi.org/register
2. Add them to `.env` file
3. Restart the application

### Issue 2: PostgreSQL Not Installed
**Symptom:** Cannot find `createdb` command
**Solution:**
1. Download PostgreSQL: https://www.postgresql.org/download/windows/
2. Install with default settings
3. Note the password you set during installation
4. Update `DATABASE_URL` in `.env`

### Issue 3: npm install fails
**Symptom:** EACCES or permission errors
**Solution:**
```bash
# Run as administrator or use:
npm cache clean --force
npm install
```

---

## 📊 Progress Tracking

**Current Status:** 🔴 NOT STARTED

Update this section as you complete tasks:

- [ ] Started: YYYY-MM-DD
- [ ] Folders created: YYYY-MM-DD
- [ ] Dependencies installed: YYYY-MM-DD
- [ ] Configuration working: YYYY-MM-DD
- [ ] Tests passing: YYYY-MM-DD
- [ ] **COMPLETED:** YYYY-MM-DD

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step2_database.md`

**DO NOT proceed until:**
- ✅ All completion checklist items are done
- ✅ All tests pass
- ✅ `npm run dev` starts without errors

---

## 📚 Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/en/starter/installing.html)
- [dotenv Usage](https://github.com/motdotla/dotenv#usage)
- [PostgreSQL Installation Windows](https://www.postgresql.org/download/windows/)

---

**Last Updated:** December 30, 2025
