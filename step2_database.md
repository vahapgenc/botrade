# STEP 2: Database Setup with Prisma ORM

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1 completed and verified
- ✅ PostgreSQL installed and running
- ✅ DATABASE_URL configured in .env

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 3**

---

## 🎯 Objectives
1. Install Prisma ORM
2. Create database schema
3. Run migrations
4. Test database connection
5. Create database utility files

---

## ⏱️ Estimated Duration
**1 day (6-8 hours)**

---

## 📝 Implementation Steps

### 2.1 Install Prisma
```bash
npm install @prisma/client
npm install --save-dev prisma
```

**Expected Output:**
```
added 2 packages, and audited 60 packages in 5s
```

### 2.2 Initialize Prisma
```bash
npx prisma init
```

**Expected Output:**
```
✔ Your Prisma schema was created at prisma/schema.prisma
  You can now open it in your favorite editor.
```

### 2.3 Create Database Schema
Replace contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Open Positions
model Portfolio {
  id                 Int      @id @default(autoincrement())
  ticker             String
  companyName        String?
  sector             String?
  industry           String?
  quantity           Int
  entryPrice         Decimal  @db.Decimal(10, 2)
  currentPrice       Decimal? @db.Decimal(10, 2)
  entryDate          DateTime @default(now())
  stopLoss           Decimal? @db.Decimal(10, 2)
  takeProfit         Decimal? @db.Decimal(10, 2)
  status             String   @default("OPEN") // OPEN, CLOSED
  correlationNotes   String?  @db.Text
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([ticker])
  @@index([status])
}

// Closed Trades with Tax Fields
model TradeHistory {
  id                 Int      @id @default(autoincrement())
  orderId            String?
  ticker             String
  action             String   // BUY, SELL
  quantity           Int
  entryPrice         Decimal  @db.Decimal(10, 2)
  exitPrice          Decimal? @db.Decimal(10, 2)
  entryDate          DateTime
  exitDate           DateTime?
  realizedPnL        Decimal? @db.Decimal(10, 2)
  realizedPnLPct     Decimal? @db.Decimal(10, 4)
  
  // Tax-specific fields
  costBasis          Decimal? @db.Decimal(10, 2)
  proceeds           Decimal? @db.Decimal(10, 2)
  commission         Decimal? @db.Decimal(10, 2)
  taxLotMethod       String?  // FIFO, LIFO, SpecificID
  washSale           Boolean  @default(false)
  shortTerm          Boolean? // true if held <365 days
  taxYear            Int?
  
  createdAt          DateTime @default(now())

  @@index([ticker])
  @@index([entryDate])
  @@index([taxYear])
}

// AI Decision Audit Trail
model AIDecision {
  id                 Int      @id @default(autoincrement())
  ticker             String
  timestamp          DateTime @default(now())
  
  // Input Data (stored as JSON)
  marketContext      Json?    // VIX, Fear & Greed, etc.
  assetAnalysis      Json?    // Technical indicators, fundamentals
  portfolioContext   Json?    // Current positions, cash, exposure
  
  // AI Response
  aiModel            String   // gpt-4-turbo
  decision           String   // BUY, SELL, HOLD
  confidence         Int      // 0-100
  quantity           Int?
  suggestedPrice     Decimal? @db.Decimal(10, 2)
  stopLoss           Decimal? @db.Decimal(10, 2)
  takeProfit         Decimal? @db.Decimal(10, 2)
  
  // Reasoning
  primaryFactors     Json?    // Array of key factors
  supportingFactors  Json?
  riskFactors        Json?
  reasoning          String?  @db.Text
  
  // Risk Assessment
  riskLevel          String?  // LOW, MEDIUM, HIGH
  maxLossPct         Decimal? @db.Decimal(5, 2)
  rewardRiskRatio    Decimal? @db.Decimal(5, 2)
  
  // Execution Tracking
  executed           Boolean  @default(false)
  executedAt         DateTime?
  actualOutcome      String?  // SUCCESS, FAILED, PARTIAL
  performancePnl     Decimal? @db.Decimal(10, 2)
  
  // API Cost Tracking
  promptTokens       Int?
  completionTokens   Int?
  totalTokens        Int?
  apiCostUsd         Decimal? @db.Decimal(10, 6)
  
  createdAt          DateTime @default(now())

  @@index([ticker])
  @@index([timestamp])
  @@index([decision])
  @@index([executed])
}

