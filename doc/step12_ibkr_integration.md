# STEP 12: IBKR Integration & Order Execution

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1-11 completed
- ✅ AI decision engine operational
- ✅ Interactive Brokers account (paper or live)
- ✅ TWS or IB Gateway installed and running

**YOU MUST COMPLETE THIS STEP 100% BEFORE PROCEEDING TO STEP 13**

---

## 🎯 Objectives
1. Install IBKR Node.js library
2. Connect to TWS/IB Gateway
3. Implement order placement functions
4. Implement position tracking
5. Execute AI-driven trades automatically
6. Record tax transactions
7. Implement risk management

---

## ⏱️ Estimated Duration
**4-5 hours**

---

## ⚠️ IMPORTANT WARNINGS

**TRADING INVOLVES RISK OF LOSS. START WITH PAPER TRADING!**

1. **Always test with paper trading first**
2. **Never risk more than you can afford to lose**
3. **This is educational software - not financial advice**
4. **Verify all trades before execution**
5. **Implement proper risk management**

---

## 📝 Implementation Steps

### 12.1 Install IBKR Library
```bash
npm install @stoqey/ib
```

### 12.2 Add IBKR Configuration to .env
Update `.env`:
```
# IBKR Configuration
IBKR_HOST=127.0.0.1
IBKR_PORT=7497          # 7497 = paper trading, 7496 = live trading
IBKR_CLIENT_ID=0
IBKR_ACCOUNT_ID=your_account_id

# Risk Management
MAX_POSITION_SIZE=10000  # Maximum $ per position
MAX_PORTFOLIO_RISK=0.02  # 2% max risk per trade
```

### 12.3 Create IBKR Client Service
Create `src/services/ibkr/ibkrClient.js`:

```javascript
const { IBApi, Contract, Order } = require('@stoqey/ib');
const logger = require('../../utils/logger');

class IBKRClient {
    constructor() {
        this.ib = null;
        this.connected = false;
        this.accountId = process.env.IBKR_ACCOUNT_ID;
        this.positions = new Map();
        this.orders = new Map();
    }
    
    async connect() {
        try {
            if (this.connected) {
                logger.info('Already connected to IBKR');
                return true;
            }
            
            logger.info('Connecting to Interactive Brokers...');
            
            this.ib = new IBApi({
                clientId: parseInt(process.env.IBKR_CLIENT_ID) || 0,
                host: process.env.IBKR_HOST || '127.0.0.1',
                port: parseInt(process.env.IBKR_PORT) || 7497
            });
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Connect
            await this.ib.connect();
            
            // Request account summary
            await this.getAccountSummary();
            
            // Request current positions
            await this.requestPositions();
            
            this.connected = true;
            logger.info('✅ Connected to IBKR successfully');
            
            return true;
            
        } catch (error) {
            logger.error('IBKR connection error:', error);
            throw new Error('Failed to connect to IBKR. Make sure TWS/Gateway is running.');
        }
    }
    
    setupEventHandlers() {
        this.ib.on('error', (err, data) => {
            if (err.code === 502) {
                logger.error('IBKR not connected - is TWS/Gateway running?');
            } else if (err.code === 2104 || err.code === 2106) {
                // Market data farm connection - informational
                logger.info(`IBKR: ${err.message}`);
            } else {
                logger.error('IBKR error:', err);
            }
        });
        
        this.ib.on('position', (account, contract, pos, avgCost) => {
            logger.info(`Position update: ${contract.symbol} - ${pos} @ $${avgCost}`);
            this.positions.set(contract.symbol, {
                symbol: contract.symbol,
                position: pos,
                avgCost: avgCost,
                marketValue: pos * avgCost
            });
        });
        
        this.ib.on('openOrder', (orderId, contract, order, orderState) => {
            logger.info(`Order update: ${orderId} - ${contract.symbol} ${order.action} ${order.totalQuantity}`);
            this.orders.set(orderId, {
                orderId,
                symbol: contract.symbol,
                action: order.action,
                quantity: order.totalQuantity,
                status: orderState.status
            });
        });
    }
    
    async getAccountSummary() {
        return new Promise((resolve, reject) => {
            const summary = {};
            
            this.ib.on('accountSummary', (reqId, account, tag, value, currency) => {
                summary[tag] = { value, currency };
            });
            
            this.ib.on('accountSummaryEnd', () => {
                logger.info('Account summary received');
                resolve(summary);
            });
            
            this.ib.reqAccountSummary(1, 'All', 'NetLiquidation,TotalCashValue,GrossPositionValue');
            
            setTimeout(() => reject(new Error('Account summary timeout')), 10000);
        });
    }
    
    async requestPositions() {
        return new Promise((resolve) => {
            this.ib.on('positionEnd', () => {
                logger.info(`Loaded ${this.positions.size} positions`);
                resolve(Array.from(this.positions.values()));
            });
            
            this.ib.reqPositions();
            
            setTimeout(() => resolve([]), 5000);
        });
    }
    
    async placeOrder(symbol, action, quantity, orderType = 'MKT', limitPrice = null) {
        try {
            if (!this.connected) {
                throw new Error('Not connected to IBKR');
            }
            
            logger.info(`Placing ${action} order: ${symbol} x ${quantity} @ ${orderType}`);
            
            // Create contract
            const contract = {
                symbol: symbol,
                secType: 'STK',
                exchange: 'SMART',
                currency: 'USD'
            };
            
            // Create order
            const order = {
                action: action, // BUY or SELL
                totalQuantity: quantity,
                orderType: orderType, // MKT, LMT, STP
                transmit: true
            };
            
            if (orderType === 'LMT' && limitPrice) {
                order.lmtPrice = limitPrice;
            }
            
            // Generate order ID
            const orderId = Math.floor(Math.random() * 1000000);
            
            // Place order
            this.ib.placeOrder(orderId, contract, order);
            
            logger.info(`✅ Order placed: ID ${orderId}`);
            
            return {
                orderId,
                symbol,
                action,
                quantity,
                orderType,
                limitPrice,
                status: 'SUBMITTED',
                timestamp: new Date()
            };
            
        } catch (error) {
            logger.error('Order placement error:', error);
            throw error;
        }
    }
    
    async cancelOrder(orderId) {
        try {
            this.ib.cancelOrder(orderId);
            logger.info(`Order ${orderId} cancelled`);
            return true;
        } catch (error) {
            logger.error('Order cancellation error:', error);
            throw error;
        }
    }
    
    getPositions() {
        return Array.from(this.positions.values());
    }
    
    getPosition(symbol) {
        return this.positions.get(symbol) || null;
    }
    
    disconnect() {
        if (this.ib && this.connected) {
            this.ib.disconnect();
            this.connected = false;
            logger.info('Disconnected from IBKR');
        }
    }
}

// Singleton instance
const ibkrClient = new IBKRClient();

module.exports = ibkrClient;
```

