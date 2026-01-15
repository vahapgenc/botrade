// Watchlist Management JavaScript

let watchlists = [];
let currentWatchlist = null;
let editingWatchlistId = null;

// API Base URL
const API_BASE = window.location.origin;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadWatchlists();
});

// Load all watchlists
async function loadWatchlists() {
    try {
        const response = await fetch(`${API_BASE}/api/watchlist`);
        const data = await response.json();
        
        if (data.success) {
            watchlists = data.watchlists;
            renderWatchlistSidebar();
        } else {
            showError('Failed to load watchlists');
        }
    } catch (error) {
        console.error('Error loading watchlists:', error);
        showError('Failed to load watchlists');
    }
}

// Render watchlist sidebar
function renderWatchlistSidebar() {
    const listContainer = document.getElementById('watchlistList');
    
    if (watchlists.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <p>No watchlists yet</p>
                <button class="btn btn-primary" onclick="showCreateWatchlistModal()">Create One</button>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = watchlists.map(wl => `
        <div class="watchlist-item ${currentWatchlist?.id === wl.id ? 'active' : ''}" 
             onclick="selectWatchlist(${wl.id})">
            <div class="watchlist-info">
                <div class="watchlist-name">${escapeHtml(wl.name)}</div>
                <div class="watchlist-count">${wl._count.stocks} stocks</div>
            </div>
            <div class="watchlist-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); editWatchlist(${wl.id})" title="Rename">
                    ✏️
                </button>
                <button class="btn-icon" onclick="event.stopPropagation(); deleteWatchlist(${wl.id})" title="Delete">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

// Select and load watchlist
async function selectWatchlist(id) {
    try {
        const response = await fetch(`${API_BASE}/api/watchlist/${id}`);
        const data = await response.json();
        
        if (data.success) {
            currentWatchlist = data.watchlist;
            renderWatchlistSidebar();
            renderWatchlistContent();
        } else {
            showError('Failed to load watchlist');
        }
    } catch (error) {
        console.error('Error loading watchlist:', error);
        showError('Failed to load watchlist');
    }
}

// Render watchlist content
function renderWatchlistContent() {
    const contentContainer = document.getElementById('watchlistContent');
    
    if (!currentWatchlist) {
        contentContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>Select a watchlist to view stocks</h3>
                <p>Or create a new watchlist to get started</p>
            </div>
        `;
        return;
    }
    
    const stocks = currentWatchlist.stocks || [];
    
    contentContainer.innerHTML = `
        <div class="watchlist-header">
            <div>
                <h2>${escapeHtml(currentWatchlist.name)}</h2>
                ${currentWatchlist.description ? `<p style="color: #888;">${escapeHtml(currentWatchlist.description)}</p>` : ''}
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="refreshWatchlist()">🔄 Refresh</button>
                <button class="btn btn-success" onclick="showAddStockModal()">➕ Add Stock</button>
            </div>
        </div>
        
        ${stocks.length === 0 ? `
            <div class="empty-state">
                <div class="empty-state-icon">📈</div>
                <h3>No stocks in this watchlist</h3>
                <button class="btn btn-success" onclick="showAddStockModal()">Add Your First Stock</button>
            </div>
        ` : `
            <table class="stock-table">
                <thead>
                    <tr>
                        <th>Symbol</th>
                        <th>Price</th>
                        <th>Change</th>
                        <th>Market Cap</th>
                        <th>Sector</th>
                        <th>AI Analysis</th>
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

// Render individual stock row
function renderStockRow(stock) {
    const priceChangeClass = stock.priceChange > 0 ? 'price-positive' : stock.priceChange < 0 ? 'price-negative' : '';
    const priceChangeSymbol = stock.priceChange > 0 ? '+' : '';
    
    return `
        <tr>
            <td>
                <div class="tooltip stock-symbol">
                    ${escapeHtml(stock.ticker)}
                    ${stock.companyName ? `<span class="tooltip-text">${escapeHtml(stock.companyName)}</span>` : ''}
                </div>
            </td>
            <td>
                ${stock.currentPrice ? `$${stock.currentPrice.toFixed(2)}` : '-'}
            </td>
            <td class="${priceChangeClass}">
                ${stock.priceChange && stock.priceChangePct ? 
                    `${priceChangeSymbol}$${stock.priceChange.toFixed(2)} (${priceChangeSymbol}${stock.priceChangePct.toFixed(2)}%)` 
                    : '-'}
            </td>
            <td class="market-cap">
                ${stock.marketCap ? formatMarketCap(stock.marketCap) : '-'}
            </td>
            <td>
                ${stock.sector ? escapeHtml(stock.sector) : '-'}
            </td>
            <td>
                ${renderAIAnalysis(stock.aiAnalysis)}
            </td>
            <td>
                <button class="btn-icon" onclick="removeStock(${stock.id})" title="Remove from watchlist">
                    ❌
                </button>
            </td>
        </tr>
    `;
}

// Render AI analysis
function renderAIAnalysis(aiAnalysis) {
    if (!aiAnalysis) {
        return '<span style="color: #888;">No analysis</span>';
    }
    
    const badgeClass = `ai-${aiAnalysis.decision.toLowerCase()}`;
    const confidence = aiAnalysis.confidence || 0;
    
    return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
                <span class="ai-badge ${badgeClass}">${aiAnalysis.decision}</span>
            </div>
            <div class="confidence-bar">
                <div class="confidence-fill">
                    <div class="confidence-fill-inner" style="width: ${confidence}%"></div>
                </div>
                <span style="font-size: 0.85rem; opacity: 0.8;">${confidence}%</span>
            </div>
            ${aiAnalysis.riskLevel ? `<div style="font-size: 0.8rem; opacity: 0.7;">Risk: ${aiAnalysis.riskLevel}</div>` : ''}
        </div>
    `;
}

// Show create watchlist modal
function showCreateWatchlistModal() {
    editingWatchlistId = null;
    document.getElementById('modalTitle').textContent = 'Create Watchlist';
    document.getElementById('watchlistName').value = '';
    document.getElementById('watchlistDescription').value = '';
    showModal('watchlistModal');
}

// Edit watchlist
function editWatchlist(id) {
    const watchlist = watchlists.find(wl => wl.id === id);
    if (!watchlist) return;
    
    editingWatchlistId = id;
    document.getElementById('modalTitle').textContent = 'Rename Watchlist';
    document.getElementById('watchlistName').value = watchlist.name;
    document.getElementById('watchlistDescription').value = watchlist.description || '';
    showModal('watchlistModal');
}

// Save watchlist (create or update)
async function saveWatchlist(event) {
    event.preventDefault();
    
    const name = document.getElementById('watchlistName').value.trim();
    const description = document.getElementById('watchlistDescription').value.trim();
    
    try {
        const url = editingWatchlistId 
            ? `${API_BASE}/api/watchlist/${editingWatchlistId}`
            : `${API_BASE}/api/watchlist`;
        
        const method = editingWatchlistId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('watchlistModal');
            await loadWatchlists();
            
            if (!editingWatchlistId) {
                // Auto-select newly created watchlist
                await selectWatchlist(data.watchlist.id);
            }
            
            showSuccess(editingWatchlistId ? 'Watchlist updated' : 'Watchlist created');
        } else {
            showError(data.error || 'Failed to save watchlist');
        }
    } catch (error) {
        console.error('Error saving watchlist:', error);
        showError('Failed to save watchlist');
    }
}

// Delete watchlist
async function deleteWatchlist(id) {
    if (!confirm('Are you sure you want to delete this watchlist? All stocks will be removed.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/watchlist/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (currentWatchlist?.id === id) {
                currentWatchlist = null;
                renderWatchlistContent();
            }
            await loadWatchlists();
            showSuccess('Watchlist deleted');
        } else {
            showError(data.error || 'Failed to delete watchlist');
        }
    } catch (error) {
        console.error('Error deleting watchlist:', error);
        showError('Failed to delete watchlist');
    }
}

// Show add stock modal
function showAddStockModal() {
    if (!currentWatchlist) {
        showError('Please select a watchlist first');
        return;
    }
    
    document.getElementById('stockTicker').value = '';
    document.getElementById('stockCompanyName').value = '';
    document.getElementById('stockSector').value = '';
    document.getElementById('stockNotes').value = '';
    showModal('addStockModal');
}

// Add stock to watchlist
async function addStock(event) {
    event.preventDefault();
    
    if (!currentWatchlist) return;
    
    const ticker = document.getElementById('stockTicker').value.trim().toUpperCase();
    const companyName = document.getElementById('stockCompanyName').value.trim();
    const sector = document.getElementById('stockSector').value.trim();
    const notes = document.getElementById('stockNotes').value.trim();
    
    try {
        const response = await fetch(`${API_BASE}/api/watchlist/${currentWatchlist.id}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, companyName, sector, notes })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeModal('addStockModal');
            await selectWatchlist(currentWatchlist.id); // Reload watchlist
            showSuccess(`${ticker} added to watchlist`);
        } else {
            showError(data.error || 'Failed to add stock');
        }
    } catch (error) {
        console.error('Error adding stock:', error);
        showError('Failed to add stock');
    }
}

// Remove stock from watchlist
async function removeStock(stockId) {
    if (!confirm('Remove this stock from the watchlist?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/watchlist/${currentWatchlist.id}/stocks/${stockId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            await selectWatchlist(currentWatchlist.id); // Reload watchlist
            showSuccess('Stock removed from watchlist');
        } else {
            showError(data.error || 'Failed to remove stock');
        }
    } catch (error) {
        console.error('Error removing stock:', error);
        showError('Failed to remove stock');
    }
}

// Refresh watchlist data
async function refreshWatchlist() {
    if (!currentWatchlist) return;
    
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⏳ Refreshing...';
    
    try {
        await selectWatchlist(currentWatchlist.id);
        showSuccess('Watchlist refreshed');
    } catch (error) {
        showError('Failed to refresh watchlist');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Refresh';
    }
}

// Utility functions
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMarketCap(value) {
    if (!value) return '-';
    
    const num = parseFloat(value);
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
}

function showSuccess(message) {
    // You can implement a toast notification here
    console.log('Success:', message);
    alert(message);
}

function showError(message) {
    console.error('Error:', message);
    alert('Error: ' + message);
}
