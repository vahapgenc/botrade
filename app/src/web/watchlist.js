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
function renderWatchlistGrid(filteredList = null) {
    const grid = document.getElementById('watchlistGrid');
    const listToRender = filteredList || watchlists;
    
    if (listToRender.length === 0) {
        if (filteredList !== null) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <h3>No Watchlists Found</h3>
                    <p>Try a different search term</p>
                </div>
            `;
        } else {
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
        }
        return;
    }
    
    grid.innerHTML = listToRender.map(wl => {
        const stockCount = wl._count?.stocks || 0;
        const description = wl.description || 'No description';
        const emoji = getWatchlistEmoji(wl.name);
        
        return `
            <div class="watchlist-card" onclick="loadWatchlistStocks(${wl.id})" title="${escapeHtml(description)}">
                <div class="watchlist-card-header">
                    <div class="watchlist-emoji">${emoji}</div>
                    <div class="watchlist-card-info">
                        <div class="watchlist-card-title">
                            <span>${escapeHtml(wl.name)}</span>
                            ${description && description !== 'No description' ? '<span class="tooltip-icon" title="' + escapeHtml(description) + '">ℹ️</span>' : ''}
                        </div>
                        <div class="watchlist-card-count">${stockCount} stock${stockCount !== 1 ? 's' : ''}</div>
                    </div>
                </div>
                <div class="watchlist-card-actions">
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
        `;
    }).join('');
}

// Get emoji for watchlist based on name
function getWatchlistEmoji(name) {
    const lowerName = name.toLowerCase();
    
    // Health & Biotech
    if (lowerName.includes('biotech') || lowerName.includes('health') || lowerName.includes('sağlık')) return '🧬';
    
    // Finance & Banking
    if (lowerName.includes('finance') || lowerName.includes('finans') || lowerName.includes('bank')) return '💰';
    
    // Technology & IoT
    if (lowerName.includes('quantum') || lowerName.includes('kuantum') || lowerName.includes('iot')) return '⚛️';
    
    // AR/VR/Metaverse
    if (lowerName.includes('ar/vr') || lowerName.includes('metaverse') || lowerName.includes('gerçeklik')) return '🥽';
    
    // Space & Aerospace
    if (lowerName.includes('space') || lowerName.includes('uzay') || lowerName.includes('aerospace')) return '🚀';
    
    // Battery & Energy
    if (lowerName.includes('battery') || lowerName.includes('batarya') || lowerName.includes('energy')) return '🔋';
    
    // Falling/High Yield
    if (lowerName.includes('falling') || lowerName.includes('angel') || lowerName.includes('yield')) return '📉';
    
    // Best Performing/Wings
    if (lowerName.includes('best') || lowerName.includes('super') || lowerName.includes('wing') || lowerName.includes('top')) return '⭐';
    
    // Default
    return '📊';
}

// Filter watchlists by search term
function filterWatchlists(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
        renderWatchlistGrid();
        return;
    }
    
    const filtered = watchlists.filter(wl => 
        wl.name.toLowerCase().includes(term) || 
        (wl.description && wl.description.toLowerCase().includes(term))
    );
    
    renderWatchlistGrid(filtered);
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
            <button class="btn btn-success" onclick="showStockModal()">
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
                <button class="btn btn-success" onclick="showStockModal()" style="margin-top: 1rem;">
                    Add Stock
                </button>
            </div>
        ` : `
            <table class="stock-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Symbol</th>
                        <th>Company Name</th>
                        <th>Price</th>
                        <th>Change</th>
                        <th>Since Added</th>
                        <th>Market Cap</th>
                        <th>Sector</th>
                        <th>Rating</th>
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
    // Use enriched data from API
    const price = stock.currentPrice ? `$${stock.currentPrice.toFixed(2)}` : 'N/A';
    const change = stock.priceChange || 0;
    const changePercent = stock.priceChangePct || 0;
    const marketCap = stock.marketCap ? formatMarketCap(stock.marketCap) : 'N/A';
    const changeClass = change >= 0 ? 'price-positive' : 'price-negative';
    const changeSign = change >= 0 ? '+' : '';
    
    // Calculate change since added to watchlist
    const priceWhenAdded = stock.priceWhenAdded ? parseFloat(stock.priceWhenAdded) : null;
    const currentPrice = stock.currentPrice || 0;
    let sinceAddedChange = 0;
    let sinceAddedPercent = 0;
    let sinceAddedClass = '';
    let sinceAddedSign = '';
    
    if (priceWhenAdded && currentPrice) {
        sinceAddedChange = currentPrice - priceWhenAdded;
        sinceAddedPercent = (sinceAddedChange / priceWhenAdded) * 100;
        sinceAddedClass = sinceAddedChange >= 0 ? 'price-positive' : 'price-negative';
        sinceAddedSign = sinceAddedChange >= 0 ? '+' : '';
    }
    
    // Get AI analysis data
    const recommendation = stock.aiAnalysis?.decision || 'N/A';
    const confidence = stock.aiAnalysis?.confidence || 0;
    
    let aiBadgeClass = 'ai-hold';
    if (recommendation === 'BUY') aiBadgeClass = 'ai-buy';
    else if (recommendation === 'SELL') aiBadgeClass = 'ai-sell';

    const getRatingClass = (r) => {
        if (!r) return '';
        if (r.toUpperCase().includes('STRONG')) return 'ai-buy';
        if (r.toUpperCase().includes('BUY')) return 'ai-buy';
        return '';
    };
    
    return `
        <tr>
            <td style="font-weight: bold;">${stock.rank || '-'}</td>
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
            <td ${priceWhenAdded ? `class="${sinceAddedClass}" title="Added at $${priceWhenAdded.toFixed(2)}"` : ''}>
                ${priceWhenAdded ? `${sinceAddedSign}${sinceAddedChange.toFixed(2)} (${sinceAddedSign}${sinceAddedPercent.toFixed(2)}%)` : 'N/A'}
            </td>
            <td class="market-cap">${marketCap}</td>
            <td>${escapeHtml(stock.sector || 'N/A')}</td>
            <td>
                <span class="ai-badge ${getRatingClass(stock.rating)}" style="width: auto; padding: 0.25rem 0.5rem; white-space: nowrap;">
                    ${escapeHtml(stock.rating || '-')}
                </span>
            </td>
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
                <button class="btn-icon" onclick="showStockModal(${stock.id})" title="Edit Stock">
                    ✏️
                </button>
                <button class="btn-icon" onclick="window.open('/options.html?ticker=${stock.ticker}', '_blank')" title="Options Analysis">
                    📊
                </button>
                <button class="btn-icon" onclick="removeStock(${currentWatchlistData.id}, ${stock.id})" title="Remove">
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

// Show stock modal (add or edit)
function showStockModal(stockId = null) {
    const isEdit = stockId !== null;
    const stock = isEdit ? currentWatchlistData.stocks.find(s => s.id === stockId) : null;
    
    document.getElementById('stockId').value = isEdit ? stockId : '';
    document.getElementById('stockModalTitle').textContent = isEdit ? 'Edit Stock' : 'Add Stock to Watchlist';
    document.getElementById('stockSubmitBtn').textContent = isEdit ? 'Update Stock' : 'Add Stock';
    
    // Ticker field
    const tickerInput = document.getElementById('stockTicker');
    tickerInput.value = isEdit ? stock.ticker : '';
    tickerInput.disabled = isEdit; // Disable ticker editing
    
    // Other fields
    document.getElementById('stockRank').value = isEdit ? (stock.rank || '') : '';
    document.getElementById('stockRating').value = isEdit ? (stock.rating || '') : '';
    document.getElementById('stockNotes').value = isEdit ? (stock.notes || '') : '';
    
    document.getElementById('stockModal').classList.add('active');
}

// Hide stock modal
function hideStockModal() {
    document.getElementById('stockModal').classList.remove('active');
}

// Save stock (Add or Update)
async function saveStock(event) {
    event.preventDefault();
    
    const stockId = document.getElementById('stockId').value;
    const ticker = document.getElementById('stockTicker').value.toUpperCase().trim();
    const rank = document.getElementById('stockRank').value;
    const rating = document.getElementById('stockRating').value;
    const notes = document.getElementById('stockNotes').value;
    
    if (!currentWatchlistId) {
        alert('No watchlist selected');
        return;
    }
    
    try {
        const isEdit = !!stockId;
        const url = isEdit 
            ? `/api/watchlist/${currentWatchlistId}/stocks/${stockId}`
            : `/api/watchlist/${currentWatchlistId}/stocks`;
        
        const method = isEdit ? 'PUT' : 'POST';
        
        const body = {
            rating, 
            rank: rank || null,
            notes
        };
        
        // Only include ticker for new stocks
        if (!isEdit) {
            body.ticker = ticker;
        }
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save stock');
        }
        
        hideStockModal();
        
        // Reload the watchlist
        await loadWatchlistStocks(currentWatchlistId);
        
        // Reload watchlists to update counts if added
        if (!isEdit) {
            await loadWatchlists();
        }
    } catch (error) {
        console.error('Error saving stock:', error);
        alert('Failed to save stock: ' + error.message);
    }
}

// Remove stock
async function removeStock(watchlistId, stockId) {
    if (!confirm(`Remove this stock from the watchlist?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/watchlist/${watchlistId}/stocks/${stockId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to remove stock');
        }
        
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