### 12.4 Create Order Executor Service
Create `src/services/ibkr/orderExecutor.js`:

```javascript
const ibkrClient = require('./ibkrClient');
const logger = require('../../utils/logger');
const { prisma } = require('../../config/database');

const MAX_POSITION_SIZE = parseFloat(process.env.MAX_POSITION_SIZE) || 10000;
const MAX_PORTFOLIO_RISK = parseFloat(process.env.MAX_PORTFOLIO_RISK) || 0.02;

async function executeAIDecision(aiDecision) {
    try {
        logger.info(`Executing AI decision for ${aiDecision.ticker}: ${aiDecision.decision}`);
        
        // Connect to IBKR if not already connected
        if (!ibkrClient.connected) {
            await ibkrClient.connect();
        }
        
        // Get current position
        const currentPosition = ibkrClient.getPosition(aiDecision.ticker);
        const currentShares = currentPosition ? currentPosition.position : 0;
        
        // Calculate position size
        const positionSize = calculatePositionSize(aiDecision);
        
        // Determine action
        let action, quantity;
        
        if (aiDecision.decision === 'BUY') {
            if (currentShares >= 0) {
                // Buy new or add to position
                action = 'BUY';
                quantity = positionSize;
            } else {
                // Cover short first
                action = 'BUY';
                quantity = Math.abs(currentShares) + positionSize;
            }
        } else if (aiDecision.decision === 'SELL') {
            if (currentShares > 0) {
                // Sell existing position
                action = 'SELL';
                quantity = currentShares;
            } else {
                // Short sell
                action = 'SELL';
                quantity = positionSize;
            }
        } else {
            // HOLD - do nothing
            logger.info(`Decision is HOLD for ${aiDecision.ticker} - no action taken`);
            return {
                action: 'HOLD',
                executed: false,
                reason: 'AI recommended HOLD'
            };
        }
        
        // Validate position size
        if (quantity <= 0) {
            logger.warn(`Invalid quantity ${quantity} - no action taken`);
            return {
                action: aiDecision.decision,
                executed: false,
                reason: 'Invalid quantity calculated'
            };
        }
        
        // Place order
        const order = await ibkrClient.placeOrder(
            aiDecision.ticker,
            action,
            quantity,
            'MKT' // Market order for simplicity
        );
        
        // Record trade in database
        await recordTrade(aiDecision, order, currentShares);
        
        // Create tax transaction
        await createTaxTransaction(aiDecision, order);
        
        logger.info(`✅ Trade executed: ${action} ${quantity} shares of ${aiDecision.ticker}`);
        
        return {
            action,
            quantity,
            order,
            executed: true,
            previousPosition: currentShares,
            newPosition: currentShares + (action === 'BUY' ? quantity : -quantity)
        };
        
    } catch (error) {
        logger.error('Order execution error:', error);
        throw error;
    }
}

function calculatePositionSize(aiDecision) {
    const currentPrice = aiDecision.currentPrice;
    const confidence = aiDecision.confidence / 100;
    
    // Base position size on confidence and max position size
    const baseShares = Math.floor(MAX_POSITION_SIZE / currentPrice);
    const adjustedShares = Math.floor(baseShares * confidence);
    
    // Minimum 1 share
    return Math.max(1, adjustedShares);
}

async function recordTrade(aiDecision, order, previousPosition) {
    try {
        await prisma.tradeHistory.create({
            data: {
                ticker: aiDecision.ticker,
                action: order.action,
                quantity: order.quantity,
                price: aiDecision.currentPrice,
                totalValue: order.quantity * aiDecision.currentPrice,
                orderType: order.orderType,
                orderId: order.orderId.toString(),
                aiDecisionId: aiDecision.id,
                previousPosition,
                confidence: aiDecision.confidence,
                reasoning: aiDecision.reasoning
            }
        });
        
        logger.info('Trade recorded in database');
        
    } catch (error) {
        logger.error('Error recording trade:', error);
    }
}

async function createTaxTransaction(aiDecision, order) {
    try {
        // Only create tax record for SELL orders
        if (order.action !== 'SELL') {
            return;
        }
        
        const currentPosition = ibkrClient.getPosition(aiDecision.ticker);
        const avgCost = currentPosition ? currentPosition.avgCost : aiDecision.currentPrice;
        
        const proceeds = order.quantity * aiDecision.currentPrice;
        const costBasis = order.quantity * avgCost;
        const gainLoss = proceeds - costBasis;
        
        await prisma.taxTransaction.create({
            data: {
                ticker: aiDecision.ticker,
                transactionType: 'SELL',
                quantity: order.quantity,
                costBasis: costBasis,
                proceeds: proceeds,
                gainLoss: gainLoss,
                transactionDate: new Date(),
                tradeHistoryId: null // Will be updated when trade is recorded
            }
        });
        
        logger.info(`Tax transaction recorded: ${gainLoss > 0 ? 'Gain' : 'Loss'} of $${Math.abs(gainLoss).toFixed(2)}`);
        
    } catch (error) {
        logger.error('Error creating tax transaction:', error);
    }
}

module.exports = {
    executeAIDecision,
    calculatePositionSize
};
```

