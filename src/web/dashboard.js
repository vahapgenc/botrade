// Dashboard JavaScript
let statsRefreshInterval;
let currentView = 'dashboard';

// Pagination state
let positionsData = [];
let ordersData = [];
let positionsPage = 1;
let ordersPage = 1;
const itemsPerPage = 10;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    updateTime();
    setInterval(updateTime, 1000);
    checkStatus();
    refreshDashboard();
    
    // Refresh data every 10 seconds
    statsRefreshInterval = setInterval(() => {
        checkStatus();
        if (currentView === 'dashboard') {
            refreshDashboard();
        } else if (currentView === 'positions') {
            loadPositions();
        } else if (currentView === 'orders') {
            loadOrders();
        }
    }, 10000);
});

// Navigation
function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchView(page);
        });
    });
}

function switchView(view) {
    currentView = view;
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === view);
    });
    
    // Hide all views
    document.getElementById('dashboardView').classList.add('hidden');
    document.getElementById('positionsView').classList.add('hidden');
    document.getElementById('ordersView').classList.add('hidden');
    
    // Show selected view
    if (view === 'dashboard') {
        document.getElementById('dashboardView').classList.remove('hidden');
        refreshDashboard();
    } else if (view === 'positions') {
        document.getElementById('positionsView').classList.remove('hidden');
        loadPositions();
    } else if (view === 'orders') {
        document.getElementById('ordersView').classList.remove('hidden');
        loadOrders();
    }
}

// Update time
function updateTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleString();
}

// Check TWS connection status
async function checkStatus() {
    try {
        const response = await fetch('/api/trading/status');
        const data = await response.json();
        
        const badge = document.getElementById('statusBadge');
        const text = document.getElementById('statusText');
        
        if (data.success && data.connected) {
            badge.className = 'status-badge connected';
            text.textContent = 'TWS Connected';
        } else {
            badge.className = 'status-badge disconnected';
            text.textContent = 'TWS Disconnected';
        }
    } catch (error) {
        const badge = document.getElementById('statusBadge');
        const text = document.getElementById('statusText');
        badge.className = 'status-badge disconnected';
        text.textContent = 'API Error';
    }
}

// Refresh dashboard data
async function refreshDashboard() {
    try {
        // Fetch positions, orders, and account data
        const [positionsRes, ordersRes, accountRes] = await Promise.all([
            fetch('/api/trading/positions').catch(() => ({ ok: false })),
            fetch('/api/trading/orders/history').catch(() => ({ ok: false })),
            fetch('/api/trading/account').catch(() => ({ ok: false }))
        ]);

        // Update positions
        if (positionsRes.ok) {
            const posData = await positionsRes.json();
            const positions = posData.positions || [];
            document.getElementById('totalPositions').textContent = positions.length;
        }

        // Update orders
        if (ordersRes.ok) {
            const orderData = await ordersRes.json();
            const orders = orderData.orders || [];
            document.getElementById('totalOrders').textContent = orders.length;
            
            // Display recent activity
            displayRecentActivity(orders.slice(0, 5));
        }

        // Update account data (real portfolio value from IBKR)
        if (accountRes.ok) {
            const accountData = await accountRes.json();
            const portfolioValue = accountData.netLiquidation || accountData.cashBalance || 0;
            document.getElementById('portfolioValue').textContent = `$${portfolioValue.toFixed(2)}`;
            console.log('Account data:', accountData);
        }

        // Update AI confidence
        document.getElementById('aiConfidence').textContent = '85%';

    } catch (error) {
        console.error('Error refreshing dashboard:', error);
    }
}

