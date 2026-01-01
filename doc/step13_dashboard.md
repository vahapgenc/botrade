# STEP 13: Dashboard UI

## ⚠️ BLOCKING REQUIREMENTS
**PREREQUISITES (MUST BE COMPLETE):**
- ✅ STEP 1-12 completed
- ✅ All API endpoints operational
- ✅ IBKR integration working
- ✅ Database populated with test data

**THIS IS THE FINAL IMPLEMENTATION STEP**

---

## 🎯 Objectives
1. Create responsive HTML dashboard
2. Build real-time data visualization
3. Display market sentiment indicators
4. Show AI decision history
5. Display current portfolio positions
6. Show trade history with P&L
7. Add performance charts
8. Implement auto-refresh

---

## ⏱️ Estimated Duration
**4-5 hours**

---

## 📝 Implementation Steps

### 13.1 Create Public Directory Structure
```bash
mkdir -p public/css
mkdir -p public/js
```

### 13.2 Create Main Dashboard HTML
Create `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BoTrade - AI Trading Dashboard</title>
    <link rel="stylesheet" href="/css/dashboard.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <h1>🤖 BoTrade AI Trading Dashboard</h1>
            <div class="header-stats">
                <div class="stat-card">
                    <span class="label">System Status</span>
                    <span class="value" id="systemStatus">Loading...</span>
                </div>
                <div class="stat-card">
                    <span class="label">Last Update</span>
                    <span class="value" id="lastUpdate">--:--:--</span>
                </div>
            </div>
        </header>

        <!-- Market Sentiment Section -->
        <section class="section">
            <h2>📊 Market Sentiment</h2>
            <div class="sentiment-grid">
                <div class="sentiment-card">
                    <h3>Fear & Greed Index</h3>
                    <div class="sentiment-value" id="fearGreed">Loading...</div>
                    <div class="sentiment-label" id="fearGreedLabel">--</div>
                </div>
                <div class="sentiment-card">
                    <h3>VIX Level</h3>
                    <div class="sentiment-value" id="vix">Loading...</div>
                    <div class="sentiment-label" id="vixLabel">--</div>
                </div>
                <div class="sentiment-card">
                    <h3>Composite Score</h3>
                    <div class="sentiment-value" id="composite">Loading...</div>
                    <div class="sentiment-label" id="compositeLabel">--</div>
                </div>
            </div>
        </section>

        <!-- AI Decisions Section -->
        <section class="section">
            <h2>🤖 Recent AI Decisions</h2>
            <div class="controls">
                <input type="text" id="tickerInput" placeholder="Ticker (e.g., AAPL)">
                <input type="text" id="companyInput" placeholder="Company Name">
                <button onclick="analyzeStock()" class="btn-primary">Analyze Stock</button>
            </div>
            <div id="decisionsContainer">
                <p class="loading">Loading recent decisions...</p>
            </div>
        </section>

        <!-- Portfolio Positions -->
        <section class="section">
            <h2>💼 Current Positions</h2>
            <div class="portfolio-summary">
                <div class="summary-card">
                    <span class="label">Total Value</span>
                    <span class="value" id="totalValue">$0.00</span>
                </div>
                <div class="summary-card">
                    <span class="label">Total P&L</span>
                    <span class="value" id="totalPL">$0.00</span>
                </div>
                <div class="summary-card">
                    <span class="label">Open Positions</span>
                    <span class="value" id="positionCount">0</span>
                </div>
            </div>
            <div id="positionsTable">
                <p class="loading">Loading positions...</p>
            </div>
        </section>

        <!-- Trade History -->
        <section class="section">
            <h2>📈 Trade History</h2>
            <div id="tradesTable">
                <p class="loading">Loading trade history...</p>
            </div>
        </section>

        <!-- Performance Chart -->
        <section class="section">
            <h2>📉 Performance</h2>
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </section>
    </div>

    <script src="/js/dashboard.js"></script>
</body>
</html>
```

### 13.3 Create Dashboard Styles
Create `public/css/dashboard.css`:

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #333;
    line-height: 1.6;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