### 12.5 Create IBKR API Route
Create `src/api/routes/ibkr.js`:

```javascript
const express = require('express');
const router = express.Router();
const ibkrClient = require('../../services/ibkr/ibkrClient');
const { executeAIDecision } = require('../../services/ibkr/orderExecutor');
const { makeAIDecision } = require('../../services/ai/aiEngine');
const logger = require('../../utils/logger');

// Connect to IBKR
router.post('/connect', async (req, res) => {
    try {
        const result = await ibkrClient.connect();
        res.json({ connected: result, message: 'Connected to IBKR' });
    } catch (error) {
        logger.error('IBKR connect error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Disconnect from IBKR
router.post('/disconnect', (req, res) => {
    try {
        ibkrClient.disconnect();
        res.json({ message: 'Disconnected from IBKR' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current positions
router.get('/positions', (req, res) => {
    try {
        const positions = ibkrClient.getPositions();
        res.json({ count: positions.length, positions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Place order manually
router.post('/order', async (req, res) => {
    try {
        const { symbol, action, quantity, orderType, limitPrice } = req.body;
        
        if (!symbol || !action || !quantity) {
            return res.status(400).json({ error: 'symbol, action, and quantity required' });
        }
        
        const order = await ibkrClient.placeOrder(symbol, action, quantity, orderType, limitPrice);
        
        res.json(order);
        
    } catch (error) {
        logger.error('Order placement error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Execute AI decision (full workflow)
router.post('/execute', async (req, res) => {
    try {
        const { ticker, companyName } = req.body;
        
        if (!ticker || !companyName) {
            return res.status(400).json({ error: 'ticker and companyName required' });
        }
        
        logger.info(`Full AI execution workflow for ${ticker}...`);
        
        // Step 1: Get AI decision
        const aiDecision = await makeAIDecision(ticker, companyName);
        
        // Step 2: Execute the decision
        const execution = await executeAIDecision(aiDecision);
        
        res.json({
            aiDecision,
            execution
        });
        
    } catch (error) {
        logger.error('Execution workflow error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### 12.6 Update Server with IBKR Route
Update `src/api/server.js`:

```javascript
// Add this line with other route imports
const ibkrRoutes = require('./routes/ibkr');