// Display recent activity
function displayRecentActivity(orders) {
    const container = document.getElementById('recentActivity');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = '<p style="color: #6b7280; text-align: center; padding: 2rem;">No recent activity</p>';
        return;
    }

    const html = orders.map(order => `
        <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${order.symbol}</strong> - ${order.action} ${order.quantity} shares
                    <br>
                    <span style="color: #6b7280; font-size: 0.875rem;">
                        ${order.orderType} Order • Confidence: ${order.confidence}%
                    </span>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 0.875rem; color: #6b7280;">
                        ${new Date(order.recordedAt || order.timestamp).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Load positions
async function loadPositions() {
    try {
        const response = await fetch('/api/trading/positions');
        const data = await response.json();
        
        const container = document.getElementById('positionsList');
        const positions = data.positions || [];

        if (positions.length === 0) {
            container.innerHTML = '<div style="padding: 3rem; text-align: center; color: #6b7280;">No open positions</div>';
            document.getElementById('positionsPagination').innerHTML = '';
            return;
        }

        // Store data globally for filtering
        positionsData = positions;
        renderPositions();
    } catch (error) {
        console.error('Error loading positions:', error);
        document.getElementById('positionsList').innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">Error loading positions</div>';
    }
}

// Render positions with pagination
function renderPositions(filteredData = null) {
    const container = document.getElementById('positionsList');
    const positions = filteredData || positionsData;
    
    if (positions.length === 0) {
        container.innerHTML = '<div style="padding: 3rem; text-align: center; color: #6b7280;">No positions found</div>';
        document.getElementById('positionsPagination').innerHTML = '';
        return;
    }

    // Calculate pagination
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
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Quantity</th>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Avg Cost</th>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Market Value</th>
                    </tr>
                </thead>
                <tbody style="background: white; divide-y divide-gray-200;">
                    ${paginatedPositions.map(pos => `
                        <tr style="border-bottom: 1px solid #e5e7eb;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                            <td style="padding: 1rem 1.5rem; font-weight: 700;">${pos.symbol}</td>
                            <td style="padding: 1rem 1.5rem;">
                                <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; 
                                    ${pos.secType === 'OPT' ? 'background: #f3e8ff; color: #7c3aed;' : 'background: #dbeafe; color: #2563eb;'}">
                                    ${pos.secType === 'OPT' ? 'Option' : pos.secType || 'Stock'}
                                </span>
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
        renderPositionsPagination(positions.length, totalPages);
}