.header {
    background: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    margin-bottom: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h1 {
    font-size: 2.5rem;
    color: #667eea;
}

.header-stats {
    display: flex;
    gap: 20px;
}

.stat-card {
    display: flex;
    flex-direction: column;
    text-align: right;
}

.stat-card .label {
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.stat-card .value {
    font-size: 1.25rem;
    font-weight: bold;
    color: #333;
}

.section {
    background: white;
    padding: 30px;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    margin-bottom: 30px;
}

.section h2 {
    margin-bottom: 20px;
    color: #667eea;
    font-size: 1.75rem;
}

/* Sentiment Cards */
.sentiment-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.sentiment-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 25px;
    border-radius: 10px;
    text-align: center;
}

.sentiment-card h3 {
    font-size: 1rem;
    margin-bottom: 15px;
    opacity: 0.9;
}

.sentiment-value {
    font-size: 3rem;
    font-weight: bold;
    margin-bottom: 10px;
}

.sentiment-label {
    font-size: 1.125rem;
    opacity: 0.9;
}

/* Controls */
.controls {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.controls input {
    flex: 1;
    padding: 12px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
}

.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 30px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s;
}

.btn-primary:hover {
    transform: translateY(-2px);
}

/* Decision Cards */
.decision-card {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 10px;
    margin-bottom: 15px;
    border-left: 5px solid #667eea;
}

.decision-card.BUY {
    border-left-color: #10b981;
}

.decision-card.SELL {
    border-left-color: #ef4444;
}

.decision-card.HOLD {
    border-left-color: #f59e0b;
}

.decision-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.decision-ticker {
    font-size: 1.5rem;
    font-weight: bold;
}

.decision-action {
    padding: 8px 20px;
    border-radius: 20px;
    font-weight: bold;
    font-size: 1rem;
}

.decision-action.BUY {
    background: #10b981;
    color: white;
}

.decision-action.SELL {
    background: #ef4444;
    color: white;
}

.decision-action.HOLD {
    background: #f59e0b;
    color: white;
}

.decision-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-bottom: 15px;
}

.detail-item {
    display: flex;
    flex-direction: column;
}

.detail-label {
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
}

.detail-value {
    font-size: 1.125rem;
    font-weight: bold;
    color: #333;
}

.decision-reasoning {
    background: white;
    padding: 15px;
    border-radius: 8px;
    margin-top: 15px;
}

/* Tables */
table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

table th {
    background: #667eea;
    color: white;
    padding: 15px;
    text-align: left;
    font-weight: 600;
}

table td {
    padding: 12px 15px;
    border-bottom: 1px solid #e5e7eb;
}

table tr:hover {
    background: #f8f9fa;
}

.positive {
    color: #10b981;
    font-weight: bold;
}

.negative {
    color: #ef4444;
    font-weight: bold;
}

/* Portfolio Summary */
.portfolio-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.summary-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.summary-card .label {
    font-size: 0.875rem;
    opacity: 0.9;
    margin-bottom: 10px;
}

.summary-card .value {
    font-size: 2rem;
    font-weight: bold;
}

/* Loading */
.loading {
    text-align: center;
    color: #666;
    padding: 40px;
    font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
    .header {
        flex-direction: column;
        gap: 20px;
    }

    .header h1 {
        font-size: 1.75rem;
    }

    .sentiment-grid {
        grid-template-columns: 1fr;
    }

    .controls {
        flex-direction: column;
    }

    table {
        font-size: 0.875rem;
    }

    table th, table td {
        padding: 8px;
    }
}
```

### 13.4 Create Dashboard JavaScript
Create `public/js/dashboard.js`:

```javascript
const API_BASE = window.location.origin;
let refreshInterval;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard initializing...');
    loadAllData();
    startAutoRefresh();
});

// Auto-refresh every 60 seconds
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        loadAllData();
    }, 60000); // 60 seconds
}

