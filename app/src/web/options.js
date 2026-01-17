// Get ticker from URL parameter
const urlParams = new URLSearchParams(window.location.search);
let ticker = urlParams.get('ticker')?.toUpperCase() || null;

let optionChainData = null;
let currentExpiration = null;
let currentType = 'calls';
let currentPrice = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Load watchlists for autocomplete
    await loadWatchlistTickers();
    
    // Update time
    updateTime();
    setInterval(updateTime, 1000);
    
    // If ticker provided in URL, load it
    if (ticker) {
        document.getElementById('tickerInput').value = ticker;
        await loadTicker(ticker);
    }
    
    // Set up event listeners
    document.getElementById('expirationSelect').addEventListener('change', (e) => {
        currentExpiration = e.target.value;
        displayOptionChain();
    });
    
    document.getElementById('strikeRange').addEventListener('change', () => {
        displayOptionChain();
    });
    
    document.querySelectorAll('.chain-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.chain-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentType = e.target.dataset.type;
            displayOptionChain();
        });
    });
    
    document.getElementById('analyzeBtn').addEventListener('click', analyzeStrategies);
});

// Update time display
function updateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Load watchlists for autocomplete
let availableTickers = [];

async function loadWatchlistTickers() {
    try {
        const response = await fetch('/api/watchlist');
        const data = await response.json();
        
        if (data.success && data.watchlists) {
            const uniqueTickers = new Set();
            data.watchlists.forEach(wl => {
                if (wl.stocks) {
                    wl.stocks.forEach(stock => uniqueTickers.add(stock.ticker));
                }
            });
            
            availableTickers = Array.from(uniqueTickers).sort();
            setupAutocomplete();
        }
    } catch (error) {
        console.error('Error loading watchlist tickers:', error);
    }
}

function setupAutocomplete() {
    const input = document.getElementById('tickerInput');
    const list = document.getElementById('autocomplete-list');
    
    if (!input || !list) return;

    // Input event for filtering
    input.addEventListener('input', function() {
        const val = this.value.toUpperCase();
        closeAllLists();
        
        if (!val) { return false;}
        
        let matches = availableTickers.filter(t => t.startsWith(val));
        
        if (matches.length > 0) {
            list.style.display = 'block';
            matches.slice(0, 100).forEach(ticker => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.innerHTML = `<strong>${ticker.substr(0, val.length)}</strong>${ticker.substr(val.length)}`;
                item.addEventListener('click', function() {
                    input.value = ticker;
                    closeAllLists();
                    loadTickerFromInput(); // Auto-load on selection
                });
                list.appendChild(item);
            });
        }
    });

    // Focus event to show all tickers
    input.addEventListener('focus', function() {
        if (this.value === '') {
            closeAllLists();
            
            if (availableTickers.length > 0) {
                list.style.display = 'block';
                availableTickers.slice(0, 100).forEach(ticker => {
                    const item = document.createElement('div');
                    item.className = 'autocomplete-item';
                    item.textContent = ticker;
                    item.addEventListener('click', function() {
                        input.value = ticker;
                        closeAllLists();
                        loadTickerFromInput(); // Auto-load
                    });
                    list.appendChild(item);
                });
            }
        }
    });

    // Handle Enter key
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            closeAllLists();
            loadTickerFromInput();
        }
    });

    // Close when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target !== input) {
            closeAllLists();
        }
    });

    function closeAllLists() {
        list.innerHTML = '';
        list.style.display = 'none';
    }
}

// Load ticker from manual input
async function loadTickerFromInput() {
    const input = document.getElementById('tickerInput');
    const newTicker = input.value.trim().toUpperCase();
    
    if (!newTicker) {
        alert('Please enter a ticker symbol');
        return;
    }
    
    await loadTicker(newTicker);
}