// Render positions pagination
function renderPositionsPagination(totalItems, totalPages) {
    const container = document.getElementById('positionsPagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const startItem = (positionsPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(positionsPage * itemsPerPage, totalItems);

    let html = `
        <button onclick="changePositionsPage(${positionsPage - 1})" ${positionsPage === 1 ? 'disabled' : ''}>← Previous</button>
        <span>Showing ${startItem}-${endItem} of ${totalItems}</span>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= positionsPage - 2 && i <= positionsPage + 2)) {
            html += `<button onclick="changePositionsPage(${i})" class="${i === positionsPage ? 'active' : ''}">${i}</button>`;
        } else if (i === positionsPage - 3 || i === positionsPage + 3) {
            html += '<span>...</span>';
        }
    }

    html += `<button onclick="changePositionsPage(${positionsPage + 1})" ${positionsPage === totalPages ? 'disabled' : ''}>Next →</button>`;
    container.innerHTML = html;
}

// Change positions page
function changePositionsPage(page) {
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
    positionsPage = 1; // Reset to first page when searching
    
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

// Load orders
async function loadOrders() {
    try {
        const response = await fetch('/api/trading/orders/history');
        const data = await response.json();
        
        const container = document.getElementById('ordersList');
        const orders = data.orders || [];

        if (orders.length === 0) {
            container.innerHTML = '<div style="padding: 3rem; text-align: center; color: #6b7280;">No orders yet</div>';
            document.getElementById('ordersPagination').innerHTML = '';
            return;
        }

        // Store data globally for filtering
        ordersData = orders;
        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersList').innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">Error loading orders</div>';
    }
}

// Render orders with pagination
function renderOrders(filteredData = null) {
    const container = document.getElementById('ordersList');
    const orders = filteredData || ordersData;
    
    if (orders.length === 0) {
        container.innerHTML = '<div style="padding: 3rem; text-align: center; color: #6b7280;">No orders found</div>';
        document.getElementById('ordersPagination').innerHTML = '';
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(orders.length / itemsPerPage);
    const startIdx = (ordersPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedOrders = orders.slice(startIdx, endIdx);

    const getStatusColor = (status) => {
        switch(status) {
            case 'FILLED': return 'background: #d1fae5; color: #065f46;';
            case 'CANCELLED': return 'background: #fee2e2; color: #991b1b;';
            case 'PENDING': return 'background: #fef3c7; color: #92400e;';
            default: return 'background: #e5e7eb; color: #374151;';
        }
    };

    const html = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <tr>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Order ID</th>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Symbol</th>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Type</th>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Action</th>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Quantity</th>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Order Type</th>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Status</th>
                        <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Created</th>
                    </tr>
                </thead>
                <tbody style="background: white;">
                    ${paginatedOrders.map(order => `
                        <tr style="border-bottom: 1px solid #e5e7eb;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                            <td style="padding: 1rem 1.5rem;">#${order.orderId}</td>
                            <td style="padding: 1rem 1.5rem; font-weight: 700;">${order.symbol}</td>
                            <td style="padding: 1rem 1.5rem;">
                                <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; 
                                    ${order.secType === 'OPT' ? 'background: #f3e8ff; color: #7c3aed;' : 'background: #dbeafe; color: #2563eb;'}">
                                    ${order.secType === 'OPT' ? 'Option' : order.secType || 'Stock'}
                                </span>
                            </td>
                            <td style="padding: 1rem 1.5rem;">
                                <span style="color: ${order.action === 'BUY' ? '#059669' : '#dc2626'}; font-weight: 600;">
                                    ${order.action}
                                </span>
                            </td>
                            <td style="padding: 1rem 1.5rem;">${order.quantity}</td>
                            <td style="padding: 1rem 1.5rem;">${order.orderType}${order.limitPrice ? ` @ $${order.limitPrice}` : ''}</td>
                            <td style="padding: 1rem 1.5rem;">
                                <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; ${getStatusColor(order.status)}">
                                    ${order.status || 'PENDING'}
                                </span>
                            </td>
                            <td style="padding: 1rem 1.5rem; color: #6b7280; font-size: 0.875rem;">
                                ${new Date(order.timestamp || order.recordedAt).toLocaleString()}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
        renderOrdersPagination(orders.length, totalPages);
}

// Render orders pagination
function renderOrdersPagination(totalItems, totalPages) {
    const container = document.getElementById('ordersPagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const startItem = (ordersPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(ordersPage * itemsPerPage, totalItems);

    let html = `
        <button onclick="changeOrdersPage(${ordersPage - 1})" ${ordersPage === 1 ? 'disabled' : ''}>← Previous</button>
        <span>Showing ${startItem}-${endItem} of ${totalItems}</span>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= ordersPage - 2 && i <= ordersPage + 2)) {
            html += `<button onclick="changeOrdersPage(${i})" class="${i === ordersPage ? 'active' : ''}">${i}</button>`;
        } else if (i === ordersPage - 3 || i === ordersPage + 3) {
            html += '<span>...</span>';
        }
    }

    html += `<button onclick="changeOrdersPage(${ordersPage + 1})" ${ordersPage === totalPages ? 'disabled' : ''}>Next →</button>`;
    container.innerHTML = html;
}

// Change orders page
function changeOrdersPage(page) {
    const totalPages = Math.ceil(ordersData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    ordersPage = page;
    
    const searchTerm = document.getElementById('ordersSearch').value.toLowerCase();
    if (searchTerm) {
        filterOrders();
    } else {
        renderOrders();
    }
}

// Filter orders
function filterOrders() {
    const searchTerm = document.getElementById('ordersSearch').value.toLowerCase();
    ordersPage = 1; // Reset to first page when searching
    
    if (!searchTerm) {
        renderOrders();
        return;
    }

    const filtered = ordersData.filter(order => 
        order.symbol.toLowerCase().includes(searchTerm) ||
        order.action.toLowerCase().includes(searchTerm) ||
        order.status.toLowerCase().includes(searchTerm) ||
        order.orderType.toLowerCase().includes(searchTerm)
    );
    
    renderOrders(filtered);
}

// Filter orders function
function filterOrders() {
    const filter = document.getElementById('orderFilter')?.value;
    if (filter) {
        // Implement filter logic if needed
        loadOrders();
    }
}

// Modal functions
function openStockModal() {
    document.getElementById('stockModal').classList.add('active');
    document.getElementById('stockForm').reset();
    document.getElementById('stockAlert').classList.add('hidden');
    document.getElementById('stockConfidence').value = 85;
    
    // Initialize confidence slider
    const slider = document.getElementById('stockConfidenceSlider');
    slider.value = 85;
    updateStockConfidenceColor(85);
}

// Update stock confidence slider color based on value
function updateStockConfidenceColor(value) {
    const slider = document.getElementById('stockConfidenceSlider');
    const numberInput = document.getElementById('stockConfidence');
    
    // Update color based on value
    if (value < 70) {
        slider.style.accentColor = '#ef4444'; // red
        numberInput.style.borderColor = '#ef4444';
        numberInput.style.color = '#ef4444';
    } else if (value < 85) {
        slider.style.accentColor = '#f59e0b'; // orange
        numberInput.style.borderColor = '#f59e0b';
        numberInput.style.color = '#f59e0b';
    } else {
        slider.style.accentColor = '#10b981'; // green
        numberInput.style.borderColor = '#10b981';
        numberInput.style.color = '#10b981';
    }
}

function closeStockModal() {
    document.getElementById('stockModal').classList.remove('active');
}

function openOptionModal() {
    document.getElementById('optionModal').classList.add('active');
    document.getElementById('optionForm').reset();
    document.getElementById('optionAlert').classList.add('hidden');
    document.getElementById('optionConfidence').value = 85;
    document.getElementById('optionConfidenceSlider').value = 85;
    document.getElementById('optionOrderType').value = 'LMT';
    toggleOptionLimitPrice();
    
    // Set default date to 30 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    document.getElementById('optionExpiryDate').value = defaultDate.toISOString().split('T')[0];
    updateExpiryFormat();
}

function updateExpiryFormat() {
    const dateInput = document.getElementById('optionExpiryDate').value;
    if (dateInput) {
        // Convert YYYY-MM-DD to YYYYMMDD
        const formatted = dateInput.replace(/-/g, '');
        document.getElementById('optionExpiry').value = formatted;
    }
}

function updateConfidenceColor(value) {
    const slider = document.getElementById('optionConfidenceSlider');
    const percent = value;
    if (percent < 70) {
        slider.style.accentColor = '#dc2626'; // red
    } else if (percent < 85) {
        slider.style.accentColor = '#f59e0b'; // orange
    } else {
        slider.style.accentColor = '#059669'; // green
    }
}

function closeOptionModal() {
    document.getElementById('optionModal').classList.remove('active');
}

function toggleStockLimitPrice() {
    const orderType = document.getElementById('stockOrderType').value;
    const limitPriceGroup = document.getElementById('stockLimitPriceGroup');
    const limitPriceInput = document.getElementById('stockLimitPrice');
    
    if (orderType === 'LMT') {
        limitPriceGroup.classList.remove('hidden');
        limitPriceInput.required = true;
    } else {
        limitPriceGroup.classList.add('hidden');
        limitPriceInput.required = false;
    }
}

function toggleOptionLimitPrice() {
    const orderType = document.getElementById('optionOrderType').value;
    const limitPriceGroup = document.getElementById('optionLimitPriceGroup');
    const limitPriceInput = document.getElementById('optionLimitPrice');
    
    if (orderType === 'LMT') {
        limitPriceGroup.classList.remove('hidden');
        limitPriceInput.required = true;
    } else {
        limitPriceGroup.classList.add('hidden');
        limitPriceInput.required = false;
    }
}

// Submit stock order
async function submitStockOrder(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('stockSubmitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading"></span> Placing Order...';
    submitBtn.disabled = true;

    const formData = {
        symbol: document.getElementById('stockSymbol').value.toUpperCase(),
        action: document.getElementById('stockAction').value,
        quantity: parseInt(document.getElementById('stockQuantity').value),
        orderType: document.getElementById('stockOrderType').value,
        confidence: parseInt(document.getElementById('stockConfidence').value),
        secType: 'STK'
    };

    if (formData.orderType === 'LMT') {
        formData.limitPrice = parseFloat(document.getElementById('stockLimitPrice').value);
    }

    try {
        const response = await fetch('/api/trading/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        const alertDiv = document.getElementById('stockAlert');
        
        if (result.success) {
            alertDiv.className = 'alert alert-success';
            alertDiv.textContent = `✅ Order placed successfully! Order ID: ${result.order.orderId}`;
            alertDiv.classList.remove('hidden');
            
            setTimeout(() => {
                closeStockModal();
                refreshDashboard();
            }, 2000);
        } else {
            alertDiv.className = 'alert alert-error';
            alertDiv.textContent = `❌ Error: ${result.reason || result.error || 'Failed to place order'}`;
            alertDiv.classList.remove('hidden');
        }
    } catch (error) {
        const alertDiv = document.getElementById('stockAlert');
        alertDiv.className = 'alert alert-error';
        alertDiv.textContent = `❌ Error: ${error.message}`;
        alertDiv.classList.remove('hidden');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Submit option order
async function submitOptionOrder(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('optionSubmitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading"></span> Placing Order...';
    submitBtn.disabled = true;

    const formData = {
        symbol: document.getElementById('optionSymbol').value.toUpperCase(),
        action: document.getElementById('optionAction').value,
        quantity: parseInt(document.getElementById('optionQuantity').value),
        orderType: document.getElementById('optionOrderType').value,
        confidence: parseInt(document.getElementById('optionConfidence').value),
        secType: 'OPT',
        strike: parseFloat(document.getElementById('optionStrike').value),
        expiry: document.getElementById('optionExpiry').value,
        optionType: document.getElementById('optionType').value
    };

    if (formData.orderType === 'LMT') {
        formData.limitPrice = parseFloat(document.getElementById('optionLimitPrice').value);
    }

    try {
        const response = await fetch('/api/trading/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        const alertDiv = document.getElementById('optionAlert');
        
        if (result.success) {
            alertDiv.className = 'alert alert-success';
            alertDiv.textContent = `✅ Option order placed successfully! Order ID: ${result.order.orderId}`;
            alertDiv.classList.remove('hidden');
            
            setTimeout(() => {
                closeOptionModal();
                refreshDashboard();
            }, 2000);
        } else {
            alertDiv.className = 'alert alert-error';
            alertDiv.textContent = `❌ Error: ${result.reason || result.error || 'Failed to place order'}`;
            alertDiv.classList.remove('hidden');
        }
    } catch (error) {
        const alertDiv = document.getElementById('optionAlert');
        alertDiv.className = 'alert alert-error';
        alertDiv.textContent = `❌ Error: ${error.message}`;
        alertDiv.classList.remove('hidden');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Close modal on outside click
document.getElementById('stockModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'stockModal') {
        closeStockModal();
    }
});

document.getElementById('optionModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'optionModal') {
        closeOptionModal();
    }
});

// Toggle TWS Gateway Frame
function toggleGatewayFrame() {
    const frame = document.getElementById('gatewayFrame');
    const btnText = document.getElementById('gatewayBtnText');
    
    if (frame.classList.contains('hidden')) {
        frame.classList.remove('hidden');
        btnText.textContent = 'Hide Gateway';
    } else {
        frame.classList.add('hidden');
        btnText.textContent = 'Open Gateway';
    }
}