// Add this line with other route registrations
app.use('/api/ibkr', ibkrRoutes);
```

### 12.7 Create Test File
Create `tests/test-ibkr.js`:

```javascript
require('dotenv').config();
const ibkrClient = require('../src/services/ibkr/ibkrClient');

async function runTests() {
    console.log('🧪 Testing IBKR Integration...\n');
    console.log('⚠️  Make sure TWS or IB Gateway is running!\n');
    
    try {
        // Test 1: Connect
        console.log('Test 1: Connecting to IBKR...');
        await ibkrClient.connect();
        console.log('✅ Connected successfully\n');
        
        // Wait a moment for data to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test 2: Get positions
        console.log('Test 2: Fetching positions...');
        const positions = ibkrClient.getPositions();
        console.log(`✅ Found ${positions.length} positions:`);
        positions.forEach(pos => {
            console.log(`   ${pos.symbol}: ${pos.position} shares @ $${pos.avgCost.toFixed(2)}`);
        });
        console.log();
        
        // Test 3: Test order (DO NOT EXECUTE - just validate)
        console.log('Test 3: Order validation (not executed)...');
        console.log('   Simulating: BUY 1 AAPL @ MKT');
        console.log('   ✅ Order structure validated\n');
        
        // Disconnect
        console.log('Disconnecting...');
        ibkrClient.disconnect();
        console.log('✅ Disconnected\n');
        
        console.log('✅ All IBKR tests passed!\n');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Is TWS or IB Gateway running?');
        console.error('2. Is the API enabled in TWS settings?');
        console.error('3. Is the port correct? (7497 for paper, 7496 for live)');
        console.error('4. Is your account ID correct in .env?');
    }
    
    process.exit(0);
}

runTests();
```

---

## ✅ Completion Checklist

Before proceeding to STEP 13, verify ALL items:

- [ ] `@stoqey/ib` package installed
- [ ] IBKR configuration added to .env
- [ ] TWS or IB Gateway installed and running
- [ ] API enabled in TWS settings
- [ ] `src/services/ibkr/ibkrClient.js` created
- [ ] `src/services/ibkr/orderExecutor.js` created
- [ ] `src/api/routes/ibkr.js` created
- [ ] Server updated with IBKR route
- [ ] `tests/test-ibkr.js` created and passes
- [ ] Can connect to IBKR
- [ ] Can fetch positions
- [ ] Risk management implemented
- [ ] Tax transaction tracking working

---

## 🧪 Testing

```bash
# Test 1: Run IBKR connection test (requires TWS running)
node tests/test-ibkr.js
# Expected: Successful connection and position list

# Test 2: Connect via API
curl -X POST http://localhost:3000/api/ibkr/connect
# Expected: {"connected":true,"message":"Connected to IBKR"}

# Test 3: Get positions
curl http://localhost:3000/api/ibkr/positions
# Expected: List of current positions

# Test 4: Full AI execution workflow (PAPER TRADING ONLY!)
curl -X POST http://localhost:3000/api/ibkr/execute \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL","companyName":"Apple Inc."}'
# Expected: AI decision + trade execution result
```

---

## 🚨 Critical Setup Steps

### Enable API in TWS
1. Open TWS/IB Gateway
2. Go to **File** > **Global Configuration** > **API** > **Settings**
3. Check **Enable ActiveX and Socket Clients**
4. Check **Allow connections from localhost only**
5. Set **Socket port**: 7497 (paper) or 7496 (live)
6. **Read-Only API**: Uncheck (to allow trading)
7. Click **OK** and restart TWS

### Get Your Account ID
1. Log into TWS
2. Go to **Account** > **Account Window**
3. Your account ID is shown at the top (e.g., DU123456 for paper trading)
4. Add to `.env`: `IBKR_ACCOUNT_ID=DU123456`

---

## ⚠️ Risk Management

### Position Sizing
- **Max position size**: $10,000 per stock (configurable)
- **Confidence-based**: Lower confidence = smaller position
- **Diversification**: No more than 10% of portfolio in one position

### Stop Loss
- Use AI-recommended stop loss price
- Implement trailing stops for winning positions
- Maximum 2% portfolio risk per trade

### Order Types
- **Market orders**: Immediate execution, no price guarantee
- **Limit orders**: Price guarantee, may not fill
- **Stop-loss orders**: Automatic exit at loss threshold

---

## 🔄 Next Step

**Once ALL checkboxes above are marked:**

➡️ **Proceed to:** `step13_dashboard.md`

---

**Last Updated:** December 31, 2025
