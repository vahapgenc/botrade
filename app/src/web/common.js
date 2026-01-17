// Common JavaScript - Shared across all pages

// Update time display
function updateTime() {
    const now = new Date();
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
        timeEl.textContent = now.toLocaleString();
    }
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

// Initialize common elements on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update time
    updateTime();
    setInterval(updateTime, 1000);
    
    // Check status
    checkStatus();
    setInterval(checkStatus, 10000);
});