// Main function to load a ticker
async function loadTicker(newTicker) {
    ticker = newTicker.toUpperCase();
    
    // Show ticker header
    document.getElementById('tickerHeader').style.display = 'block';
    document.getElementById('tickerSymbol').textContent = ticker;
    
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('ticker', ticker);
    window.history.pushState({}, '', url);
    
    // Load data
    await loadCurrentPrice();
    await loadOptionChain();
}

// Load current stock price
async function loadCurrentPrice() {
    if (!ticker) return;
    
    try {
        // Try backend API first
        const response = await fetch(`/api/market/quote/${ticker}`);
        const data = await response.json();
        
        if (data.price) {
            currentPrice = data.price;
            document.getElementById('currentPrice').textContent = `Price: $${data.price.toFixed(2)}`;
            
            if (data.change !== undefined) {
                const changePercent = data.changePercent || 0;
                const changeClass = changePercent >= 0 ? 'positive' : 'negative';
                document.getElementById('priceChange').innerHTML = 
                    `<span class="${changeClass}">Change: ${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${changePercent.toFixed(2)}%)</span>`;
            }
            
            if (data.volume) {
                document.getElementById('volume').textContent = `Volume: ${formatNumber(data.volume)}`;
            }
            return;
        }
    } catch (error) {
        console.warn('Backend API failed, trying Yahoo Finance fallback:', error);
    }
    
    // Fallback to Yahoo Finance directly
    try {
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
        const response = await fetch(yahooUrl);
        const data = await response.json();
        
        if (data.chart?.result?.[0]) {
            const result = data.chart.result[0];
            const quote = result.indicators.quote[0];
            const meta = result.meta;
            
            currentPrice = meta.regularMarketPrice;
            document.getElementById('currentPrice').textContent = `Price: $${currentPrice.toFixed(2)}`;
            
            const previousClose = meta.chartPreviousClose || meta.previousClose;
            if (previousClose) {
                const change = currentPrice - previousClose;
                const changePercent = (change / previousClose) * 100;
                const changeClass = change >= 0 ? 'positive' : 'negative';
                document.getElementById('priceChange').innerHTML = 
                    `<span class="${changeClass}">Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent.toFixed(2)}%)</span>`;
            }
            
            if (quote.volume?.[0]) {
                document.getElementById('volume').textContent = `Volume: ${formatNumber(quote.volume[0])}`;
            }
        }
    } catch (error) {
        console.error('Error loading price from Yahoo Finance:', error);
        document.getElementById('currentPrice').textContent = 'Price: N/A';
    }
}

// Load option chain from API
async function loadOptionChain() {
    if (!ticker) return;
    
    const loadingEl = document.getElementById('loadingChain');
    const errorEl = document.getElementById('errorMessage');
    const chainEl = document.getElementById('optionChain');
    const noDataEl = document.getElementById('noData');
    
    loadingEl.style.display = 'block';
    errorEl.style.display = 'none';
    chainEl.style.display = 'none';
    noDataEl.style.display = 'none';
    
    // Try backend API first
    try {
        const response = await fetch(`/api/options/chain/${ticker}`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.expirations && data.expirations.length > 0) {
                optionChainData = data;
                populateExpirations(data.expirations);
                currentExpiration = data.expirations[0];
                
                loadingEl.style.display = 'none';
                chainEl.style.display = 'block';
                
                await loadDetailedOptions();
                return;
            }
        }
    } catch (error) {
        console.warn('Backend API failed, trying Yahoo Finance fallback:', error);
    }
    
    // Fallback: Generate mock option chain with realistic data
    try {
        if (!currentPrice) {
            throw new Error('Need current price to generate option chain');
        }
        
        // Generate expirations (next 8 weeks of Fridays)
        const expirations = generateExpirations(8);
        
        // Generate strikes around current price
        const strikes = generateStrikes(currentPrice);
        
        optionChainData = {
            ticker,
            expirations: expirations.map(d => formatDateToYYYYMMDD(d)),
            strikes,
            source: 'mock'
        };
        
        populateExpirations(optionChainData.expirations);
        currentExpiration = optionChainData.expirations[0];
        
        loadingEl.style.display = 'none';
        chainEl.style.display = 'block';
        
        await loadDetailedOptions();
        
    } catch (error) {
        console.error('Error loading option chain:', error);
        loadingEl.style.display = 'none';
        errorEl.textContent = `Unable to load option data: ${error.message}. Options may not be available for this ticker.`;
        errorEl.style.display = 'block';
        noDataEl.style.display = 'block';
    }
}

