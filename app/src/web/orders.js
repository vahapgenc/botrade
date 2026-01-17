// Orders Page JavaScript

let ordersData = [];
let ordersPage = 1;
const itemsPerPage = 10;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadOrders();
    
    // Refresh every 10 seconds
    setInterval(loadOrders, 10000);
});

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

        ordersData = orders;
        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('ordersList').innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">Error loading orders</div>';
    }
}

// Render orders
function renderOrders(filteredData = null) {
    const container = document.getElementById('ordersList');
    const orders = filteredData || ordersData;
    
    if (orders.length === 0) {
        container.innerHTML = '<div style="padding: 3rem; text-align: center; color: #6b7280;">No orders found</div>';
        document.getElementById('ordersPagination').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(orders.length / itemsPerPage);
    const startIdx = (ordersPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const paginatedOrders = orders.slice(startIdx, endIdx);

    const html = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                <tr>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Order ID</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Symbol</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Action</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Quantity</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Type</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Status</th>
                    <th style="padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Time</th>
                </tr>
            </thead>
            <tbody>
                ${paginatedOrders.map(order => `
                    <tr style="border-bottom: 1px solid #e5e7eb;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='white'">
                        <td style="padding: 1rem 1.5rem; font-family: monospace;">#${order.orderId}</td>
                        <td style="padding: 1rem 1.5rem; font-weight: 700;">${order.symbol}</td>
                        <td style="padding: 1rem 1.5rem;">
                            <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; 
                                ${order.action === 'BUY' ? 'background: #d1fae5; color: #065f46;' : 'background: #fee2e2; color: #991b1b;'}">
                                ${order.action}
                            </span>
                        </td>
                        <td style="padding: 1rem 1.5rem;">${order.quantity}</td>
                        <td style="padding: 1rem 1.5rem;">${order.orderType || 'MKT'}</td>
                        <td style="padding: 1rem 1.5rem;">
                            <span style="padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; 
                                ${getStatusColor(order.status)}">
                                ${order.status}
                            </span>
                        </td>
                        <td style="padding: 1rem 1.5rem; font-size: 0.875rem; color: #6b7280;">${formatDate(order.timestamp)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    renderPagination(orders.length, totalPages);
}

// Get status color
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

// Format date
function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Render pagination
function renderPagination(totalItems, totalPages) {
    const container = document.getElementById('ordersPagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    const startItem = (ordersPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(ordersPage * itemsPerPage, totalItems);

    let html = `
        <button onclick="changePage(${ordersPage - 1})" ${ordersPage === 1 ? 'disabled' : ''}>← Previous</button>
        <span>Showing ${startItem}-${endItem} of ${totalItems}</span>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= ordersPage - 2 && i <= ordersPage + 2)) {
            html += `<button onclick="changePage(${i})" class="${i === ordersPage ? 'active' : ''}">${i}</button>`;
        } else if (i === ordersPage - 3 || i === ordersPage + 3) {
            html += '<span>...</span>';
        }
    }

    html += `<button onclick="changePage(${ordersPage + 1})" ${ordersPage === totalPages ? 'disabled' : ''}>Next →</button>`;
    container.innerHTML = html;
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(ordersData.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    ordersPage = page;
    
    const searchTerm = document.getElementById('ordersSearch').value.toLowerCase();
    const filter = document.getElementById('orderFilter').value;
    if (searchTerm || filter !== 'ALL') {
        filterOrders();
    } else {
        renderOrders();
    }
}

// Filter orders
function filterOrders() {
    const searchTerm = document.getElementById('ordersSearch').value.toLowerCase();
    const statusFilter = document.getElementById('orderFilter').value;
    ordersPage = 1;
    
    let filtered = ordersData;

    // Apply status filter
    if (statusFilter !== 'ALL') {
        filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(order => 
            order.symbol.toLowerCase().includes(searchTerm) ||
            order.orderId.toString().includes(searchTerm) ||
            order.action.toLowerCase().includes(searchTerm)
        );
    }
    
    renderOrders(filtered);
}

// Modal functions
function openStockModal() {
    // Redirect to AI Order page for new orders
    window.location.href = '/ai-order.html';
}

function openOptionModal() {
    // Redirect to AI Order page for new orders
    window.location.href = '/ai-order.html';
}
