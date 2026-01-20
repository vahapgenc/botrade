// Portfolio/Positions Page JavaScript

let positionsData = [];
let positionsPage = 1;
const itemsPerPage = 10;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPositions();
    
    // Refresh every 10 seconds
    setInterval(loadPositions, 10000);
});

// Load positions
async function loadPositions() {
    try {
        const response = await fetch('/api/trading/positions');
        const data = await response.json();
        
        const container = document.getElementById('positionsList');
        const positions = data.positions || [];

        if (positions.length === 0) {
            container.innerHTML = '<div style="padding: 3rem; text-align: center; color: #6b7280;">No positions yet. Place your first order to get started!</div>';
            document.getElementById('positionsPagination').innerHTML = '';
            return;
        }

        positionsData = positions;
        renderPositions();
    } catch (error) {
        console.error('Error loading positions:', error);
        document.getElementById('positionsList').innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">Error loading positions</div>';
    }
}

// Render positions
function renderPositions(filteredData = null) {
    const container = document.getElementById('positionsList');
    const positions = filteredData || positionsData;
    
    if (positions.length === 0) {
        container.innerHTML = '<div style="padding: 3rem; text-align: center; color: #6b7280;">No positions found</div>';
        document.getElementById('positionsPagination').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(positions.length / itemsPerPage);
    const startIdx = (positionsPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedPositions = positions.slice(startIdx, endIdx);

    const html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                <tr>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Symbol</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Type</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Order Date</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Quantity</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Avg Cost</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Market Value</th>
                </tr>
            </thead>
            <tbody>
                ${paginatedPositions.map(pos => `
                    <tr style="border-bottom: 1px solid #e5e7eb;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                        <td style="padding: 1rem 1.5rem; font-weight: 700;">${pos.symbol}</td>
                        <td style="padding: 1rem 1.5rem;">
                            <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; 
                                ${pos.secType === 'OPT' ? 'background: #f3e8ff; color: #7c3aed;' : 'background: #dbeafe; color: #2563eb;'}">
                                ${pos.secType === 'OPT' ? 'Option' : pos.secType || 'Stock'}
                            </span>
                        </td>
                        <td style="padding: 1rem 1.5rem; color: #6b7280;">
                            ${pos.entryDate ? new Date(pos.entryDate).toLocaleDateString() : '-'}
                        </td>
                        <td style="padding: 1rem 1.5rem;">${pos.position}</td>
                        <td style="padding: 1rem 1.5rem;">$${pos.averageCost?.toFixed(2) || '0.00'}</td>
                        <td style="padding: 1rem 1.5rem; font-weight: 600;">$${(pos.position * (pos.averageCost || 0)).toFixed(2)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    renderPagination(positions.length, totalPages);
}

// Render pagination
function renderPagination(totalItems, totalPages) {
    const container = document.getElementById('positionsPagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const startItem = (positionsPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(positionsPage * itemsPerPage, totalItems);

    let html = `
        <button onclick="changePage(${positionsPage - 1})" ${positionsPage === 1 ? 'disabled' : ''}>← Previous</button>
        <span>Showing ${startItem}-${endItem} of ${totalItems}</span>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= positionsPage - 2 && i <= positionsPage + 2)) {
            html += `<button onclick="changePage(${i})" class="${i === positionsPage ? 'active' : ''}">${i}</button>`;
        } else if (i === positionsPage - 3 || i === positionsPage + 3) {
            html += '<span>...</span>';
        }
    }

    html += `<button onclick="changePage(${positionsPage + 1})" ${positionsPage === totalPages ? 'disabled' : ''}>Next →</button>`;
    container.innerHTML = html;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(positionsData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    positionsPage = page;
    
    const searchTerm = document.getElementById('positionsSearch').value.toLowerCase();
    if (searchTerm) {
        filterPositions();
    } else {
        renderPositions();
    }
}

// Filter positions
function filterPositions() {
    const searchTerm = document.getElementById('positionsSearch').value.toLowerCase();
    positionsPage = 1;
    
    if (!searchTerm) {
        renderPositions();
        return;
    }

    const filtered = positionsData.filter(pos => 
        pos.symbol.toLowerCase().includes(searchTerm) ||
        pos.secType.toLowerCase().includes(searchTerm)
    );
    
    renderPositions(filtered);
}

// Modal functions (stock and option orders)
function openStockModal() {
    document.getElementById('stockModal').classList.add('active');
}

function closeStockModal() {
    document.getElementById('stockModal').classList.remove('active');
}

function openOptionModal() {
    document.getElementById('optionModal').classList.add('active');
}

function closeOptionModal() {
    document.getElementById('optionModal').classList.remove('active');
}

function toggleStockLimitPrice() {
    const orderType = document.getElementById('stockOrderType').value;
    document.getElementById('stockLimitPriceGroup').classList.toggle('hidden', orderType !== 'LMT');
}

function toggleOptionLimitPrice() {
    const orderType = document.getElementById('optionOrderType').value;
    document.getElementById('optionLimitPriceGroup').classList.toggle('hidden', orderType !== 'LMT');
}

function updateStockConfidenceColor(value) {
    // Optional: Add visual feedback for confidence level
}

function updateConfidenceColor(value) {
    // Optional: Add visual feedback for confidence level
}

function updateExpiryFormat() {
    const dateInput = document.getElementById('optionExpiryDate').value;
    if (dateInput) {
        const date = new Date(dateInput);
        const formatted = date.toISOString().split('T')[0].replace(/-/g, '');
        document.getElementById('optionExpiry').value = formatted;
    }
}

async function submitStockOrder(e) {
    e.preventDefault();
    
    const order = {
        symbol: document.getElementById('stockSymbol').value.toUpperCase(),
        action: document.getElementById('stockAction').value,
        quantity: parseInt(document.getElementById('stockQuantity').value),
        orderType: document.getElementById('stockOrderType').value,
        limitPrice: document.getElementById('stockLimitPrice').value || null,
        confidence: parseInt(document.getElementById('stockConfidence').value)
    };

    const btn = document.getElementById('stockSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Placing Order...';

    try {
        const response = await fetch('/api/trading/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert('stockAlert', 'Order placed successfully!', 'success');
            setTimeout(() => {
                closeStockModal();
                loadPositions();
            }, 2000);
        } else {
            showAlert('stockAlert', data.error || 'Failed to place order', 'error');
        }
    } catch (error) {
        showAlert('stockAlert', 'Error placing order: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Place Order';
    }
}

async function submitOptionOrder(e) {
    e.preventDefault();
    
    const order = {
        symbol: document.getElementById('optionSymbol').value.toUpperCase(),
        action: document.getElementById('optionAction').value,
        right: document.getElementById('optionType').value,
        strike: parseFloat(document.getElementById('optionStrike').value),
        expiry: document.getElementById('optionExpiry').value,
        quantity: parseInt(document.getElementById('optionQuantity').value),
        orderType: document.getElementById('optionOrderType').value,
        limitPrice: document.getElementById('optionLimitPrice').value || null,
        confidence: parseInt(document.getElementById('optionConfidence').value),
        instrumentType: 'OPTION'
    };

    const btn = document.getElementById('optionSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> Placing Order...';

    try {
        const response = await fetch('/api/trading/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert('optionAlert', 'Option order placed successfully!', 'success');
            setTimeout(() => {
                closeOptionModal();
                loadPositions();
            }, 2000);
        } else {
            showAlert('optionAlert', data.error || 'Failed to place order', 'error');
        }
    } catch (error) {
        showAlert('optionAlert', 'Error placing order: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Place Option Order';
    }
}

function showAlert(elementId, message, type) {
    const alert = document.getElementById(elementId);
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.classList.remove('hidden');
    
    setTimeout(() => alert.classList.add('hidden'), 5000);
}