async function loadAllData() {
    try {
        updateLastUpdate();
        await Promise.all([
            loadSystemStatus(),
            loadMarketSentiment(),
            loadRecentDecisions(),
            loadPortfolio(),
            loadTradeHistory()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateLastUpdate() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

async function loadSystemStatus() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        document.getElementById('systemStatus').textContent = 
            data.status === 'healthy' ? '✅ Online' : '❌ Offline';
        document.getElementById('systemStatus').className = 
            data.status === 'healthy' ? 'value positive' : 'value negative';
    } catch (error) {
        document.getElementById('systemStatus').textContent = '❌ Offline';
        document.getElementById('systemStatus').className = 'value negative';
    }
}

async function loadMarketSentiment() {
    try {
        const response = await fetch(`${API_BASE}/api/sentiment`);
        const data = await response.json();
        
        // Fear & Greed
        document.getElementById('fearGreed').textContent = data.fearGreed.value;
        document.getElementById('fearGreedLabel').textContent = data.fearGreed.label;
        
        // VIX
        document.getElementById('vix').textContent = data.vix.value.toFixed(2);
        document.getElementById('vixLabel').textContent = data.vix.label;
        
        // Composite
        document.getElementById('composite').textContent = data.composite.score;
        document.getElementById('compositeLabel').textContent = data.composite.interpretation;
        
    } catch (error) {
        console.error('Error loading sentiment:', error);
    }
}

async function loadRecentDecisions() {
    try {
        const response = await fetch(`${API_BASE}/api/ai/history?limit=5`);
        const data = await response.json();
        
        const container = document.getElementById('decisionsContainer');
        
        if (data.decisions.length === 0) {
            container.innerHTML = '<p class="loading">No decisions yet. Analyze a stock to get started!</p>';
            return;
        }
        
        container.innerHTML = data.decisions.map(decision => `
            <div class="decision-card ${decision.decision}">
                <div class="decision-header">
                    <span class="decision-ticker">${decision.ticker}</span>
                    <span class="decision-action ${decision.decision}">${decision.decision}</span>
                </div>
                <div class="decision-details">
                    <div class="detail-item">
                        <span class="detail-label">Confidence</span>
                        <span class="detail-value">${decision.confidence}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Current Price</span>
                        <span class="detail-value">$${decision.currentPrice.toFixed(2)}</span>
                    </div>
                    ${decision.targetPrice ? `
                    <div class="detail-item">
                        <span class="detail-label">Target</span>
                        <span class="detail-value">$${decision.targetPrice.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="detail-item">
                        <span class="detail-label">Time Horizon</span>
                        <span class="detail-value">${decision.timeHorizon.replace('_', ' ')}</span>
                    </div>
                </div>
                <div class="decision-reasoning">
                    <strong>Reasoning:</strong><br>
                    ${decision.reasoning}
                </div>
                <small style="color: #666; margin-top: 10px; display: block;">
                    ${new Date(decision.createdAt).toLocaleString()}
                </small>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading decisions:', error);
        document.getElementById('decisionsContainer').innerHTML = 
            '<p class="loading">Error loading decisions</p>';
    }
}

async function loadPortfolio() {
    try {
        const response = await fetch(`${API_BASE}/api/portfolio/positions`);
        const data = await response.json();
        
        // Update summary
        const totalValue = data.positions.reduce((sum, p) => sum + (p.quantity * p.currentPrice), 0);
        const totalCost = data.positions.reduce((sum, p) => sum + (p.quantity * p.averagePrice), 0);
        const totalPL = totalValue - totalCost;
        
        document.getElementById('totalValue').textContent = `$${totalValue.toFixed(2)}`;
        document.getElementById('totalPL').textContent = `$${totalPL.toFixed(2)}`;
        document.getElementById('totalPL').className = totalPL >= 0 ? 'value positive' : 'value negative';
        document.getElementById('positionCount').textContent = data.positions.length;
        
        // Build table
        const container = document.getElementById('positionsTable');
        
        if (data.positions.length === 0) {
            container.innerHTML = '<p class="loading">No positions yet</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Ticker</th>
                        <th>Quantity</th>
                        <th>Avg Price</th>
                        <th>Current Price</th>
                        <th>Value</th>
                        <th>P&L</th>
                        <th>P&L %</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.positions.map(pos => {
                        const value = pos.quantity * pos.currentPrice;
                        const cost = pos.quantity * pos.averagePrice;
                        const pl = value - cost;
                        const plPct = (pl / cost) * 100;
                        
                        return `
                            <tr>
                                <td><strong>${pos.ticker}</strong></td>
                                <td>${pos.quantity}</td>
                                <td>$${pos.averagePrice.toFixed(2)}</td>
                                <td>$${pos.currentPrice.toFixed(2)}</td>
                                <td>$${value.toFixed(2)}</td>
                                <td class="${pl >= 0 ? 'positive' : 'negative'}">
                                    ${pl >= 0 ? '+' : ''}$${pl.toFixed(2)}
                                </td>
                                <td class="${plPct >= 0 ? 'positive' : 'negative'}">
                                    ${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Error loading portfolio:', error);
    }
}

async function loadTradeHistory() {
    try {
        const response = await fetch(`${API_BASE}/api/trading/history?limit=10`);
        const data = await response.json();
        
        const container = document.getElementById('tradesTable');
        
        if (data.trades.length === 0) {
            container.innerHTML = '<p class="loading">No trades yet</p>';
            return;
        }
        
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Ticker</th>
                        <th>Action</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.trades.map(trade => `
                        <tr>
                            <td>${new Date(trade.executedAt).toLocaleDateString()}</td>
                            <td><strong>${trade.ticker}</strong></td>
                            <td class="${trade.action === 'BUY' ? 'positive' : 'negative'}">
                                ${trade.action}
                            </td>
                            <td>${trade.quantity}</td>
                            <td>$${trade.price.toFixed(2)}</td>
                            <td>$${trade.totalValue.toFixed(2)}</td>
                            <td>${trade.confidence}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
    } catch (error) {
        console.error('Error loading trades:', error);
    }
}

// Analyze stock button
async function analyzeStock() {
    const ticker = document.getElementById('tickerInput').value.toUpperCase();
    const companyName = document.getElementById('companyInput').value;
    
    if (!ticker || !companyName) {
        alert('Please enter both ticker and company name');
        return;
    }
    
    const container = document.getElementById('decisionsContainer');
    container.innerHTML = '<p class="loading">Analyzing... This may take 30-60 seconds...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/api/ai/decide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, companyName })
        });
        
        const decision = await response.json();
        
        // Reload decisions to show the new one
        await loadRecentDecisions();
        
        // Clear inputs
        document.getElementById('tickerInput').value = '';
        document.getElementById('companyInput').value = '';
        
    } catch (error) {
        console.error('Error analyzing stock:', error);
        container.innerHTML = '<p class="loading">Error analyzing stock. Please try again.</p>';
    }
}
```

### 13.5 Enable Static File Serving
Update `src/api/server.js`:

```javascript
// Add this line before your routes
app.use(express.static('public'));

// Add this route for the root path
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: 'public' });
});
```

### 13.6 Update Docker to Expose Dashboard
Update `docker-compose.yml` (if needed - port 3000 should already be exposed):

```yaml
  app:
    ports:
      - "3000:3000"  # Dashboard accessible at http://localhost:3000
