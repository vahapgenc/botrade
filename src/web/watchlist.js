// Watchlist Management System
let watchlists = [];
let currentWatchlistId = null;
let currentWatchlistData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateTime();
    setInterval(updateTime, 1000);
    loadWatchlists();
});

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

// Load all watchlists
async function loadWatchlists() {
    try {
        const response = await fetch('/api/watchlist');
        if (!response.ok) throw new Error('Failed to load watchlists');
        
        const data = await response.json();
        watchlists = data.success ? data.watchlists : [];
        renderWatchlistGrid();
    } catch (error) {
        console.error('Error loading watchlists:', error);
        document.getElementById('watchlistGrid').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Failed to load watchlists</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Render watchlist grid
function renderWatchlistGrid() {
    const grid = document.getElementById('watchlistGrid');
    
    if (watchlists.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No Watchlists Yet</h3>
                <p>Create your first watchlist to start tracking stocks</p>
                <button class="btn btn-primary" onclick="showCreateWatchlistModal()" style="margin-top: 1rem;">
                    Create Watchlist
                </button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = watchlists.map(wl => {
        const stockCount = wl._count?.stocks || 0;
        const description = wl.description || 'No description';
        const gradient = getGradient(wl.id);
        
        return `
            <div class="watchlist-card" onclick="loadWatchlistStocks(${wl.id})" style="cursor: pointer;">
                <div class="watchlist-header" style="background: ${gradient};">
                    <div class="watchlist-name">${escapeHtml(wl.name)}</div>
                    <div class="watchlist-count">${stockCount} stock${stockCount !== 1 ? 's' : ''}</div>
                </div>
                <div class="watchlist-body">
                    <p style="color: #888; margin-bottom: 1rem;">${escapeHtml(description)}</p>
                    <div class="watchlist-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); showAddStockModal(${wl.id})" title="Add Stock">
                            ➕
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); editWatchlist(${wl.id})" title="Edit">
                            ✏️
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); deleteWatchlist(${wl.id})" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Get gradient for watchlist card
function getGradient(id) {
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    ];
    return gradients[id % gradients.length];
}

// Load watchlist stocks
async function loadWatchlistStocks(watchlistId) {
    currentWatchlistId = watchlistId;
    
    try {
        const response = await fetch(`/api/watchlist/${watchlistId}`);
        if (!response.ok) throw new Error('Failed to load watchlist details');
        
        const data = await response.json();
        currentWatchlistData = data.success ? data.watchlist : null;
        
        if (!currentWatchlistData) {
            throw new Error('Invalid watchlist data');
        }
        
        showStocksView();
    } catch (error) {
        console.error('Error loading watchlist stocks:', error);
        alert('Failed to load watchlist stocks: ' + error.message);
    }
}

// Show stocks view
function showStocksView() {
    document.getElementById('watchlistsView').style.display = 'none';
    document.getElementById('stocksView').style.display = 'block';
    renderStocks();
}

// Show watchlists view
function showWatchlists() {
    document.getElementById('stocksView').style.display = 'none';
    document.getElementById('watchlistsView').style.display = 'block';
    currentWatchlistId = null;
    currentWatchlistData = null;
}

// Render stocks table
function renderStocks() {
    const content = document.getElementById('stocksContent');
    
    if (!currentWatchlistData) {
        content.innerHTML = '<div class="empty-state"><h3>No data available</h3></div>';
        return;
    }
    
    const stocks = currentWatchlistData.stocks || [];
    
    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <h1 class="page-title">${escapeHtml(currentWatchlistData.name)}</h1>
                <p class="page-subtitle">${escapeHtml(currentWatchlistData.description || 'No description')}</p>
            </div>
            <button class="btn btn-success" onclick="showAddStockModal(${currentWatchlistData.id})">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: inline; vertical-align: middle;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add Stock
            </button>
        </div>
        
        ${stocks.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">📈</div>
                <h3>No Stocks Yet</h3>
                <p>Add stocks to this watchlist to start tracking</p>
                <button class="btn btn-success" onclick="showAddStockModal(${currentWatchlistData.id})" style="margin-top: 1rem;">
                    Add Stock
                </button>
            </div>
        ` : `
            <table class="stock-table">
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Company Name</th>
                        <th>Price</th>
                        <th>Change</th>
                        <th>Market Cap</th>
                        <th>Sector</th>
                        <th>AI Analysis</th>
                        <th>Confidence</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${stocks.map(stock => renderStockRow(stock)).join('')}
                </tbody>
            </table>
        `}
    `;
}

// Render stock row
function renderStockRow(stock) {
    const marketData = stock.marketData || {};
    const aiAnalysis = stock.aiAnalysis || {};
    
    const price = marketData.price ? `$${marketData.price.toFixed(2)}` : 'N/A';
    const change = marketData.change || 0;
    const changePercent = marketData.changePercent || 0;
    const marketCap = marketData.marketCap ? formatMarketCap(marketData.marketCap) : 'N/A';
    const changeClass = change >= 0 ? 'price-positive' : 'price-negative';
    const changeSign = change >= 0 ? '+' : '';
    
    const recommendation = aiAnalysis.recommendation || 'N/A';
    const confidence = aiAnalysis.confidence || 0;
    
    let aiBadgeClass = 'ai-hold';
    if (recommendation === 'BUY') aiBadgeClass = 'ai-buy';
    else if (recommendation === 'SELL') aiBadgeClass = 'ai-sell';
    
    return `
        <tr>
            <td>
                <span class="stock-symbol" title="${escapeHtml(stock.companyName || stock.ticker)}">
                    ${escapeHtml(stock.ticker)}
                </span>
            </td>
            <td>${escapeHtml(stock.companyName || 'Unknown')}</td>
            <td>${price}</td>
            <td class="${changeClass}">
                ${changeSign}${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)
            </td>
            <td class="market-cap">${marketCap}</td>
            <td>${escapeHtml(stock.sector || 'N/A')}</td>
            <td>
                <span class="ai-badge ${aiBadgeClass}">${recommendation}</span>
            </td>
            <td>
                <div class="confidence-bar">
                    <div class="confidence-fill">
                        <div class="confidence-fill-inner" style="width: ${confidence}%"></div>
                    </div>
                    <span style="font-size: 0.875rem;">${confidence}%</span>
                </div>
            </td>
            <td>
                <button class="btn-icon" onclick="removeStock(${currentWatchlistData.id}, '${stock.ticker}')" title="Remove">
                    🗑️
                </button>
            </td>
        </tr>
    `;
}

// Format market cap
function formatMarketCap(value) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
}

// Create watchlist modal
function showCreateWatchlistModal() {
    document.getElementById('modalTitle').textContent = 'Create Watchlist';
    document.getElementById('watchlistId').value = '';
    document.getElementById('watchlistName').value = '';
    document.getElementById('watchlistDescription').value = '';
    document.getElementById('watchlistModal').classList.add('active');
}

// Edit watchlist modal
function editWatchlist(id) {
    const watchlist = watchlists.find(wl => wl.id === id);
    if (!watchlist) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Watchlist';
    document.getElementById('watchlistId').value = watchlist.id;
    document.getElementById('watchlistName').value = watchlist.name;
    document.getElementById('watchlistDescription').value = watchlist.description || '';
    document.getElementById('watchlistModal').classList.add('active');
}

// Hide watchlist modal
function hideWatchlistModal() {
    document.getElementById('watchlistModal').classList.remove('active');
}

// Save watchlist
async function saveWatchlist(event) {
    event.preventDefault();
    
    const id = document.getElementById('watchlistId').value;
    const name = document.getElementById('watchlistName').value;
    const description = document.getElementById('watchlistDescription').value;
    
    try {
        const url = id ? `/api/watchlist/${id}` : '/api/watchlist';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        
        if (!response.ok) throw new Error('Failed to save watchlist');
        
        hideWatchlistModal();
        await loadWatchlists();
    } catch (error) {
        console.error('Error saving watchlist:', error);
        alert('Failed to save watchlist: ' + error.message);
    }
}

// Delete watchlist
async function deleteWatchlist(id) {
    if (!confirm('Are you sure you want to delete this watchlist? All stocks in it will be removed.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete watchlist');
        
        await loadWatchlists();
        if (currentWatchlistId === id) {
            showWatchlists();
        }
    } catch (error) {
        console.error('Error deleting watchlist:', error);
        alert('Failed to delete watchlist: ' + error.message);
    }
}

// Show add stock modal
function showAddStockModal(watchlistId) {
    currentWatchlistId = watchlistId;
    document.getElementById('stockTicker').value = '';
    document.getElementById('stockNotes').value = '';
    document.getElementById('addStockModal').classList.add('active');
}

// Hide add stock modal
function hideAddStockModal() {
    document.getElementById('addStockModal').classList.remove('active');
}

// Add stock
async function addStock(event) {
    event.preventDefault();
    
    const ticker = document.getElementById('stockTicker').value.toUpperCase().trim();
    const notes = document.getElementById('stockNotes').value;
    
    if (!currentWatchlistId) {
        alert('No watchlist selected');
        return;
    }
    
    try {
        const response = await fetch(`/api/watchlist/${currentWatchlistId}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, notes })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add stock');
        }
        
        hideAddStockModal();
        
        // Reload the watchlist if we're viewing it
        if (currentWatchlistData && currentWatchlistData.id === currentWatchlistId) {
            await loadWatchlistStocks(currentWatchlistId);
        }
        
        // Reload watchlists to update counts
        await loadWatchlists();
    } catch (error) {
        console.error('Error adding stock:', error);
        alert('Failed to add stock: ' + error.message);
    }
}

// Remove stock
async function removeStock(watchlistId, ticker) {
    if (!confirm(`Remove ${ticker} from this watchlist?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/watchlist/${watchlistId}/stocks/${ticker}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to remove stock');
        
        // Reload the watchlist
        await loadWatchlistStocks(watchlistId);
        await loadWatchlists();
    } catch (error) {
        console.error('Error removing stock:', error);
        alert('Failed to remove stock: ' + error.message);
    }
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
