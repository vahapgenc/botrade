// Main Dashboard Page JavaScript

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    refreshDashboard();
    
    // Refresh data every 10 seconds
    setInterval(refreshDashboard, 10000);
});

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
        <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 600; margin-bottom: 0.25rem;">
                    <span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-right: 0.5rem;
                        ${order.action === 'BUY' ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}">
                        ${order.action}
                    </span>
                    ${order.symbol}
                </div>
                <div style="font-size: 0.875rem; color: #6b7280;">
                    ${order.quantity} @ ${order.orderType || 'MKT'}
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 0.25rem; display: inline-block;
                    ${getStatusColor(order.status)}">
                    ${order.status}
                </div>
                <div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;">
                    ${formatTime(order.timestamp)}
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function getStatusColor(status) {
    switch (status) {
        case 'FILLED':
            return 'background: #d1fae5; color: #065f46;';
        case 'CANCELLED':
            return 'background: #fee2e2; color: #991b1b;';
        case 'PENDING':
        case 'SUBMITTED':
            return 'background: #fef3c7; color: #92400e;';
        default:
            return 'background: #f3f4f6; color: #374151;';
    }
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
}

// Quick action buttons
function openStockModal() {
    window.location.href = '/ai-order.html';
}

function openOptionModal() {
    window.location.href = '/ai-order.html';
}
