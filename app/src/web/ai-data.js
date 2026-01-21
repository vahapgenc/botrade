// AI Data Overview Script

let currentTicker = 'AAPL';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializePage();
    loadData();
    
    // Allow Enter key in input
    document.getElementById('tickerInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadData();
        }
    });
});

function initializePage() {
    console.log('AI Data Overview page initialized');
}

async function loadData() {
    const tickerInput = document.getElementById('tickerInput');
    const ticker = tickerInput.value.trim().toUpperCase();
    
    if (!ticker) {
        alert('Please enter a ticker symbol');
        return;
    }
    
    currentTicker = ticker;
    console.log(`Loading AI data for ${ticker}...`);
    
    // Reset all sections to loading state
    resetSections();
    
    try {
        const response = await fetch(`/api/ai/input/${ticker}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('AI Data received:', data);
        
        // Update all sections
        updateSummary(data);
        updateMarketData(data);
        updateTechnicalData(data);
        updateNewsData(data);
        updateFundamentalData(data);
        updateMarketSentiment(data);
        
    } catch (error) {
        console.error('Error loading AI data:', error);
        const msg = 'Failed to load AI data. Please check connection.';
        console.warn(msg);
        
        // Show error in summary instead of alert/toast if you want to avoid popup
        const banner = document.getElementById('summaryBanner');
        banner.style.display = 'block';
        banner.innerHTML = `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 1rem; border-radius: 8px;">
            <strong>Error:</strong> ${error.message || msg}
        </div>`;
    }
}

function resetSections() {
    // Reset status indicators
    const statuses = ['marketStatus', 'technicalStatus', 'newsStatus', 'fundamentalStatus', 'marketSentimentStatus'];
    statuses.forEach(id => {
        const el = document.getElementById(id);
        el.className = 'status-indicator-inline status-loading';
        el.textContent = 'Loading...';
    });
    
    // Reset data sections
    document.getElementById('marketData').innerHTML = '<div class="loading-skeleton"></div>';
    document.getElementById('technicalData').innerHTML = '<div class="loading-skeleton"></div>';
    document.getElementById('newsData').innerHTML = '<div class="loading-skeleton"></div>';
    document.getElementById('fundamentalData').innerHTML = '<div class="loading-skeleton"></div>';
    document.getElementById('marketSentimentData').innerHTML = '<div class="loading-skeleton"></div>';
}

function updateSummary(data) {
    const banner = document.getElementById('summaryBanner');
    banner.style.display = 'grid';
    
    // Count successful data sources
    const statusValues = Object.values(data.status);
    const successCount = statusValues.filter(s => s === 'success').length;
    document.getElementById('dataSourcesCount').textContent = `${successCount}/${statusValues.length}`;
    
    // News count
    const newsCount = data.data.news?.articlesCount || 0;
    document.getElementById('newsCount').textContent = newsCount;
    
    // Sentiment score
    const sentimentScore = data.data.news?.sentiment?.score || 0;
    document.getElementById('sentimentScore').textContent = sentimentScore > 0 ? `+${sentimentScore.toFixed(1)}` : sentimentScore.toFixed(1);
    
    // Technical signal
    const techSignal = data.data.technical?.composite?.signal || 'N/A';
    document.getElementById('technicalSignal').textContent = techSignal;
}

function updateMarketData(data) {
    const statusEl = document.getElementById('marketStatus');
    const dataEl = document.getElementById('marketData');
    
    if (data.status.market === 'success') {
        statusEl.className = 'status-indicator-inline status-success';
        statusEl.textContent = '✓ Active';
        
        const market = data.data.market;
        dataEl.innerHTML = `
            <div class="data-grid">
                <div class="data-card">
                    <div class="data-card-label">Current Price</div>
                    <div class="data-card-value">$${market.price.toFixed(2)}</div>
                    <div class="data-card-subvalue">as of ${new Date(market.date).toLocaleDateString()}</div>
                </div>
                <div class="data-card">
                    <div class="data-card-label">Open</div>
                    <div class="data-card-value">$${market.open.toFixed(2)}</div>
                </div>
                <div class="data-card">
                    <div class="data-card-label">High</div>
                    <div class="data-card-value">$${market.high.toFixed(2)}</div>
                </div>
                <div class="data-card">
                    <div class="data-card-label">Low</div>
                    <div class="data-card-value">$${market.low.toFixed(2)}</div>
                </div>
                <div class="data-card">
                    <div class="data-card-label">Volume</div>
                    <div class="data-card-value">${formatVolume(market.volume)}</div>
                </div>
                <div class="data-card">
                    <div class="data-card-label">Data Points</div>
                    <div class="data-card-value">${market.dataPoints}</div>
                    <div class="data-card-subvalue">days of historical data</div>
                </div>
            </div>
        `;
    } else {
        statusEl.className = 'status-indicator-inline status-error';
        statusEl.textContent = '✗ Error';
        dataEl.innerHTML = `<p style="color: #ef4444;">Failed to load market data: ${data.data.market?.error || 'Unknown error'}</p>`;
    }
}

function updateTechnicalData(data) {
    const statusEl = document.getElementById('technicalStatus');
    const dataEl = document.getElementById('technicalData');
    
    if (data.status.technical === 'success') {
        statusEl.className = 'status-indicator-inline status-success';
        statusEl.textContent = '✓ Active';
        
        const tech = data.data.technical;
        const composite = tech.composite || {};
        const rsi = tech.rsi || {};
        const macd = tech.macd || {};
        const bollinger = tech.bollinger || {};
        const ma = tech.movingAverages || {};
        
        dataEl.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Composite Signal</h3>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span style="font-weight: 600; font-size: 1.25rem;">${composite.signal || 'N/A'}</span>
                            <span style="color: #6b7280;">Score: ${composite.score?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${Math.abs((composite.score || 0) * 100)}%"></div>
                        </div>
                        <p style="color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem;">${composite.interpretation || ''}</p>
                    </div>
                </div>
            </div>
            
            <div class="data-grid">
                <div class="data-card">
                    <div class="data-card-label">RSI (14)</div>
                    <div class="data-card-value">${rsi.value?.toFixed(2) || 'N/A'}</div>
                    <div class="data-card-subvalue">
                        <span class="sentiment-badge ${getSignalClass(rsi.signal)}">${rsi.signal || 'N/A'}</span>
                    </div>
                    <div class="data-card-subvalue" style="margin-top: 0.5rem;">${rsi.interpretation || ''}</div>
                </div>
                
                <div class="data-card">
                    <div class="data-card-label">MACD</div>
                    <div class="data-card-value">${macd.value !== undefined && macd.value !== null ? macd.value.toFixed(4) : 'N/A'}</div>
                    <div class="data-card-subvalue">Signal: ${macd.signal?.toFixed(4) || 'N/A'}</div>
                    <div class="data-card-subvalue">Histogram: ${macd.histogram?.toFixed(4) || 'N/A'}</div>
                    <div class="data-card-subvalue">
                        ${macd.crossover && macd.crossover !== 'NONE' ? `<span class="sentiment-badge ${macd.crossover === 'BULLISH' ? 'sentiment-bullish' : 'sentiment-bearish'}">${macd.crossover}</span>` : '<span class="sentiment-badge sentiment-neutral">NO CROSSOVER</span>'}
                    </div>
                </div>
                
                <div class="data-card">
                    <div class="data-card-label">
                        Bollinger Bands
                        <span class="tooltip-icon" data-tooltip="Volatility bands around price:\n• UPPER = Price near top (potentially overbought)\n• MIDDLE = Fair value\n• LOWER = Price near bottom (potentially oversold)\n\nTrading tip:\n• Buy when price touches lower band\n• Sell when price touches upper band">ℹ️</span>
                    </div>
                    <div class="data-card-value">${bollinger.position || 'N/A'}</div>
                    <div class="data-card-subvalue">
                        <span class="sentiment-badge ${getSignalClass(bollinger.signal)}">${bollinger.signal || 'N/A'}</span>
                    </div>
                    <div class="data-card-subvalue" style="margin-top: 0.5rem;">
                        Upper: ${bollinger.upperBand?.toFixed(2) || 'N/A'}<br>
                        Middle: ${bollinger.middleBand?.toFixed(2) || 'N/A'}<br>
                        Lower: ${bollinger.lowerBand?.toFixed(2) || 'N/A'}
                    </div>
                </div>
                
                <div class="data-card">
                    <div class="data-card-label">Moving Averages</div>
                    <div class="data-card-value">${ma.trend || 'N/A'}</div>
                    <div class="data-card-subvalue">
                        SMA20: $${ma.sma20?.toFixed(2) || 'N/A'}<br>
                        SMA50: $${ma.sma50?.toFixed(2) || 'N/A'}<br>
                        EMA9: $${ma.ema9?.toFixed(2) || 'N/A'}<br>
                        EMA21: $${ma.ema21?.toFixed(2) || 'N/A'}
                    </div>
                    <div class="data-card-subvalue" style="margin-top: 0.5rem;">
                        Trend Strength: ${ma.trendStrength || 'N/A'}
                    </div>
                </div>
            </div>
            
            ${tech.summary ? `
                <div style="margin-top: 1.5rem; padding: 1rem; background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 0.5rem;">
                    <h4 style="font-weight: 600; margin-bottom: 0.5rem;">Summary</h4>
                    <p style="color: #374151; line-height: 1.6;">${tech.summary}</p>
                </div>
            ` : ''}
        `;
    } else {
        statusEl.className = 'status-indicator-inline status-error';
        statusEl.textContent = '✗ Error';
        dataEl.innerHTML = `<p style="color: #ef4444;">Failed to load technical data: ${data.data.technical?.error || 'Unknown error'}</p>`;
    }
}

function updateNewsData(data) {
    const statusEl = document.getElementById('newsStatus');
    const dataEl = document.getElementById('newsData');
    
    if (data.status.news === 'success') {
        statusEl.className = 'status-indicator-inline status-success';
        statusEl.textContent = '✓ Active';
        
        const news = data.data.news;
        const sentiment = news.sentiment || {};
        const signal = news.tradingSignal || {};
        
        let headlinesHTML = '';
        if (news.recentHeadlines && news.recentHeadlines.length > 0) {
            headlinesHTML = news.recentHeadlines.map(article => `
                <div class="news-item">
                    <div class="news-title">${article.title}</div>
                    <div class="news-meta">
                        <span class="sentiment-badge ${getSentimentClass(article.sentiment)}">${article.sentiment}</span>
                        <span>Score: ${article.score?.toFixed(2) || 'N/A'}</span>
                        <span>Source: ${article.source}</span>
                        <span>${formatDate(article.date)}</span>
                    </div>
                </div>
            `).join('');
        } else {
            headlinesHTML = '<p style="color: #6b7280;">No recent news available</p>';
        }
        
        dataEl.innerHTML = `
            <div class="data-grid">
                <div class="data-card">
                    <div class="data-card-label">Articles Analyzed</div>
                    <div class="data-card-value">${news.articlesCount || 0}</div>
                    <div class="data-card-subvalue">from ${news.source || 'unknown source'}</div>
                </div>
                
                <div class="data-card">
                    <div class="data-card-label">Overall Sentiment</div>
                    <div class="data-card-value">${sentiment.overall || 'N/A'}</div>
                    <div class="data-card-subvalue">Score: ${sentiment.score?.toFixed(2) || 'N/A'}</div>
                </div>
                
                <div class="data-card">
                    <div class="data-card-label">Trading Signal</div>
                    <div class="data-card-value">${signal.signal || 'N/A'}</div>
                    <div class="data-card-subvalue">
                        <span class="sentiment-badge ${getSignalClass(signal.signal)}">${signal.strength || 'N/A'}</span>
                    </div>
                    <div class="data-card-subvalue" style="margin-top: 0.5rem;">${signal.recommendation || ''}</div>
                </div>
                
                <div class="data-card">
                    <div class="data-card-label">Sentiment Distribution</div>
                    <div class="data-card-subvalue">
                        🟢 Bullish: ${typeof sentiment.bullish === 'number' ? sentiment.bullish : 0}%<br>
                        🔴 Bearish: ${typeof sentiment.bearish === 'number' ? sentiment.bearish : 0}%<br>
                        ⚪ Neutral: ${typeof sentiment.neutral === 'number' ? sentiment.neutral : 100}%
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 1.5rem;">
                <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">Recent Headlines</h3>
                ${headlinesHTML}
            </div>
        `;
    } else {
        statusEl.className = 'status-indicator-inline status-error';
        statusEl.textContent = '✗ Error';
        dataEl.innerHTML = `<p style="color: #ef4444;">Failed to load news data: ${data.data.news?.error || 'Unknown error'}</p>`;
    }
}

function updateFundamentalData(data) {
    const statusEl = document.getElementById('fundamentalStatus');
    const dataEl = document.getElementById('fundamentalData');
    
    if (data.status.fundamental === 'success') {
        statusEl.className = 'status-indicator-inline status-success';
        statusEl.textContent = '✓ Active';
        
        const fundamental = data.data.fundamental;
        const profile = fundamental.profile || {};
        const valuation = fundamental.valuation || {};
        const canslim = fundamental.canSlimFactors || {};
        
        let canslimHTML = '';
        if (Object.keys(canslim).length > 0) {
            canslimHTML = `
                <div style="margin-top: 1.5rem;">
                    <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 1rem;">CAN SLIM Factors</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Factor</th>
                                <th>Grade</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(canslim).map(([key, value]) => `
                                <tr>
                                    <td>${key}</td>
                                    <td><span class="canslim-grade grade-${(value.grade || 'f').toLowerCase()}">${value.grade || 'F'}</span></td>
                                    <td>${value.score?.toFixed(2) || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        dataEl.innerHTML = `
            <div class="data-grid">
                <div class="data-card">
                    <div class="data-card-label">CAN SLIM Score</div>
                    <div class="data-card-value">${fundamental.score?.toFixed(1) || 'N/A'}</div>
                    <div class="data-card-subvalue">
                        <span class="canslim-grade grade-${(fundamental.grade || 'f').toLowerCase()}">${fundamental.grade || 'F'}</span>
                        <span style="margin-left: 0.5rem;">${fundamental.rating || 'N/A'}</span>
                    </div>
                </div>
                
                <div class="data-card">
                    <div class="data-card-label">Company</div>
                    <div class="data-card-value" style="font-size: 1rem;">${profile.name || currentTicker}</div>
                    <div class="data-card-subvalue">
                        ${profile.sector || 'N/A'}<br>
                        ${profile.industry || 'N/A'}
                    </div>
                </div>
                
                <div class="data-card">
                    <div class="data-card-label">Market Cap</div>
                    <div class="data-card-value" style="font-size: 1.25rem;">${formatMarketCap(valuation.marketCap) || 'N/A'}</div>
                </div>
                
                <div class="data-card">
                    <div class="data-card-label">
                        P/E Ratio
                        <span class="tooltip-icon" data-tooltip="Price-to-Earnings Ratio:\nShows if stock is expensive or cheap\n\nGuidelines:\n• PE < 15: Undervalued (cheap)\n• PE 15-25: Fair value\n• PE 25-40: Expensive\n• PE > 40: Very expensive (growth stock)\n\nCompare with:\n• Industry average\n• S&P 500 average (~20-25)">ℹ️</span>
                    </div>
                    <div class="data-card-value">${valuation.pe || 'N/A'}</div>
                    <div class="data-card-subvalue" style="margin-top: 0.5rem; font-weight: 600; color: ${getPEColor(valuation.pe)};">
                        ${getPEAssessment(valuation.pe)}
                    </div>
                </div>
            </div>
            ${canslimHTML}
            <div style="margin-top: 1rem; padding: 1rem; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0.5rem;">
                <p style="color: #92400e; font-size: 0.875rem;">
                    <strong>Note:</strong> Fundamental data from ${fundamental.source || 'API'}
                </p>
            </div>
        `;
    } else if (data.status.fundamental === 'limited') {
        statusEl.className = 'status-indicator-inline status-loading';
        statusEl.textContent = '⚠ Limited';
        dataEl.innerHTML = `
            <p style="color: #f59e0b;">${data.data.fundamental?.error || 'Limited data available'}</p>
            <p style="color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem;">${data.data.fundamental?.note || ''}</p>
        `;
    } else {
        statusEl.className = 'status-indicator-inline status-error';
        statusEl.textContent = '✗ Error';
        dataEl.innerHTML = `<p style="color: #ef4444;">Failed to load fundamental data: ${data.data.fundamental?.error || 'Unknown error'}</p>`;
    }
}

function updateMarketSentiment(data) {
    const statusEl = document.getElementById('marketSentimentStatus');
    const dataEl = document.getElementById('marketSentimentData');
    
    if (data.status.marketSentiment === 'success') {
        statusEl.className = 'status-indicator-inline status-success';
        statusEl.textContent = '✓ Active';
        
        const sentiment = data.data.marketSentiment;
        const fearGreed = sentiment.fearGreed || {};
        const vix = sentiment.vix || {};
        
        dataEl.innerHTML = `
            <div class="data-grid">
                <div class="data-card" style="border-left-color: ${getFearGreedColor(fearGreed.value)};">
                    <div class="data-card-label">CNN Fear & Greed Index</div>
                    <div class="data-card-value">${fearGreed.value || 'N/A'}</div>
                    <div class="data-card-subvalue">
                        <strong style="color: ${getFearGreedColor(fearGreed.value)};">${fearGreed.emotion || 'N/A'}</strong><br>
                        ${fearGreed.valueText || ''}
                    </div>
                </div>
                
                <div class="data-card" style="border-left-color: ${getVIXColor(vix.value)};">
                    <div class="data-card-label">VIX (Volatility Index)</div>
                    <div class="data-card-value">${vix.value?.toFixed(2) || 'N/A'}</div>
                    <div class="data-card-subvalue">
                        <strong style="color: ${getVIXColor(vix.value)};">${vix.interpretation || 'N/A'}</strong><br>
                        ${vix.signal || ''}
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 1.5rem; padding: 1rem; background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 0.5rem;">
                <h4 style="font-weight: 600; margin-bottom: 0.5rem;">Market Sentiment Interpretation</h4>
                <p style="color: #374151; line-height: 1.6;">
                    The market is currently showing <strong>${fearGreed.emotion?.toLowerCase() || 'neutral'}</strong> sentiment 
                    with <strong>${vix.interpretation?.toLowerCase() || 'normal'}</strong> volatility. 
                    ${getFearGreedAnalysis(fearGreed.value, vix.value)}
                </p>
            </div>
        `;
    } else {
        statusEl.className = 'status-indicator-inline status-error';
        statusEl.textContent = '✗ Error';
        dataEl.innerHTML = `<p style="color: #ef4444;">Failed to load market sentiment: ${data.data.marketSentiment?.error || 'Unknown error'}</p>`;
    }
}

// Helper functions
function formatVolume(volume) {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getSignalClass(signal) {
    if (!signal) return 'sentiment-neutral';
    const s = signal.toLowerCase();
    if (s.includes('buy') || s.includes('bullish') || s.includes('strong')) return 'sentiment-bullish';
    if (s.includes('sell') || s.includes('bearish') || s.includes('weak')) return 'sentiment-bearish';
    return 'sentiment-neutral';
}

function getSentimentClass(sentiment) {
    if (!sentiment) return 'sentiment-neutral';
    const s = sentiment.toLowerCase();
    if (s.includes('bullish') || s.includes('positive')) return 'sentiment-bullish';
    if (s.includes('bearish') || s.includes('negative')) return 'sentiment-bearish';
    return 'sentiment-neutral';
}

function getFearGreedColor(value) {
    if (!value) return '#6b7280';
    if (value < 25) return '#ef4444'; // Extreme Fear - Red
    if (value < 45) return '#f59e0b'; // Fear - Orange
    if (value < 55) return '#6b7280'; // Neutral - Gray
    if (value < 75) return '#10b981'; // Greed - Green
    return '#8b5cf6'; // Extreme Greed - Purple
}

function getVIXColor(value) {
    if (!value) return '#6b7280';
    if (value < 12) return '#10b981'; // Low volatility - Green
    if (value < 20) return '#6b7280'; // Normal - Gray
    if (value < 30) return '#f59e0b'; // High - Orange
    return '#ef4444'; // Very high - Red
}

function getFearGreedAnalysis(fearGreedValue, vixValue) {
    if (!fearGreedValue || !vixValue) return '';
    
    if (fearGreedValue < 25 && vixValue > 30) {
        return 'High fear combined with high volatility suggests significant market uncertainty. Consider defensive positions.';
    } else if (fearGreedValue > 75 && vixValue < 15) {
        return 'Extreme greed with low volatility may indicate an overheated market. Consider taking profits.';
    } else if (fearGreedValue < 45 && vixValue < 20) {
        return 'Moderate fear with normal volatility could present buying opportunities.';
    } else if (fearGreedValue > 55 && vixValue < 20) {
        return 'Positive sentiment with low volatility suggests a healthy uptrend.';
    }
    return 'Market conditions are mixed. Consider both technical and fundamental factors.';
}

function showError(message) {
    alert(message);
}

function formatMarketCap(marketCap) {
    if (!marketCap || marketCap === 'N/A') return 'N/A';
    const num = typeof marketCap === 'string' ? parseFloat(marketCap) : marketCap;
    if (isNaN(num)) return 'N/A';
    
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(0)}`;
}

function getPEColor(pe) {
    if (!pe || pe === 'N/A') return '#6b7280';
    const ratio = parseFloat(pe);
    if (isNaN(ratio)) return '#6b7280';
    
    if (ratio < 15) return '#10b981'; // Undervalued - Green
    if (ratio < 25) return '#3b82f6'; // Fair - Blue
    if (ratio < 40) return '#f59e0b'; // Expensive - Orange
    return '#ef4444'; // Very expensive - Red
}

function getPEAssessment(pe) {
    if (!pe || pe === 'N/A') return 'No data';
    const ratio = parseFloat(pe);
    if (isNaN(ratio)) return 'No data';
    
    if (ratio < 0) return '⚠️ Negative (company losing money)';
    if (ratio < 10) return '📉 Very Undervalued (bargain)';
    if (ratio < 15) return '💰 Undervalued (good value)';
    if (ratio < 20) return '✅ Fair Value';
    if (ratio < 25) return '📊 Slightly Expensive';
    if (ratio < 35) return '📈 Expensive';
    if (ratio < 50) return '🔥 Very Expensive (growth stock)';
    return '⚠️ Extremely Expensive (bubble risk)';
}
