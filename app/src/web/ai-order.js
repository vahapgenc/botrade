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
        // Validate stock data is loaded
        if (!stockData || !stockData.ticker) {
            const errorDiv = document.createElement('div');
            errorDiv.style.color = '#ff4444';
            errorDiv.style.marginTop = '10px';
            errorDiv.textContent = 'Please fetch stock data first';
            const container = document.getElementById('step1');
            const oldError = container.querySelector('.inline-error');
            if (oldError) oldError.remove();
            errorDiv.className = 'inline-error';
            container.appendChild(errorDiv);
            return;
        }
        // Go to step 2 and display analysis
        goToStep(2);
        displayAnalysis();
    } else if (currentStep === 2) {
        goToStep(3);
        fetchNewsData();
    } else if (currentStep === 3) {
        goToStep(4);
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
    document.getElementById('nextBtn').style.display = (step === 4) ? 'none' : 'inline-block';
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
            
            // Enable Next button to proceed
            document.getElementById('nextBtn').disabled = false;
            
        } else {
            console.error('API Response Data:', data);
            let errorMsg = 'Market data unavailable or incomplete.';
            if (data && data.data && data.data.market && data.data.market.error) {
                errorMsg = data.data.market.error;
            } else if (data && data.error) {
                errorMsg = data.error;
            }
            // Use inline error instead of alert
            const errorDiv = document.createElement('div');
            errorDiv.style.color = '#ff4444';
            errorDiv.style.marginTop = '10px';
            errorDiv.textContent = `Error: ${errorMsg}`;
            const container = document.getElementById('step1');
            const oldError = container.querySelector('.inline-error');
            if (oldError) oldError.remove();
            errorDiv.className = 'inline-error';
            container.appendChild(errorDiv);
        }
    } catch (error) {
        console.error('Error fetching stock info:', error);
         // Use inline error instead of alert
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff4444';
        errorDiv.style.marginTop = '10px';
        errorDiv.textContent = `Error: ${error.message}`;
        const container = document.getElementById('step1');
        const oldError = container.querySelector('.inline-error');
        if (oldError) oldError.remove();
        errorDiv.className = 'inline-error';
        container.appendChild(errorDiv);
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
        
        if (ma.trend) {
            // Use the trend field directly from backend
            const trendValue = ma.trendStrength ? `${ma.trend} (${ma.trendStrength}%)` : ma.trend;
            indicatorsGrid.innerHTML += createIndicatorCard('MA Trend', trendValue, getSignalClass(ma.trend));
        } else if (ma.sma50 && ma.sma200) {
            // Fallback: calculate from SMA values
            const signal = ma.sma50 > ma.sma200 ? 'BULLISH' : 'BEARISH';
            const val = ma.sma50 != null ? `$${ma.sma50.toFixed(2)}` : 'N/A';
            indicatorsGrid.innerHTML += createIndicatorCard('MA Trend', `SMA50: ${val}`, getSignalClass(signal));
        } else {
            indicatorsGrid.innerHTML += createIndicatorCard('MA Trend', 'N/A', 'signal-neutral');
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
        const val = fund.valuation || {};
        const growth = fund.growth || {};
        const profitability = fund.profitability || {};
        const canSlim = fund.canSlimFactors || {};
        
        // Calculate CAN SLIM score from letter grades
        let canSlimScore = 'N/A';
        if (Object.keys(canSlim).length > 0) {
            const gradeValues = { 'A+': 100, 'A': 90, 'B+': 85, 'B': 80, 'C+': 75, 'C': 70, 'D': 60, 'F': 50 };
            const scores = Object.values(canSlim).map(grade => gradeValues[grade] || 0);
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            canSlimScore = avgScore.toFixed(0) + '/100';
        }
        
        fundamentalsGrid.innerHTML = `
            <div class="info-item"><span class="info-label">P/E Ratio</span><span class="info-value">${val.pe != null ? val.pe.toFixed(2) : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">EPS</span><span class="info-value">${val.eps != null ? '$' + val.eps.toFixed(2) : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">EPS Growth</span><span class="info-value">${growth.epsGrowth != null ? (growth.epsGrowth * 100).toFixed(2) + '%' : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Revenue Growth</span><span class="info-value">${growth.revenueGrowth != null ? (growth.revenueGrowth * 100).toFixed(2) + '%' : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Net Margin</span><span class="info-value">${profitability.netMargin != null ? (profitability.netMargin * 100).toFixed(2) + '%' : 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">CAN SLIM Score</span><span class="info-value">${canSlimScore}</span></div>
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
    document.getElementById('aiGeneratePrompt').style.display = 'none';
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
                tradingType: 'BOTH', // Support both stock and options analysis
                portfolio: {
                    totalBudget: accountData.netLiquidation || 100000,
                    availableCash: accountData.cashBalance || 100000,
                    positions: positionsData.positions || []
                }
            })
        });
        
        const data = await response.json();
        
        if (data && data.ticker) {
            aiData = data;
            
            console.log('AI Decision received:', aiData);
            console.log('Options Strategy:', aiData.optionsStrategy);
            console.log('Options Comparison:', aiData.optionsComparison);
            console.log('Options Legs:', aiData.optionsLegs);
            console.log('Options Strategy:', aiData.optionsStrategy);
            console.log('Options Comparison:', aiData.optionsComparison);
            console.log('Options Legs:', aiData.optionsLegs);
            
            // Display AI recommendation - accessible for color blindness
            const decisionText = aiData.decision ? aiData.decision.toUpperCase() : 'NO RECOMMENDATION';
            const tickerText = aiData.ticker ? aiData.ticker.toUpperCase() : '';
            
            // Determine color, icon, and background based on decision
            let actionColor = '#6b7280';
            let actionBg = '#f3f4f6';
            let actionIcon = '⏸️';
            let actionLabel = 'NEUTRAL';
            
            if (decisionText.includes('BUY')) {
                actionColor = '#10b981';
                actionBg = '#d1fae5';
                actionIcon = '📈';
                actionLabel = 'BULLISH';
            } else if (decisionText.includes('SELL')) {
                actionColor = '#ef4444';
                actionBg = '#fee2e2';
                actionIcon = '📉';
                actionLabel = 'BEARISH';
            } else if (decisionText.includes('HOLD')) {
                actionIcon = '⏸️';
                actionLabel = 'NEUTRAL';
            }
            
            const decisionElement = document.getElementById('aiDecision');
            decisionElement.innerHTML = `
                <div style="background: ${actionBg}; padding: 1.5rem; border-radius: 0.75rem; border: 3px solid ${actionColor};">
                    <div style="font-size: 1rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem; text-transform: uppercase;" 
                         title="Market sentiment indicator">
                        ${actionIcon} ${actionLabel}
                    </div>
                    <div style="font-size: 3rem; font-weight: 900; color: ${actionColor}; margin-bottom: 0.5rem;"
                         title="AI Trading Recommendation">
                        ${decisionText}
                    </div>
                    <div style="font-size: 1.5rem; font-weight: 600; color: #374151; border-top: 2px solid ${actionColor}; padding-top: 0.5rem; margin-top: 0.5rem;"
                         title="Stock ticker symbol">
                        ${tickerText}
                    </div>
                </div>
            `;
            
            document.getElementById('aiConfidence').textContent = aiData.confidence + '%';
            const confidenceFill = document.getElementById('confidenceFill');
            confidenceFill.style.width = `${aiData.confidence}%`;
            
            // Color confidence bar with patterns and labels for accessibility
            let confidenceLabel = '';
            let confidenceIcon = '';
            
            if (aiData.confidence >= 80) {
                confidenceFill.style.background = '#10b981'; // Green
                confidenceLabel = 'HIGH';
                confidenceIcon = '✓✓✓';
                confidenceFill.title = 'High Confidence (80%+): Strong signal';
            } else if (aiData.confidence >= 60) {
                confidenceFill.style.background = '#f59e0b'; // Orange
                confidenceLabel = 'MEDIUM';
                confidenceIcon = '✓✓';
                confidenceFill.title = 'Medium Confidence (60-79%): Moderate signal';
            } else {
                confidenceFill.style.background = '#ef4444'; // Red
                confidenceLabel = 'LOW';
                confidenceIcon = '✓';
                confidenceFill.title = 'Low Confidence (<60%): Weak signal, exercise caution';
            }
            
            // Add confidence label next to percentage
            const confidenceElement = document.getElementById('aiConfidence');
            confidenceElement.innerHTML = `
                ${aiData.confidence}% 
                <span style="margin-left: 0.5rem; font-size: 0.875rem; padding: 0.25rem 0.5rem; background: ${confidenceFill.style.background}; color: white; border-radius: 0.25rem; font-weight: 700;"
                      title="${confidenceFill.title}">
                    ${confidenceIcon} ${confidenceLabel}
                </span>
            `;
            
            if (aiData.quantity) document.getElementById('aiQuantity').textContent = aiData.quantity;
            if (aiData.suggestedPrice) document.getElementById('aiEntry').textContent = '$' + aiData.suggestedPrice.toFixed(2);
            if (aiData.stopLoss) document.getElementById('aiStopLoss').textContent = '$' + aiData.stopLoss.toFixed(2);
            if (aiData.targetPrice) document.getElementById('aiTakeProfit').textContent = '$' + aiData.targetPrice.toFixed(2);
            
            // Display reasoning
            const reasoning = document.getElementById('aiReasoning');
            reasoning.innerHTML = '';
            
            if (aiData.reasoning) {
                reasoning.innerHTML += `<p style="margin-bottom: 1rem;">${aiData.reasoning}</p>`;
            }
            
            if (aiData.keyFactors && aiData.keyFactors.length > 0) {
                reasoning.innerHTML += '<strong>Key Factors:</strong><ul style="margin-top: 0.5rem;">';
                aiData.keyFactors.forEach(reason => {
                    reasoning.innerHTML += `<li>${reason}</li>`;
                });
                reasoning.innerHTML += '</ul>';
            }
            
            if (aiData.risks && aiData.risks.length > 0) {
                reasoning.innerHTML += '<strong style="margin-top: 1rem; display: block;">Risks:</strong><ul style="margin-top: 0.5rem;">';
                aiData.risks.forEach(risk => {
                    reasoning.innerHTML += `<li>${risk}</li>`;
                });
                reasoning.innerHTML += '</ul>';
            }
            
            // Display options comparison if available (3, 6, 9 month analysis)
            const optionsComparisonSection = document.getElementById('optionsComparisonSection');
            if (aiData.optionsComparison || (aiData.optionsStrategy && aiData.optionsLegs)) {
                optionsComparisonSection.style.display = 'block';
                
                // Show timeframe comparison
                if (aiData.optionsComparison) {
                    document.getElementById('optionsComparison').innerHTML = `
                        <strong style="color: #0369a1;">💡 Timeframe Selection:</strong><br/>
                        ${aiData.optionsComparison}
                    `;
                }
                
                // Show multi-leg strategy details
                if (aiData.optionsStrategy && aiData.optionsLegs && aiData.optionsLegs.length > 0) {
                    document.getElementById('multiLegStrategy').style.display = 'block';
                    
                    const legsContainer = document.getElementById('strategyLegs');
                    legsContainer.innerHTML = '';
                    
                    aiData.optionsLegs.forEach((leg, idx) => {
                        const legColor = leg.action === 'BUY' ? '#10b981' : '#ef4444';
                        const legBg = leg.action === 'BUY' ? '#d1fae5' : '#fee2e2';
                        
                        const legHTML = `
                            <div style="padding: 1rem; background: ${legBg}; border-left: 4px solid ${legColor}; border-radius: 0.5rem;">
                                <div style="font-weight: 700; color: ${legColor}; margin-bottom: 0.5rem;">
                                    Leg ${idx + 1}: ${leg.action} ${leg.contracts || 1}x ${leg.type}
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.9rem;">
                                    <div><span style="color: #64748b;">Strike:</span> <strong>$${leg.strike}</strong></div>
                                    <div><span style="color: #64748b;">Expiry:</span> <strong>${new Date(leg.expiry).toLocaleDateString()}</strong></div>
                                    <div><span style="color: #64748b;">Premium:</span> <strong>$${leg.premium?.toFixed(2) || 'Market'}</strong></div>
                                </div>
                            </div>
                        `;
                        legsContainer.innerHTML += legHTML;
                    });
                    
                    // Show strategy metrics
                    document.getElementById('strategyMaxProfit').textContent = 
                        aiData.optionsMaxProfit ? `$${aiData.optionsMaxProfit.toFixed(2)}` : 'Unlimited';
                    document.getElementById('strategyMaxLoss').textContent = 
                        aiData.optionsMaxLoss ? `$${aiData.optionsMaxLoss.toFixed(2)}` : '-';
                    document.getElementById('strategyBreakeven').textContent = 
                        aiData.optionsBreakeven ? `$${aiData.optionsBreakeven.toFixed(2)}` : '-';
                }
            } else {
                optionsComparisonSection.style.display = 'none';
            }
            
            document.getElementById('aiResults').style.display = 'block';
            
            // Show "New Analysis" button
            document.getElementById('nextBtn').style.display = 'none';
            document.getElementById('newAnalysisBtn').style.display = 'inline-block';
        } else {
            // Show error inline
            const errorDiv = document.createElement('div');
            errorDiv.style.color = '#ff4444';
            errorDiv.style.marginTop = '10px';
            errorDiv.style.padding = '1rem';
            errorDiv.style.background = '#fee';
            errorDiv.style.borderRadius = '0.5rem';
            errorDiv.textContent = `Error: ${data.error || 'No AI recommendation received'}`;
            const container = document.getElementById('step4');
            const oldError = container.querySelector('.inline-error');
            if (oldError) oldError.remove();
            errorDiv.className = 'inline-error';
            container.appendChild(errorDiv);
        }
    } catch (error) {
        console.error('Error running AI analysis:', error);
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff4444';
        errorDiv.style.marginTop = '10px';
        errorDiv.style.padding = '1rem';
        errorDiv.style.background = '#fee';
        errorDiv.style.borderRadius = '0.5rem';
        errorDiv.textContent = `Error: ${error.message}`;
        const container = document.getElementById('step4');
        const oldError = container.querySelector('.inline-error');
        if (oldError) oldError.remove();
        errorDiv.className = 'inline-error';
        container.appendChild(errorDiv);
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

function populateStep5Summary() {
    if (!aiData || !aiData.decision) return;
    
    // Populate AI summary card
    document.getElementById('finalAiDecision').textContent = `${aiData.decision} ${stockData.ticker}`;
    document.getElementById('finalAiQuantity').textContent = aiData.quantity || '-';
    document.getElementById('finalAiEntry').textContent = aiData.suggestedPrice ? `$${aiData.suggestedPrice.toFixed(2)}` : '-';
    document.getElementById('finalAiConfidence').textContent = aiData.confidence ? `${aiData.confidence}%` : '-';
    
    // Update order value display
    updateOrderValue();
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
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff4444';
        errorDiv.style.marginTop = '10px';
        errorDiv.textContent = 'Please enter a valid quantity';
        const container = document.getElementById('step5');
        const oldError = container.querySelector('.inline-error');
        if (oldError) oldError.remove();
        errorDiv.className = 'inline-error';
        container.appendChild(errorDiv);
        return;
    }
    
    const orderValue = quantity * stockData.price;
    if (orderValue > portfolioData.maxOrder) {
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff4444';
        errorDiv.style.marginTop = '10px';
        errorDiv.textContent = 'Order value exceeds 25% portfolio limit';
        const container = document.getElementById('step5');
        const oldError = container.querySelector('.inline-error');
        if (oldError) oldError.remove();
        errorDiv.className = 'inline-error';
        container.appendChild(errorDiv);
        return;
    }
    
    if (confidence < 70) {
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff4444';
        errorDiv.style.marginTop = '10px';
        errorDiv.textContent = 'Confidence level must be at least 70%';
        const container = document.getElementById('step5');
        const oldError = container.querySelector('.inline-error');
        if (oldError) oldError.remove();
        errorDiv.className = 'inline-error';
        container.appendChild(errorDiv);
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
            // Show success modal
            const successMsg = `✅ Order executed successfully!\n\nOrder ID: ${result.order.orderId}\nSymbol: ${symbol}\nAction: ${action}\nQuantity: ${quantity}\n\nWhat would you like to do next?`;
            
            if (confirm(successMsg + '\n\nClick OK to start a new analysis, or Cancel to view dashboard')) {
                // Reset wizard for new analysis
                window.location.reload();
            } else {
                // Go to dashboard
                window.location.href = '/';
            }
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.style.color = '#ff4444';
            errorDiv.style.marginTop = '10px';
            errorDiv.style.padding = '1rem';
            errorDiv.style.background = '#fee';
            errorDiv.style.borderRadius = '0.5rem';
            errorDiv.textContent = `❌ Order failed: ${result.error || 'Unknown error'}`;
            const container = document.getElementById('step5');
            const oldError = container.querySelector('.inline-error');
            if (oldError) oldError.remove();
            errorDiv.className = 'inline-error';
            container.appendChild(errorDiv);
            
            document.getElementById('executeBtn').disabled = false;
            document.getElementById('executeBtn').textContent = '✓ Execute Order';
        }
    } catch (error) {
        console.error('Error executing order:', error);
        
        const errorDiv = document.createElement('div');
        errorDiv.style.color = '#ff4444';
        errorDiv.style.marginTop = '10px';
        errorDiv.style.padding = '1rem';
        errorDiv.style.background = '#fee';
        errorDiv.style.borderRadius = '0.5rem';
        errorDiv.textContent = `Error: ${error.message}`;
        const container = document.getElementById('step5');
        const oldError = container.querySelector('.inline-error');
        if (oldError) oldError.remove();
        errorDiv.className = 'inline-error';
        container.appendChild(errorDiv);
        
        document.getElementById('executeBtn').disabled = false;
        document.getElementById('executeBtn').textContent = '✓ Execute Order';
    }
}
// Modal Functions
function openStockOrderModal() {
    // Pre-fill with AI recommendations
    if (aiData) {
        document.getElementById('modalStockAction').textContent = aiData.decision || 'BUY';
        document.getElementById('modalStockQuantity').textContent = aiData.quantity || '-';
        document.getElementById('modalStockEntry').textContent = aiData.suggestedPrice ? `$${aiData.suggestedPrice.toFixed(2)}` : '-';
        
        document.getElementById('stockAction').value = aiData.decision || 'BUY';
        document.getElementById('stockQuantity').value = aiData.quantity || 1;
        
        if (aiData.suggestedPrice) {
            document.getElementById('stockLimitPrice').value = aiData.suggestedPrice.toFixed(2);
        }
    }
    
    updateStockOrderValue();
    document.getElementById('stockOrderModal').style.display = 'flex';
}

function closeStockOrderModal() {
    document.getElementById('stockOrderModal').style.display = 'none';
}

function openOptionsOrderModal() {
    const modal = document.getElementById('optionsOrderModal');
    
    // Check if AI recommended an options strategy
    if (aiData && aiData.optionsStrategy && aiData.optionsLegs && aiData.optionsLegs.length > 0) {
        const strategyName = aiData.optionsStrategy;
        const legs = aiData.optionsLegs;
        
        // Build strategy description for multi-leg strategies
        let strategyLegsHTML = '';
        legs.forEach((leg, idx) => {
            const legColor = leg.action === 'BUY' ? '#10b981' : '#f59e0b';
            const legIcon = leg.action === 'BUY' ? '📈' : '📉';
            const legType = `${leg.action} ${leg.contracts || 1}x ${leg.type}`;
            const expiryDate = new Date(leg.expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            strategyLegsHTML += `
                <div style="padding: 0.75rem; background: rgba(255,255,255,0.3); border-left: 4px solid ${legColor}; border-radius: 0.25rem; margin-top: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: ${legColor};">${legIcon} Leg ${idx + 1}:</strong>
                        <span style="font-size: 0.875rem; opacity: 0.9;">${expiryDate}</span>
                    </div>
                    <div style="margin-top: 0.25rem;">${legType} @ Strike $${leg.strike}</div>
                    ${leg.premium ? `<div style="font-size: 0.875rem; opacity: 0.9;">Premium: $${leg.premium.toFixed(2)} per contract</div>` : ''}
                </div>
            `;
        });
        
        // Add options comparison context if available
        let comparisonHTML = '';
        if (aiData.optionsComparison) {
            comparisonHTML = `
                <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem; line-height: 1.6;">
                    <div style="font-weight: 600; margin-bottom: 0.5rem;">📊 Timeframe Analysis (3, 6, 9 Months):</div>
                    ${aiData.optionsComparison}
                </div>
            `;
        }
        
        // Show AI recommendation banner
        let bannerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem;">
                <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 0.5rem;">🤖 AI RECOMMENDED STRATEGY</div>
                <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">${strategyName.replace(/_/g, ' ')}</div>
                
                ${comparisonHTML}
                
                ${strategyLegsHTML}
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; font-size: 0.9rem; margin-top: 1rem;">
                    <div>
                        <div style="opacity: 0.8;">Max Profit</div>
                        <div style="font-weight: 700; color: #10b981;">${aiData.optionsMaxProfit ? '$' + aiData.optionsMaxProfit.toFixed(2) : 'Unlimited'}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.8;">Max Loss</div>
                        <div style="font-weight: 700; color: #ef4444;">${aiData.optionsMaxLoss ? '$' + aiData.optionsMaxLoss.toFixed(2) : 'N/A'}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.8;">Breakeven</div>
                        <div style="font-weight: 700;">${aiData.optionsBreakeven ? '$' + aiData.optionsBreakeven.toFixed(2) : 'N/A'}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.8;">Win Probability</div>
                        <div style="font-weight: 700;">${aiData.probabilitySuccess || 65}%</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.3); font-size: 0.875rem; opacity: 0.9;">
                    💡 <strong>Tip:</strong> Use "Strategy Size" to scale all legs proportionally (1x, 2x, 3x, etc.)
                </div>
            </div>
        `;
        
        // Insert banner at the top of modal content
        const modalContent = modal.querySelector('.modal-content');
        let existingBanner = modalContent.querySelector('.ai-strategy-banner');
        if (existingBanner) existingBanner.remove();
        
        const bannerDiv = document.createElement('div');
        bannerDiv.className = 'ai-strategy-banner';
        bannerDiv.innerHTML = bannerHTML;
        modalContent.insertBefore(bannerDiv, modalContent.children[1]); // After title
        
        // For multi-leg strategies, hide individual fields and show strategy scaler
        if (legs.length > 1) {
            // Hide individual option fields
            document.querySelectorAll('#optionsOrderModal .form-group').forEach(group => {
                group.style.display = 'none';
            });
            
            // Show strategy scaler
            let scalerHTML = `
                <div class="form-group" style="display: block !important;">
                    <label style="font-weight: 700; font-size: 1.1rem;">Strategy Size (Scale All Legs)</label>
                    <input type="number" id="strategyScaler" class="form-input" min="1" value="1" style="font-size: 1.25rem;">
                    <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">
                        1x = Execute as recommended | 2x = Double all positions | 3x = Triple, etc.
                    </div>
                </div>
            `;
            
            let existingScaler = modalContent.querySelector('.strategy-scaler-group');
            if (existingScaler) existingScaler.remove();
            
            const scalerDiv = document.createElement('div');
            scalerDiv.className = 'strategy-scaler-group';
            scalerDiv.innerHTML = scalerHTML;
            bannerDiv.after(scalerDiv);
            
            // Store multi-leg strategy data
            modal.dataset.multiLegStrategy = JSON.stringify({
                strategy: strategyName,
                legs: legs,
                maxProfit: aiData.optionsMaxProfit,
                maxLoss: aiData.optionsMaxLoss,
                breakeven: aiData.optionsBreakeven
            });
            
            // Update order value when scaler changes
            const scalerInput = document.getElementById('strategyScaler');
            if (scalerInput) {
                scalerInput.addEventListener('input', () => {
                    const scale = parseInt(scalerInput.value) || 1;
                    let totalCost = 0;
                    
                    legs.forEach(leg => {
                        const contracts = (leg.contracts || 1) * scale;
                        const premium = leg.premium || 0;
                        const legCost = contracts * premium * 100; // 100 shares per contract
                        
                        if (leg.action === 'BUY') {
                            totalCost += legCost;
                        } else if (leg.action === 'SELL') {
                            totalCost -= legCost; // Credit received
                        }
                    });
                    
                    document.getElementById('optionsOrderValue').textContent = Math.abs(totalCost).toFixed(2);
                });
                
                // Trigger initial calculation
                scalerInput.dispatchEvent(new Event('input'));
            }
            
            // Store strategy data for execution
            modal.dataset.multiLegStrategy = JSON.stringify({
                strategy: strategy.strategy,
                legs: legs
            });
            
        } else {
            // Single leg - show normal form with pre-filled values
            document.querySelectorAll('#optionsOrderModal .form-group').forEach(group => {
                group.style.display = 'block';
            });
            
            const primaryLeg = legs[0];
            
            document.getElementById('optionsAction').value = primaryLeg.action;
            document.getElementById('optionType').value = primaryLeg.type;
            document.getElementById('optionContracts').value = primaryLeg.contracts || 1;
            document.getElementById('strikePrice').value = primaryLeg.strike?.toFixed(2) || '';
            
            if (primaryLeg.expiry) {
                document.getElementById('expirationDate').value = primaryLeg.expiry;
            }
            
            if (primaryLeg.premium) {
                document.getElementById('optionsOrderType').value = 'LMT';
                document.getElementById('optionsLimitPrice').value = primaryLeg.premium.toFixed(2);
                document.getElementById('optionsLimitPriceGroup').style.display = 'block';
            }
            
            // Lock fields except contracts
            document.getElementById('optionsAction').disabled = true;
            document.getElementById('optionType').disabled = true;
            document.getElementById('strikePrice').disabled = true;
            document.getElementById('expirationDate').disabled = true;
            document.getElementById('optionsOrderType').disabled = true;
            document.getElementById('optionsLimitPrice').disabled = true;
            document.getElementById('optionContracts').disabled = false;
            document.getElementById('optionContracts').focus();
            
            modal.dataset.multiLegStrategy = '';
        }
        
    } else {
        // No AI recommendation - allow manual entry
        document.querySelectorAll('#optionsOrderModal .form-group').forEach(group => {
            group.style.display = 'block';
        });
        
        if (stockData && stockData.price) {
            document.getElementById('strikePrice').value = stockData.price.toFixed(2);
        }
        
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);
        document.getElementById('expirationDate').value = expirationDate.toISOString().split('T')[0];
        
        document.getElementById('optionsAction').disabled = false;
        document.getElementById('optionType').disabled = false;
        document.getElementById('optionContracts').disabled = false;
        document.getElementById('strikePrice').disabled = false;
        document.getElementById('expirationDate').disabled = false;
        document.getElementById('optionsOrderType').disabled = false;
        document.getElementById('optionsLimitPrice').disabled = false;
        
        modal.dataset.multiLegStrategy = '';
    }
    
    updateOptionsOrderValue();
    modal.style.display = 'flex';
}