// Populate expiration dropdown
function populateExpirations(expirations) {
    const select = document.getElementById('expirationSelect');
    select.innerHTML = expirations.map(exp => 
        `<option value="${exp}">${formatExpiration(exp)}</option>`
    ).join('');
}

// Load detailed option data for selected expiration
async function loadDetailedOptions() {
    if (!currentExpiration || !optionChainData) return;
    
    try {
        // Get ATM options first to determine strike range
        const atmResponse = await fetch(`/api/options/atm/${ticker}/${currentExpiration}`);
        const atmData = await atmResponse.json();
        
        if (atmData.call && atmData.put) {
            optionChainData.atmCall = atmData.call;
            optionChainData.atmPut = atmData.put;
        }
        
        displayOptionChain();
        
    } catch (error) {
        console.error('Error loading detailed options:', error);
        displayOptionChain(); // Display basic chain anyway
    }
}

// Display option chain table
function displayOptionChain() {
    if (!optionChainData || !currentExpiration) return;
    
    const content = document.getElementById('chainContent');
    const strikeRange = document.getElementById('strikeRange').value;
    
    let strikes = [...optionChainData.strikes];
    
    // Filter strikes based on range
    if (strikeRange !== 'all' && currentPrice) {
        const range = parseInt(strikeRange);
        const atmStrike = findATMStrike(currentPrice, strikes);
        const atmIndex = strikes.indexOf(atmStrike);
        
        if (atmIndex !== -1) {
            const start = Math.max(0, atmIndex - range);
            const end = Math.min(strikes.length, atmIndex + range + 1);
            strikes = strikes.slice(start, end);
        }
    }
    
    // Create table
    const isCall = currentType === 'calls';
    const html = `
        <table class="option-table">
            <thead>
                <tr>
                    <th>Strike</th>
                    <th>Bid</th>
                    <th>Ask</th>
                    <th>Last</th>
                    <th>Volume</th>
                    <th>Open Int</th>
                    <th>IV</th>
                    <th>Delta</th>
                    <th>Gamma</th>
                    <th>Theta</th>
                    <th>Vega</th>
                </tr>
            </thead>
            <tbody>
                ${strikes.map(strike => {
                    const isATM = currentPrice && Math.abs(strike - currentPrice) < 2;
                    const isITM = isCall ? (strike < currentPrice) : (strike > currentPrice);
                    
                    return `
                        <tr class="${isATM ? 'atm-strike' : ''}" data-strike="${strike}">
                            <td class="strike-price ${isITM ? 'itm' : 'otm'}">${strike.toFixed(2)}</td>
                            <td>--</td>
                            <td>--</td>
                            <td>--</td>
                            <td>--</td>
                            <td>--</td>
                            <td>--</td>
                            <td>--</td>
                            <td>--</td>
                            <td>--</td>
                            <td>--</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        <p style="font-size: 0.75rem; color: #6b7280; margin-top: 1rem;">
            Note: Live option data requires IBKR market data subscription. Showing available strikes only.
        </p>
    `;
    
    content.innerHTML = html;
}

// Analyze and recommend option strategies
async function analyzeStrategies() {
    const btn = document.getElementById('analyzeBtn');
    const strategiesEl = document.getElementById('strategies');
    const content = document.getElementById('strategiesContent');
    
    if (!optionChainData || !currentExpiration) {
        alert('Please select an expiration date first');
        return;
    }
    
    btn.disabled = true;
    btn.textContent = '🔍 Analyzing...';
    
    try {
        // Fetch AI analysis data
        const response = await fetch(`/api/ai/input/${ticker}`);
        const aiData = await response.json();
        
        // Analyze best strategies based on market conditions
        const strategies = generateStrategies(aiData, optionChainData);
        
        // Display strategies
        content.innerHTML = strategies.map(strategy => `
            <div class="strategy-card">
                <div class="strategy-header">
                    <div class="strategy-name">${strategy.name}</div>
                    <div class="strategy-score score-${strategy.scoreClass}">
                        ${strategy.score}/100
                    </div>
                </div>
                <div class="strategy-details">
                    <div class="detail-item">
                        <span class="detail-label">Market Outlook</span>
                        <span class="detail-value">${strategy.outlook}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Risk Level</span>
                        <span class="detail-value">${strategy.risk}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Max Profit</span>
                        <span class="detail-value">${strategy.maxProfit}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Max Loss</span>
                        <span class="detail-value">${strategy.maxLoss}</span>
                    </div>
                </div>
                <div class="strategy-description">
                    ${strategy.description}
                </div>
                ${strategy.legs ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                        <strong>Strategy Legs:</strong>
                        <ul style="margin: 0.5rem 0 0 1.5rem;">
                            ${strategy.legs.map(leg => `<li>${leg}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        strategiesEl.style.display = 'block';
        strategiesEl.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error analyzing strategies:', error);
        alert('Failed to analyze strategies. Please try again.');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔍 Analyze Best Strategies';
    }
}

// Generate strategy recommendations based on market conditions
function generateStrategies(aiData, optionData) {
    const strategies = [];
    const sentiment = aiData.data?.news?.sentiment?.overall || 'Neutral';
    const technicalSignal = aiData.data?.technical?.composite?.signal || 'NEUTRAL';
    const volatility = calculateImpliedVolatility(aiData);
    
    // Strategy 1: Based on bullish signals
    if (sentiment === 'Positive' || technicalSignal === 'BUY') {
        strategies.push({
            name: 'Bull Call Spread',
            score: 85,
            scoreClass: 'excellent',
            outlook: 'Bullish',
            risk: 'Limited',
            maxProfit: 'Limited (Strike Spread - Premium)',
            maxLoss: 'Premium Paid',
            description: 'Buy a call at a lower strike and sell a call at a higher strike. Best for moderate bullish outlook with limited capital.',
            legs: [
                `Buy 1 Call @ ${findATMStrike(currentPrice, optionData.strikes)} strike`,
                `Sell 1 Call @ ${findOTMStrike(currentPrice, optionData.strikes, 'call', 2)} strike`
            ]
        });
    }
    
    // Strategy 2: Based on bearish signals
    if (sentiment === 'Negative' || technicalSignal === 'SELL') {
        strategies.push({
            name: 'Bear Put Spread',
            score: 82,
            scoreClass: 'excellent',
            outlook: 'Bearish',
            risk: 'Limited',
            maxProfit: 'Limited (Strike Spread - Premium)',
            maxLoss: 'Premium Paid',
            description: 'Buy a put at a higher strike and sell a put at a lower strike. Profits from moderate downward movement.',
            legs: [
                `Buy 1 Put @ ${findATMStrike(currentPrice, optionData.strikes)} strike`,
                `Sell 1 Put @ ${findOTMStrike(currentPrice, optionData.strikes, 'put', 2)} strike`
            ]
        });
    }
    
    // Strategy 3: High volatility - Iron Condor
    if (volatility > 30) {
        const atmStrike = findATMStrike(currentPrice, optionData.strikes);
        strategies.push({
            name: 'Iron Condor',
            score: 78,
            scoreClass: 'good',
            outlook: 'Neutral (Range-bound)',
            risk: 'Limited',
            maxProfit: 'Premium Collected',
            maxLoss: 'Strike Width - Premium',
            description: 'Profit from low volatility by selling an OTM call spread and OTM put spread. Best when expecting the stock to stay within a range.',
            legs: [
                `Sell 1 Call @ ${findOTMStrike(currentPrice, optionData.strikes, 'call', 1)} strike`,
                `Buy 1 Call @ ${findOTMStrike(currentPrice, optionData.strikes, 'call', 2)} strike`,
                `Sell 1 Put @ ${findOTMStrike(currentPrice, optionData.strikes, 'put', 1)} strike`,
                `Buy 1 Put @ ${findOTMStrike(currentPrice, optionData.strikes, 'put', 2)} strike`
            ]
        });
    }
    
    // Strategy 4: Covered Call (for existing positions)
    strategies.push({
        name: 'Covered Call',
        score: 75,
        scoreClass: 'good',
        outlook: 'Neutral to Slightly Bullish',
        risk: 'Moderate (Stock ownership)',
        maxProfit: 'Premium + Stock appreciation to strike',
        maxLoss: 'Stock value - Premium',
        description: 'Own 100 shares and sell a call option. Generates income while holding stock, but caps upside potential.',
        legs: [
            `Own 100 shares of ${ticker}`,
            `Sell 1 Call @ ${findOTMStrike(currentPrice, optionData.strikes, 'call', 1)} strike`
        ]
    });
    
    // Strategy 5: Long Straddle (expecting big move)
    if (volatility < 25) {
        strategies.push({
            name: 'Long Straddle',
            score: 70,
            scoreClass: 'fair',
            outlook: 'High volatility expected',
            risk: 'Premium Paid',
            maxProfit: 'Unlimited',
            maxLoss: 'Premium Paid',
            description: 'Buy both a call and put at the same strike. Profits from large move in either direction. Best before earnings or major events.',
            legs: [
                `Buy 1 Call @ ${findATMStrike(currentPrice, optionData.strikes)} strike`,
                `Buy 1 Put @ ${findATMStrike(currentPrice, optionData.strikes)} strike`
            ]
        });
    }
    
    return strategies;
}

// Helper functions
function findATMStrike(price, strikes) {
    if (!price || !strikes.length) return strikes[0];
    return strikes.reduce((prev, curr) => 
        Math.abs(curr - price) < Math.abs(prev - price) ? curr : prev
    );
}

function findOTMStrike(price, strikes, type, distance) {
    if (!price || !strikes.length) return strikes[0];
    const atmStrike = findATMStrike(price, strikes);
    const atmIndex = strikes.indexOf(atmStrike);
    
    if (type === 'call') {
        return strikes[Math.min(strikes.length - 1, atmIndex + distance)];
    } else {
        return strikes[Math.max(0, atmIndex - distance)];
    }
}

function calculateImpliedVolatility(aiData) {
    // Simple volatility estimation based on technical indicators
    const vix = aiData.data?.marketSentiment?.vix?.value || 20;
    return vix;
}

function formatExpiration(expStr) {
    // Format YYYYMMDD to readable date
    if (expStr.length === 8) {
        const year = expStr.substring(0, 4);
        const month = expStr.substring(4, 6);
        const day = expStr.substring(6, 8);
        const date = new Date(`${year}-${month}-${day}`);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return expStr;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// Generate next N option expiration dates (Fridays)
function generateExpirations(count) {
    const dates = [];
    const today = new Date();
    let current = new Date(today);
    
    // Find next Friday
    while (current.getDay() !== 5) {
        current.setDate(current.getDate() + 1);
    }
    
    for (let i = 0; i < count; i++) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 7); // Next week
    }
    
    return dates;
}

// Generate strikes around current price
function generateStrikes(price) {
    const strikes = [];
    const increment = price < 50 ? 1 : (price < 200 ? 2.5 : 5);
    const range = 20; // Number of strikes above and below
    
    // Round price to nearest increment
    const atmStrike = Math.round(price / increment) * increment;
    
    for (let i = -range; i <= range; i++) {
        strikes.push(atmStrike + (i * increment));
    }
    
    return strikes.filter(s => s > 0);
}

// Format date to YYYYMMDD
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

