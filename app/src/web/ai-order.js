// AI Order Assistant - State Management
let currentStep = 1;
let stockData = {};
let analysisData = {};
let newsData = {};
let aiData = {};
let portfolioData = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPortfolioData();
    loadWatchlistTickers();
    
    // Stock symbol input handler
    document.getElementById('stockSymbol').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            fetchStockInfo();
        }
    });

    // Order quantity change handler
    document.getElementById('orderQuantity').addEventListener('input', updateOrderValue);
    
    // Order type change handler
    document.getElementById('orderType').addEventListener('change', toggleLimitPrice);
});

// Step Navigation
function nextStep() {
    if (currentStep === 1) {
        fetchStockInfo();
    } else if (currentStep === 2) {
        goToStep(currentStep + 1);
        fetchNewsData();
    } else if (currentStep === 3 || currentStep === 4) {
        goToStep(currentStep + 1);
    }
}

function previousStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

function goToStep(step) {
    // Hide all panels
    document.querySelectorAll('.step-panel').forEach(panel => panel.classList.remove('active'));
    
    // Show target panel
    document.getElementById(`step${step}`).classList.add('active');
    
    // Update wizard steps
    document.querySelectorAll('.wizard-step').forEach((wizardStep, index) => {
        wizardStep.classList.remove('active');
        if (index + 1 < step) {
            wizardStep.classList.add('completed');
        } else if (index + 1 === step) {
            wizardStep.classList.add('active');
        } else {
            wizardStep.classList.remove('completed');
        }
    });
    
    currentStep = step;
    
    // Update buttons
    document.getElementById('prevBtn').disabled = (step === 1);
    document.getElementById('nextBtn').style.display = (step === 5) ? 'none' : 'inline-block';
    document.getElementById('executeBtn').style.display = (step === 5) ? 'inline-block' : 'none';
}