// IRS-Ready Tax Transaction Log
model TaxTransaction {
  id                 Int      @id @default(autoincrement())
  transactionDate    DateTime
  taxYear            Int
  ticker             String
  description        String?  @db.Text
  
  // Transaction Details
  transactionType    String   // BUY, SELL, DIVIDEND, SPLIT
  quantity           Decimal  @db.Decimal(12, 4) // Support fractional shares
  pricePerShare      Decimal  @db.Decimal(10, 2)
  totalAmount        Decimal  @db.Decimal(12, 2)
  commission         Decimal? @db.Decimal(10, 2)
  
  // Capital Gains Calculation
  costBasis          Decimal? @db.Decimal(12, 2)
  proceeds           Decimal? @db.Decimal(12, 2)
  capitalGain        Decimal? @db.Decimal(12, 2) // proceeds - cost
  gainType           String?  // SHORT_TERM, LONG_TERM
  
  // Wash Sale Detection
  washSale           Boolean  @default(false)
  relatedTradeId     Int?
  washSaleAmount     Decimal? @db.Decimal(10, 2)
  
  // Tax Forms
  form8949Required   Boolean  @default(false)
  form1099BReceived  Boolean  @default(false)
  
  // Audit Trail
  orderId            String?
  confirmationNum    String?
  notes              String?  @db.Text
  
  createdAt          DateTime @default(now())

  @@index([taxYear])
  @@index([ticker])
  @@index([transactionType])
  @@index([transactionDate])
}

// Cache for Analysis Results
model AnalysisCache {
  id                 Int      @id @default(autoincrement())
  ticker             String
  cacheKey           String   @unique
  cacheType          String   // SENTIMENT, TECHNICAL, FUNDAMENTAL, NEWS
  data               Json
  expiresAt          DateTime
  createdAt          DateTime @default(now())

  @@index([ticker])
  @@index([cacheType])
  @@index([expiresAt])
}

// Daily Performance Metrics
model PerformanceMetrics {
  id                 Int      @id @default(autoincrement())
  date               DateTime @unique
  totalValue         Decimal  @db.Decimal(12, 2)
  cashBalance        Decimal  @db.Decimal(12, 2)
  positionsValue     Decimal  @db.Decimal(12, 2)
  dailyPnL           Decimal  @db.Decimal(12, 2)
  dailyPnLPct        Decimal  @db.Decimal(10, 4)
  totalReturn        Decimal  @db.Decimal(10, 4)
  sharpeRatio        Decimal? @db.Decimal(10, 4)
  maxDrawdown        Decimal? @db.Decimal(10, 4)
  winRate            Decimal? @db.Decimal(5, 2)
  tradesCount        Int      @default(0)
  createdAt          DateTime @default(now())

  @@index([date])
}
```

### 2.4 Create PostgreSQL Database
```bash
# Option 1: Using psql
psql -U postgres
CREATE DATABASE botrade;
\q

# Option 2: Using createdb command
createdb -U postgres botrade
```

### 2.5 Run Migration
```bash
npx prisma migrate dev --name init
```

**Expected Output:**
```
Applying migration `20251230120000_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251230120000_init/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client
```

### 2.6 Generate Prisma Client
```bash
npx prisma generate
```

**Expected Output:**
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

### 2.7 Create Database Utility
Create `src/database/prisma.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
});

// Test connection
async function testConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Graceful shutdown
async function disconnect() {
    await prisma.$disconnect();
    console.log('Database disconnected');
}

// Handle cleanup
process.on('beforeExit', async () => {
    await disconnect();
});

module.exports = { prisma, testConnection, disconnect };
```

### 2.8 Create Test File
Create `tests/test-database.js`:

