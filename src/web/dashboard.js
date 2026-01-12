// Dashboard JavaScript
let statsRefreshInterval;
let currentView = 'dashboard';

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
        // Fetch positions and orders
        const [positionsRes, ordersRes, accountRes] = await Promise.all([
            fetch('/api/trading/positions').catch(() => ({ ok: false })),
            fetch('/api/trading/orders/history').catch(() => ({ ok: false })),
            fetch('/api/trading/account').catch(() => ({ ok: false }))
        ]);

        // Update stats
        if (positionsRes.ok) {
            const posData = await positionsRes.json();
            const positions = posData.positions || [];
            document.getElementById('totalPositions').textContent = positions.length;
            
            // Calculate portfolio value
            const portfolioValue = positions.reduce((sum, pos) => {
                return sum + (pos.position * (pos.averageCost || 0));
            }, 0);
            document.getElementById('portfolioValue').textContent = `$${portfolioValue.toFixed(2)}`;
        }

        if (ordersRes.ok) {
            const orderData = await ordersRes.json();
            const orders = orderData.orders || [];
            document.getElementById('totalOrders').textContent = orders.length;
            
            // Display recent activity
            displayRecentActivity(orders.slice(0, 5));
        }

        if (accountRes.ok) {
            const accountData = await accountRes.json();
            // Update account info if available
            console.log('Account data:', accountData);
        }

        // Update AI confidence (you can adjust this based on your AI service)
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
            container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 0.75rem; text-align: center; color: #6b7280;">No open positions</div>';
            return;
        }

        const html = positions.map(pos => `
            <div style="background: white; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">${pos.symbol}</h3>
                        <p style="color: #6b7280; font-size: 0.875rem;">${pos.secType || 'Stock'}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 700;">${pos.position}</div>
                        <div style="color: #6b7280; font-size: 0.875rem;">shares</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div>
                        <div style="font-size: 0.875rem; color: #6b7280;">Avg Cost</div>
                        <div style="font-weight: 600;">$${pos.averageCost?.toFixed(2) || '0.00'}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.875rem; color: #6b7280;">Total Value</div>
                        <div style="font-weight: 600;">$${(pos.position * pos.averageCost).toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading positions:', error);
        document.getElementById('positionsList').innerHTML = '<div style="background: white; padding: 2rem; border-radius: 0.75rem; text-align: center; color: #ef4444;">Error loading positions</div>';
    }
}

// Load orders
async function loadOrders() {
    try {
        const response = await fetch('/api/trading/orders/history');
        const data = await response.json();
        
        const container = document.getElementById('ordersList');
        const orders = data.orders || [];

        if (orders.length === 0) {
            container.innerHTML = '<div style="background: white; padding: 2rem; border-radius: 0.75rem; text-align: center; color: #6b7280;">No orders yet</div>';
            return;
        }

        const html = orders.map(order => {
            const statusColor = order.status === 'FILLED' ? '#059669' : 
                              order.status === 'CANCELLED' ? '#ef4444' : '#6b7280';
            
            return `
                <div style="background: white; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">
                                ${order.symbol} - ${order.action}
                            </h3>
                            <p style="color: #6b7280; font-size: 0.875rem;">
                                ${order.quantity} shares • ${order.orderType}
                                ${order.limitPrice ? ` @ $${order.limitPrice}` : ''}
                            </p>
                            <p style="color: #6b7280; font-size: 0.875rem; margin-top: 0.5rem;">
                                Confidence: ${order.confidence}%
                            </p>
                        </div>
                        <div style="text-align: right;">
                            <div style="background: ${statusColor}20; color: ${statusColor}; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; display: inline-block;">
                                Order #${order.orderId}
                            </div>
                            <div style="margin-top: 0.5rem; color: #6b7280; font-size: 0.875rem;">
                                ${new Date(order.timestamp || order.recordedAt).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersList').innerHTML = '<div style="background: white; padding: 2rem; border-radius: 0.75rem; text-align: center; color: #ef4444;">Error loading orders</div>';
    }
}

// Modal functions
function openTradeModal() {
    document.getElementById('tradeModal').classList.add('active');
    document.getElementById('tradeForm').reset();
    document.getElementById('tradeAlert').classList.add('hidden');
}

function closeTradeModal() {
    document.getElementById('tradeModal').classList.remove('active');
}

function toggleLimitPrice() {
    const orderType = document.getElementById('orderType').value;
    const limitPriceGroup = document.getElementById('limitPriceGroup');
    
    if (orderType === 'LIMIT') {
        limitPriceGroup.classList.remove('hidden');
        document.getElementById('limitPrice').required = true;
    } else {
        limitPriceGroup.classList.add('hidden');
        document.getElementById('limitPrice').required = false;
    }
}

// Submit trade
async function submitTrade(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="loading"></span> Placing Order...';
    submitBtn.disabled = true;

    const formData = {
        symbol: document.getElementById('symbol').value.toUpperCase(),
        action: document.getElementById('action').value,
        quantity: parseInt(document.getElementById('quantity').value),
        orderType: document.getElementById('orderType').value,
        confidence: parseInt(document.getElementById('confidence').value)
    };

    if (formData.orderType === 'LIMIT') {
        formData.limitPrice = parseFloat(document.getElementById('limitPrice').value);
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

        const alertDiv = document.getElementById('tradeAlert');
        
        if (result.success) {
            alertDiv.className = 'alert alert-success';
            alertDiv.textContent = `✅ Order placed successfully! Order ID: ${result.order.orderId}`;
            alertDiv.classList.remove('hidden');
            
            // Refresh dashboard after 2 seconds
            setTimeout(() => {
                closeTradeModal();
                refreshDashboard();
            }, 2000);
        } else {
            alertDiv.className = 'alert alert-error';
            alertDiv.textContent = `❌ Error: ${result.reason || result.error || 'Failed to place order'}`;
            alertDiv.classList.remove('hidden');
        }
    } catch (error) {
        const alertDiv = document.getElementById('tradeAlert');
        alertDiv.className = 'alert alert-error';
        alertDiv.textContent = `❌ Error: ${error.message}`;
        alertDiv.classList.remove('hidden');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Close modal on outside click
document.getElementById('tradeModal').addEventListener('click', (e) => {
    if (e.target.id === 'tradeModal') {
        closeTradeModal();
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