// Step 1: Fetch Stock Info
async function fetchStockInfo() {
    const symbol = document.getElementById('stockSymbol').value.trim().toUpperCase();
    
    if (!symbol) {
        alert('Please enter a stock symbol');
        return;
    }
    
    document.getElementById('step1Loading').classList.add('active');
    document.getElementById('stockInfo').style.display = 'none';
    
    try {
        const response = await fetch(`/api/ai/input/${symbol}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data && data.status && data.status.market === 'success' && data.data && data.data.market) {
            stockData = {
                ticker: symbol,
                ...data.data.market
            };
            
            // Display stock info
            document.getElementById('stockName').textContent = symbol;
            document.getElementById('stockPrice').textContent = `$${stockData.price.toFixed(2)}`;
            document.getElementById('stockOpen').textContent = `$${stockData.open.toFixed(2)}`;
            document.getElementById('stockHigh').textContent = `$${stockData.high.toFixed(2)}`;
            document.getElementById('stockLow').textContent = `$${stockData.low.toFixed(2)}`;
            document.getElementById('stockVolume').textContent = stockData.volume.toLocaleString();
            
            // Fetch market cap from fundamentals if available
            if (data.data.fundamentals && data.data.fundamentals.marketCap) {
                document.getElementById('stockMarketCap').textContent = `$${(data.data.fundamentals.marketCap / 1e9).toFixed(2)}B`;
            }
            
            document.getElementById('stockInfo').style.display = 'block';
            
            // Store full data for analysis
            analysisData = data.data;
            
            // Move to next step and fetch analysis
            goToStep(2);
            displayAnalysis();
            
        } else {
            console.error('API Response Data:', data);
            let errorMsg = 'Market data unavailable or incomplete.';
            if (data && data.data && data.data.market && data.data.market.error) {
                errorMsg = data.data.market.error;
            } else if (data && data.error) {
                errorMsg = data.error;
            }
            alert(`Failed to fetch stock data for ${symbol}.\nReason: ${errorMsg}`);
        }
    } catch (error) {
        console.error('Error fetching stock info:', error);
        alert(`Error: ${error.message}`);
    } finally {
        document.getElementById('step1Loading').classList.remove('active');
    }
}

// Step 2: Display Analysis
function displayAnalysis() {
    const indicatorsGrid = document.getElementById('indicatorsGrid');
    const fundamentalsGrid = document.getElementById('fundamentalsGrid');
    
    indicatorsGrid.innerHTML = '';
    fundamentalsGrid.innerHTML = '';
    
    // Display Technical Indicators
    if (analysisData.technicals) {
        const technicals = analysisData.technicals;
        
        // RSI
        if (technicals.rsi) {
            const val = technicals.rsi.value != null ? technicals.rsi.value.toFixed(2) : 'N/A';
            indicatorsGrid.innerHTML += createIndicatorCard('RSI', val, getSignalClass(technicals.rsi.signal));
        } else {
            indicatorsGrid.innerHTML += createIndicatorCard('RSI', 'N/A', 'signal-neutral');
        }
        
        // MACD
        if (technicals.macd) {
            const val = technicals.macd.histogram != null ? technicals.macd.histogram.toFixed(2) : 'N/A';
            indicatorsGrid.innerHTML += createIndicatorCard('MACD', val, getSignalClass(technicals.macd.signal));
        } else {
             indicatorsGrid.innerHTML += createIndicatorCard('MACD', 'N/A', 'signal-neutral');
        }
        
        // Moving Averages
        // Check technicals.movingAverages first (structure from ai.js)
        const ma = technicals.movingAverages || {};
        const sma50 = ma.sma50;
        const sma200 = ma.sma200;
            
        if (sma50 && sma200) {
            const signal = sma50 > sma200 ? 'BULLISH' : 'BEARISH';
            const val = sma50 != null ? `$${sma50.toFixed(2)}` : 'N/A';
            indicatorsGrid.innerHTML += createIndicatorCard('MA Trend', `SMA50: ${val}`, getSignalClass(signal));
        } else {
             // Fallback for old structure or missing data
             if (technicals.sma_50 && technicals.sma_200) {
                const signal = technicals.sma_50.value > technicals.sma_200.value ? 'BULLISH' : 'BEARISH';
                indicatorsGrid.innerHTML += createIndicatorCard('MA Trend', `SMA50: $${technicals.sma_50.value.toFixed(2)}`, getSignalClass(signal));
             } else {
                indicatorsGrid.innerHTML += createIndicatorCard('MA Trend', 'N/A', 'signal-neutral');
             }
        }
        
        // Bollinger Bands
        if (technicals.bollinger) {
            const position = technicals.bollinger.position || 'N/A';
            indicatorsGrid.innerHTML += createIndicatorCard('Bollinger', `${position}`, getSignalClass(technicals.bollinger.signal));
        } else {
            indicatorsGrid.innerHTML += createIndicatorCard('Bollinger', 'N/A', 'signal-neutral');
        }
    } else {
        indicatorsGrid.innerHTML = '<div class="info-item">No technical analysis available</div>';
    }
    
    // Display Fundamentals
    if (analysisData.fundamentals) {
        const fund = analysisData.fundamentals;
        
        fundamentalsGrid.innerHTML = `
            <div class="info-item"><span class="info-label">P/E Ratio</span><span class="info-value">${fund.pe != null ? fund.pe.toFixed(2) : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">EPS</span><span class="info-value">${fund.eps != null ? '$' + fund.eps.toFixed(2) : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">EPS Growth</span><span class="info-value">${fund.epsGrowth != null ? (fund.epsGrowth * 100).toFixed(2) + '%' : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Revenue Growth</span><span class="info-value">${fund.revenueGrowth != null ? (fund.revenueGrowth * 100).toFixed(2) + '%' : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Net Margin</span><span class="info-value">${fund.netMargin != null ? (fund.netMargin * 100).toFixed(2) + '%' : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">CAN SLIM Score</span><span class="info-value">${fund.canSlimScore != null ? fund.canSlimScore + '/100' : 'N/A'}</span></div>
        `;
    } else {
        fundamentalsGrid.innerHTML = '<div class="info-item">No fundamental analysis available</div>';
    }
    
    document.getElementById('step2Loading').classList.remove('active');
    document.getElementById('analysisResults').style.display = 'block';
}

function createIndicatorCard(name, value, signalClass) {
    const signalText = signalClass.includes('bullish') ? 'Bullish' : signalClass.includes('bearish') ? 'Bearish' : 'Neutral';
    return `
        <div class="indicator-card">
            <h4>${name}</h4>
            <div class="indicator-value">${value}</div>
            <span class="indicator-signal ${signalClass}">${signalText}</span>
        </div>
    `;
}

function getSignalClass(signal) {
    if (!signal) return 'signal-neutral';
    const s = signal.toString().toUpperCase();
    if (s.includes('BULL') || s.includes('BUY') || s.includes('STRONG')) return 'signal-bullish';
    if (s.includes('BEAR') || s.includes('SELL') || s.includes('WEAK')) return 'signal-bearish';
    return 'signal-neutral';
}

// Step 3: Fetch News
async function fetchNewsData() {
    document.getElementById('step3Loading').classList.add('active');
    document.getElementById('newsResults').style.display = 'none';
    
    // Optimization: Use data fetched in Step 1 if available
    if (analysisData && analysisData.news) {
        console.log('Using pre-fetched news data');
        renderNewsResults(analysisData.news);
        document.getElementById('step3Loading').classList.remove('active');
        document.getElementById('newsResults').style.display = 'block';
        return;
    }

    try {
        const symbol = stockData.ticker;
        const response = await fetch(`/api/ai/input/${symbol}`);
        const data = await response.json();
        
        if (data.data && data.data.news) {
            newsData = data.data.news;
            // Update analysisData to cache this
            if (analysisData) {
                analysisData.news = newsData;
            }
            renderNewsResults(newsData);
            document.getElementById('newsResults').style.display = 'block';
        } else {
            document.getElementById('newsList').innerHTML = '<p style="text-align: center; color: #6b7280;">No news data available</p>';
            document.getElementById('newsResults').style.display = 'block';
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        document.getElementById('newsList').innerHTML = '<p style="text-align: center; color: #dc2626;">Error loading news data</p>';
        document.getElementById('newsResults').style.display = 'block';
    } finally {
        document.getElementById('step3Loading').classList.remove('active');
    }
}

function renderNewsResults(data) {
    if (!data) return;
    
    // Display sentiment
    document.getElementById('newsSentiment').textContent = data.sentiment || 'Neutral';
    document.getElementById('sentimentScore').textContent = data.sentimentScore ? data.sentimentScore.toFixed(2) : '0.00';
    document.getElementById('newsCount').textContent = data.articles ? data.articles.length : 0;
    
    // Display news list
    const newsList = document.getElementById('newsList');
    newsList.innerHTML = '';
    
    if (data.articles && data.articles.length > 0) {
        data.articles.slice(0, 50).forEach(article => {
            // Check for valid title and url
            if (!article.title) return;
            
            const source = article.source || 'Unknown Source';
            const dateStr = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() + ' ' + new Date(article.publishedAt).toLocaleTimeString() : '';
            const url = article.url || '#';
            
            newsList.innerHTML += `
                <div class="news-item" style="padding: 10px; border-bottom: 1px solid #eee;">
                    <a href="${url}" target="_blank" class="news-title" style="font-weight: 600; color: #2563eb; text-decoration: none; display: block; margin-bottom: 4px;">${article.title}</a>
                    <div class="news-meta" style="font-size: 0.85rem; color: #6b7280;">
                        ${source} • ${dateStr}
                    </div>
                </div>
            `;
        });
    } else {
        newsList.innerHTML = '<p style="text-align: center; color: #6b7280;">No recent news articles found</p>';
    }
}

// Step 4: AI Analysis
async function runAIAnalysis() {
    document.getElementById('runAIBtn').disabled = true;
    document.getElementById('step4Loading').classList.add('active');
    document.getElementById('aiResults').style.display = 'none';
    
    try {
        const symbol = stockData.ticker;
        
        // Get portfolio data for AI context
        const accountResponse = await fetch('/api/trading/account');
        const accountData = await accountResponse.json();
        
        const positionsResponse = await fetch('/api/trading/positions');
        const positionsData = await positionsResponse.json();
        
        // Make AI decision
        const response = await fetch('/api/ai/decide', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticker: symbol,
                companyName: stockData.companyName || symbol, // Use symbol if company name is missing
                portfolio: {
                    totalBudget: accountData.netLiquidation || 100000,
                    availableCash: accountData.cashBalance || 100000,
                    positions: positionsData.positions || []
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.decision) {
            aiData = data.decision;
            
            // Display AI recommendation
            document.getElementById('aiDecision').textContent = `${aiData.action} ${symbol}`;
            document.getElementById('aiConfidence').textContent = aiData.confidence;
            document.getElementById('confidenceFill').style.width = `${aiData.confidence}%`;
            
            if (aiData.quantity) document.getElementById('aiQuantity').textContent = aiData.quantity;
            if (aiData.entry_price) document.getElementById('aiEntry').textContent = aiData.entry_price.toFixed(2);
            if (aiData.stop_loss) document.getElementById('aiStopLoss').textContent = aiData.stop_loss.toFixed(2);
            if (aiData.take_profit) document.getElementById('aiTakeProfit').textContent = aiData.take_profit.toFixed(2);
            
            // Display reasoning
            const reasoning = document.getElementById('aiReasoning');
            reasoning.innerHTML = '';
            
            if (aiData.primary_reasons && aiData.primary_reasons.length > 0) {
                reasoning.innerHTML += '<strong>Primary Reasons:</strong><ul>';
                aiData.primary_reasons.forEach(reason => {
                    reasoning.innerHTML += `<li>${reason}</li>`;
                });
                reasoning.innerHTML += '</ul>';
            }
            
            if (aiData.risks && aiData.risks.length > 0) {
                reasoning.innerHTML += '<strong style="margin-top: 1rem; display: block;">Risks:</strong><ul>';
                aiData.risks.forEach(risk => {
                    reasoning.innerHTML += `<li>${risk}</li>`;
                });
                reasoning.innerHTML += '</ul>';
            }
            
            document.getElementById('aiResults').style.display = 'block';
            
            // Pre-fill order form with AI recommendations
            if (aiData.action) {
                document.getElementById('orderAction').value = aiData.action;
            }
            if (aiData.quantity) {
                document.getElementById('orderQuantity').value = aiData.quantity;
            }
            if (aiData.confidence) {
                document.getElementById('confidence').value = aiData.confidence;
            }
        }
    } catch (error) {
        console.error('Error running AI analysis:', error);
        alert('Error getting AI recommendation');
    } finally {
        document.getElementById('step4Loading').classList.remove('active');
        document.getElementById('runAIBtn').disabled = false;
    }
}

// Step 5: Execute Order
async function loadPortfolioData() {
    try {
        const response = await fetch('/api/trading/account');
        const data = await response.json();
        
        portfolioData = {
            total: data.netLiquidation || 100000,
            cash: data.cashBalance || 100000,
            maxOrder: (data.netLiquidation || 100000) * 0.25
        };
        
        document.getElementById('portfolioTotal').textContent = `$${portfolioData.total.toLocaleString()}`;
        document.getElementById('portfolioCash').textContent = `$${portfolioData.cash.toLocaleString()}`;
        document.getElementById('maxOrderValue').textContent = `$${portfolioData.maxOrder.toLocaleString()}`;
        
    } catch (error) {
        console.error('Error loading portfolio data:', error);
    }
}

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
    const input = document.getElementById('stockSymbol');
    const list = document.getElementById('autocomplete-list');
    
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
                });
                list.appendChild(item);
            });
        }
    });

    // Focus event to show all tickers
    input.addEventListener('focus', function() {
        if (this.value === '') {
            closeAllLists();
            list.style.display = 'block';
            availableTickers.slice(0, 100).forEach(ticker => {
                const item = document.createElement('div');
                item.className = 'autocomplete-item';
                item.textContent = ticker;
                item.addEventListener('click', function() {
                    input.value = ticker;
                    closeAllLists();
                });
                list.appendChild(item);
            });
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

// Function selectTicker removed as it is now native functionality

function updateOrderValue() {
    const quantity = parseInt(document.getElementById('orderQuantity').value) || 0;
    const price = stockData.price || 0;
    const orderValue = quantity * price;
    
    document.getElementById('orderValue').textContent = orderValue.toFixed(2);
    
    // Validate against 25% limit
    const validation = document.getElementById('orderValidation');
    if (orderValue > portfolioData.maxOrder) {
        validation.textContent = `⚠️ Order value ($${orderValue.toFixed(2)}) exceeds maximum allowed ($${portfolioData.maxOrder.toFixed(2)})`;
        validation.style.display = 'block';
        document.getElementById('executeBtn').disabled = true;
    } else {
        validation.style.display = 'none';
        document.getElementById('executeBtn').disabled = false;
    }
}

function toggleLimitPrice() {
    const orderType = document.getElementById('orderType').value;
    const limitPriceGroup = document.getElementById('limitPriceGroup');
    
    if (orderType === 'LMT') {
        limitPriceGroup.style.display = 'block';
        document.getElementById('limitPrice').value = stockData.price.toFixed(2);
    } else {
        limitPriceGroup.style.display = 'none';
    }
}

async function executeOrder() {
    const symbol = stockData.ticker;
    const action = document.getElementById('orderAction').value;
    const quantity = parseInt(document.getElementById('orderQuantity').value);
    const orderType = document.getElementById('orderType').value;
    const limitPrice = orderType === 'LMT' ? parseFloat(document.getElementById('limitPrice').value) : null;
    const confidence = parseInt(document.getElementById('confidence').value);
    
    // Validate
    if (!quantity || quantity < 1) {
        alert('Please enter a valid quantity');
        return;
    }
    
    const orderValue = quantity * stockData.price;
    if (orderValue > portfolioData.maxOrder) {
        alert('Order value exceeds 25% portfolio limit');
        return;
    }
    
    if (confidence < 70) {
        alert('Confidence level must be at least 70%');
        return;
    }
    
    // Confirm order
    const confirmMsg = `Confirm ${action} ${quantity} shares of ${symbol} at ${orderType === 'MKT' ? 'market price' : `$${limitPrice}`}?\n\nOrder Value: $${orderValue.toFixed(2)}`;
    if (!confirm(confirmMsg)) {
        return;
    }
    
    document.getElementById('executeBtn').disabled = true;
    document.getElementById('executeBtn').textContent = 'Executing...';
    
    try {
        const response = await fetch('/api/trading/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                symbol,
                action,
                quantity,
                orderType,
                limitPrice,
                confidence
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Order executed successfully!\nOrder ID: ${result.order.orderId}`);
            window.location.href = '/';
        } else {
            alert(`❌ Order failed: ${result.error || 'Unknown error'}`);
            document.getElementById('executeBtn').disabled = false;
            document.getElementById('executeBtn').textContent = '✓ Execute Order';
        }
    } catch (error) {
        console.error('Error executing order:', error);
        alert('Error executing order');
        document.getElementById('executeBtn').disabled = false;
        document.getElementById('executeBtn').textContent = '✓ Execute Order';
    }
}