```javascript
const { prisma, testConnection } = require('../src/database/prisma');

async function runTests() {
    console.log('🧪 Testing Database Connection...\n');
    
    // Test 1: Connection
    console.log('Test 1: Database Connection');
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ Connection test failed');
        process.exit(1);
    }
    console.log('✅ Connection test passed\n');
    
    // Test 2: Create Portfolio Entry
    console.log('Test 2: Create Portfolio Entry');
    try {
        const position = await prisma.portfolio.create({
            data: {
                ticker: 'TEST',
                companyName: 'Test Company',
                sector: 'Technology',
                quantity: 10,
                entryPrice: 100.50,
                entryDate: new Date(),
                status: 'OPEN'
            }
        });
        console.log('✅ Created position:', position.id);
    } catch (error) {
        console.error('❌ Create test failed:', error.message);
        process.exit(1);
    }
    
    // Test 3: Read Portfolio Entry
    console.log('\nTest 3: Read Portfolio Entry');
    try {
        const positions = await prisma.portfolio.findMany({
            where: { ticker: 'TEST' }
        });
        console.log('✅ Found', positions.length, 'TEST position(s)');
    } catch (error) {
        console.error('❌ Read test failed:', error.message);
        process.exit(1);
    }
    
    // Test 4: Update Portfolio Entry
    console.log('\nTest 4: Update Portfolio Entry');
    try {
        const updated = await prisma.portfolio.updateMany({
            where: { ticker: 'TEST' },
            data: { currentPrice: 105.25 }
        });
        console.log('✅ Updated', updated.count, 'record(s)');
    } catch (error) {
        console.error('❌ Update test failed:', error.message);
        process.exit(1);
    }
    
    // Test 5: Delete Test Data
    console.log('\nTest 5: Clean Up Test Data');
    try {
        const deleted = await prisma.portfolio.deleteMany({
            where: { ticker: 'TEST' }
        });
        console.log('✅ Deleted', deleted.count, 'test record(s)');
    } catch (error) {
        console.error('❌ Delete test failed:', error.message);
        process.exit(1);
    }
    
    // Test 6: Verify All Tables Exist
    console.log('\nTest 6: Verify All Tables');
    try {
        await prisma.portfolio.count();
        await prisma.tradeHistory.count();
        await prisma.aIDecision.count();
        await prisma.taxTransaction.count();
        await prisma.analysisCache.count();
        await prisma.performanceMetrics.count();
        console.log('✅ All tables accessible');
    } catch (error) {
        console.error('❌ Table verification failed:', error.message);
        process.exit(1);
    }
    
    console.log('\n🎉 All database tests passed!');
    console.log('📝 You can now proceed to STEP 3');
    
    await prisma.$disconnect();
    process.exit(0);
}

runTests();
```

### 2.9 Update Main Index
Update `src/index.js`:

```javascript
const config = require('../config/settings');
const { testConnection } = require('./database/prisma');

async function initialize() {
    console.log('🚀 Trading Bot Initializing...');
    console.log(`Environment: ${config.env}`);
    
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('❌ Database connection failed');
        process.exit(1);
    }
    
    console.log('✅ All systems initialized');
    console.log('\n📝 Next: Proceed to STEP 3 (Logging System)');
}

initialize();
```

---

## ✅ Completion Checklist

Before proceeding to STEP 3, verify ALL items:

- [ ] Prisma installed (`@prisma/client` in package.json)
- [ ] `prisma/schema.prisma` created with all 6 models
- [ ] PostgreSQL database `botrade` exists
- [ ] Migration ran successfully (migration file in `prisma/migrations/`)
- [ ] Prisma Client generated (files in `node_modules/@prisma/client/`)
- [ ] `src/database/prisma.js` created
- [ ] `tests/test-database.js` created
- [ ] All database tests pass: `node tests/test-database.js`
- [ ] Can view database in Prisma Studio: `npx prisma studio`

---

## 🧪 Testing

```bash
# Test 1: Check Prisma installation
npx prisma --version
# Expected: prisma : 5.x.x

# Test 2: Validate schema
npx prisma validate
# Expected: The schema is valid

# Test 3: View database
npx prisma studio
# Expected: Opens http://localhost:5555 with all tables visible

# Test 4: Run database tests
node tests/test-database.js
# Expected: All tests passed message

# Test 5: Check migration status
npx prisma migrate status
# Expected: Database schema is up to date!

# Test 6: Run main app
npm run dev
# Expected: Database connected successfully message
```

---

## 🚨 Blocking Issues & Solutions

### Issue 1: "Error: P1001: Can't reach database server"
**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify DATABASE_URL in `.env`
3. Ensure PostgreSQL port (5432) is not blocked

### Issue 2: "Authentication failed for user postgres"
**Solution:**
1. Update password in DATABASE_URL
2. Reset PostgreSQL password if needed
3. Format: `postgresql://username:password@localhost:5432/botrade`

### Issue 3: Migration fails with "relation already exists"
**Solution:**
```bash
# Reset database
npx prisma migrate reset --force
npx prisma migrate dev --name init
```

### Issue 4: Prisma Client not generated
**Solution:**
```bash
npx prisma generate --force
```

---

## 📊 Progress Tracking

**Current Status:** 🔴 NOT STARTED

- [ ] Started: YYYY-MM-DD
- [ ] Prisma installed: YYYY-MM-DD
- [ ] Schema created: YYYY-MM-DD
- [ ] Database created: YYYY-MM-DD
- [ ] Migration completed: YYYY-MM-DD
- [ ] Tests passing: YYYY-MM-DD
- [ ] **COMPLETED:** YYYY-MM-DD

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step3_logging.md`

**DO NOT proceed until:**
- ✅ All completion checklist items are done
- ✅ All tests pass
- ✅ Prisma Studio shows all tables

---

## 📚 Additional Resources

- [Prisma Quickstart](https://www.prisma.io/docs/getting-started/quickstart)
- [PostgreSQL Windows Setup](https://www.postgresql.org/download/windows/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

**Last Updated:** December 30, 2025