// Remove the unlockOptionsFields function as it's no longer needed

function closeOptionsOrderModal() {
    document.getElementById('optionsOrderModal').style.display = 'none';
}

async function executeStockOrder() {
    const symbol = stockData.ticker;
    const action = document.getElementById('stockAction').value;
    const quantity = parseInt(document.getElementById('stockQuantity').value);
    const orderType = document.getElementById('stockOrderType').value;
    const limitPrice = orderType === 'LMT' ? parseFloat(document.getElementById('stockLimitPrice').value) : null;
    
    if (!quantity || quantity < 1) {
        alert('Please enter a valid quantity');
        return;
    }
    
    if (orderType === 'LMT' && (!limitPrice || limitPrice <= 0)) {
        alert('Please enter a valid limit price');
        return;
    }
    
    const confirmMsg = `Confirm ${action} ${quantity} shares of ${symbol} at ${orderType === 'MKT' ? 'market price' : `$${limitPrice}`}?`;
    if (!confirm(confirmMsg)) {
        return;
    }
    
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
                confidence: aiData.confidence || 80
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeStockOrderModal();
            alert(`✅ Order executed successfully!\n\nOrder ID: ${result.order.orderId}\nSymbol: ${symbol}\nAction: ${action}\nQuantity: ${quantity}`);
            
            // Show new analysis button
            document.getElementById('nextBtn').style.display = 'none';
            document.getElementById('newAnalysisBtn').style.display = 'inline-block';
        } else {
            alert(`❌ Order failed: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error executing stock order:', error);
        alert(`Error: ${error.message}`);
    }
}

async function executeOptionsOrder() {
    const symbol = stockData.ticker;
    const modal = document.getElementById('optionsOrderModal');
    
    // Check if this is a multi-leg strategy
    const multiLegData = modal.dataset.multiLegStrategy;
    
    if (multiLegData && multiLegData !== '') {
        // Multi-leg strategy execution
        const strategyData = JSON.parse(multiLegData);
        const scaler = parseInt(document.getElementById('strategyScaler')?.value || 1);
        
        if (scaler < 1) {
            alert('Strategy size must be at least 1');
            return;
        }
        
        // Scale all legs
        const scaledLegs = strategyData.legs.map(leg => ({
            ...leg,
            contracts: (leg.contracts || 1) * scaler
        }));
        
        const confirmMsg = `Confirm ${strategyData.strategy.replace(/_/g, ' ')} strategy (${scaler}x):\n\n${
            scaledLegs.map((leg, idx) => 
                `Leg ${idx + 1}: ${leg.action} ${leg.contracts} ${leg.type} @ $${leg.strike} (${leg.expiry})`
            ).join('\n')
        }`;
        
        if (!confirm(confirmMsg)) {
            return;
        }
        
        try {
            const response = await fetch('/api/trading/execute-multi-leg-option', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol,
                    strategy: strategyData.strategy,
                    legs: scaledLegs,
                    confidence: aiData.confidence || 80
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                closeOptionsOrderModal();
                alert(`✅ Multi-leg options strategy executed!\n\nStrategy: ${strategyData.strategy}\nLegs: ${scaledLegs.length}\nOrder IDs: ${result.orderIds?.join(', ') || result.order?.orderId || 'Pending'}`);
                
                document.getElementById('nextBtn').style.display = 'none';
                document.getElementById('newAnalysisBtn').style.display = 'inline-block';
            } else {
                alert(`❌ Order failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error executing multi-leg options order:', error);
            alert(`Error: ${error.message}`);
        }
        
    } else {
        // Single leg execution
        const action = document.getElementById('optionsAction').value;
        const optionType = document.getElementById('optionType').value;
        const contracts = parseInt(document.getElementById('optionContracts').value);
        const strikePrice = parseFloat(document.getElementById('strikePrice').value);
        const expirationDate = document.getElementById('expirationDate').value;
        const orderType = document.getElementById('optionsOrderType').value;
        const limitPrice = orderType === 'LMT' ? parseFloat(document.getElementById('optionsLimitPrice').value) : null;
        
        if (!contracts || contracts < 1) {
            alert('Please enter a valid number of contracts');
            return;
        }
        
        if (!strikePrice || strikePrice <= 0) {
            alert('Please enter a valid strike price');
            return;
        }
        
        if (!expirationDate) {
            alert('Please select an expiration date');
            return;
        }
        
        if (orderType === 'LMT' && (!limitPrice || limitPrice <= 0)) {
            alert('Please enter a valid limit price');
            return;
        }
        
        const confirmMsg = `Confirm ${action} ${contracts} ${optionType} contract(s) of ${symbol}\nStrike: $${strikePrice}\nExpiration: ${expirationDate}\nAt ${orderType === 'MKT' ? 'market price' : `$${limitPrice} per contract`}?`;
        if (!confirm(confirmMsg)) {
            return;
        }
        
        try {
            const response = await fetch('/api/trading/execute-option', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol,
                    action,
                    optionType,
                    contracts,
                    strikePrice,
                    expirationDate,
                    orderType,
                    limitPrice,
                    confidence: aiData.confidence || 80
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                closeOptionsOrderModal();
                alert(`✅ Options order executed successfully!\n\nOrder ID: ${result.order.orderId}\nSymbol: ${symbol}\nAction: ${action}\nType: ${optionType}\nContracts: ${contracts}\nStrike: $${strikePrice}`);
                
                // Show new analysis button
                document.getElementById('nextBtn').style.display = 'none';
                document.getElementById('newAnalysisBtn').style.display = 'inline-block';
            } else {
                alert(`❌ Order failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error executing options order:', error);
            alert(`Error: ${error.message}`);
        }
    }
}

function startNewAnalysis() {
    window.location.reload();
}