```

---

## ✅ Completion Checklist

**FINAL STEP - Verify ALL items:**

- [ ] `public/` directory created
- [ ] `public/index.html` created
- [ ] `public/css/dashboard.css` created
- [ ] `public/js/dashboard.js` created
- [ ] Static file serving enabled in server.js
- [ ] Dashboard loads at http://localhost:3000
- [ ] Market sentiment displays correctly
- [ ] AI decisions load and display
- [ ] Portfolio positions display
- [ ] Trade history displays
- [ ] "Analyze Stock" button works
- [ ] Auto-refresh working (every 60s)
- [ ] Responsive design works on mobile

---

## 🧪 Testing

```bash
# Test 1: Access dashboard
Open browser: http://localhost:3000
# Expected: Beautiful dashboard with all sections loading

# Test 2: Test market sentiment
# Expected: Fear & Greed, VIX, and composite score display

# Test 3: Analyze a stock
# Enter: AAPL, Apple Inc.
# Click "Analyze Stock"
# Expected: AI decision appears after 30-60 seconds

# Test 4: Check portfolio
# Expected: If positions exist, they display with P&L

# Test 5: Test auto-refresh
# Wait 60 seconds
# Expected: "Last Update" time changes, data refreshes
```

---

## 🎨 Dashboard Features

### Real-Time Data
- Market sentiment (Fear & Greed, VIX)
- AI decisions with reasoning
- Portfolio positions with P&L
- Trade history

### Interactive Features
- Analyze any stock on-demand
- Auto-refresh every 60 seconds
- Responsive design (mobile-friendly)
- Color-coded decisions (BUY=green, SELL=red, HOLD=orange)

### Performance Metrics
- Total portfolio value
- Total P&L (profit/loss)
- Position count
- Per-position P&L percentage

---

## 🚀 Deployment Options

### Local (Current Setup)
```
http://localhost:3000
```

### Production Deployment
1. **Heroku**
   ```bash
   heroku create botrade-app
   heroku addons:create heroku-postgresql
   heroku addons:create heroku-redis
   git push heroku main
   ```

2. **AWS EC2**
   - Deploy Docker containers
   - Use RDS for PostgreSQL
   - Use ElastiCache for Redis
   - Add load balancer

3. **DigitalOcean**
   - Use App Platform
   - Connect to Managed PostgreSQL
   - Connect to Managed Redis

---

## 🎉 CONGRATULATIONS!

**You've completed all 13 steps of the BoTrade AI Trading Bot!**

### What You've Built:
✅ Express.js REST API with 8 endpoints  
✅ PostgreSQL database with Prisma ORM  
✅ Redis caching layer with fallback  
✅ Winston logging with rotation  
✅ Market sentiment analysis (VIX + Fear & Greed)  
✅ Technical indicators (MACD, RSI, Bollinger Bands)  
✅ Market data fetching from FMP API  
✅ CAN SLIM fundamental analysis  
✅ News sentiment analysis with NewsAPI  
✅ OpenAI GPT-4 AI decision engine  
✅ IBKR integration for order execution  
✅ Real-time dashboard with auto-refresh  

### Next Steps:
1. **Test thoroughly** with paper trading
2. **Fine-tune** AI prompts and indicators
3. **Backtest** strategies with historical data
4. **Monitor** performance and costs
5. **Scale** when ready for production

---

## 📚 Additional Enhancements (Optional)

### Advanced Features
- [ ] Add backtesting module
- [ ] Implement stop-loss automation
- [ ] Add email/SMS alerts
- [ ] Create mobile app (React Native)
- [ ] Add multi-timeframe analysis
- [ ] Implement portfolio rebalancing
- [ ] Add tax reporting export
- [ ] Create strategy comparison tool

### Machine Learning
- [ ] Train custom sentiment model
- [ ] Implement price prediction
- [ ] Add pattern recognition
- [ ] Use reinforcement learning

### Infrastructure
- [ ] Add Kubernetes deployment
- [ ] Implement CI/CD pipeline
- [ ] Add monitoring (Prometheus/Grafana)
- [ ] Implement A/B testing
- [ ] Add rate limiting
- [ ] Implement JWT authentication

---

## 📞 Support & Resources

### Documentation
- **Project Plan**: `project_plan.md`
- **All Steps**: `doc/step*.md` (13 guides)
- **Implementation**: `IMPLEMENTATION_GUIDE.md`

### APIs Used
- FMP API: https://financialmodelingprep.com
- NewsAPI: https://newsapi.org
- OpenAI: https://platform.openai.com
- IBKR API: https://interactivebrokers.github.io

### Community
- Create issues on GitHub for questions
- Share your results and improvements
- Contribute enhancements back

---

**Last Updated:** December 31, 2025

**🎊 Happy Trading! Remember: Past performance does not guarantee future results. 🎊**
