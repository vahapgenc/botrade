document.addEventListener('DOMContentLoaded', () => {
    updateStatus();
    pollLogs();
    // Poll status every 5 seconds
    setInterval(updateStatus, 5000);
    // Poll logs every 2 seconds
    setInterval(pollLogs, 2000);
});

let lastLogTime = null;

async function updateStatus() {
    try {
        const response = await fetch('/api/bot/status');
        const data = await response.json();
        renderStatus(data);
    } catch (error) {
        // Don't flood local logs with connection errors if server is down
        console.error('Error fetching status:', error);
    }
}

async function pollLogs() {
    try {
        const response = await fetch('/api/bot/logs');
        if (!response.ok) return;
        const logs = await response.json();
        
        let newLogs = [];
        if (!lastLogTime) {
            // First load: just show the last 50 to avoid creating a huge wall of text immediately if there are many
            newLogs = logs.slice(-50);
        } else {
            // Filter logs strictly after the last one we saw
            newLogs = logs.filter(l => new Date(l.timestamp) > new Date(lastLogTime));
        }

        if (newLogs.length > 0) {
            newLogs.forEach(logEntry => {
                appendLog(logEntry);
            });
            // Update lastLogTime to the timestamp of the last entry
            lastLogTime = newLogs[newLogs.length - 1].timestamp;
        }
    } catch (error) {
        console.error('Error polling logs:', error);
    }
}

function renderStatus(data) {
    const circle = document.getElementById('statusCircle');
    const icon = document.getElementById('statusIcon');
    const text = document.getElementById('statusText');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (data.enabled) {
        circle.className = 'status-circle running';
        icon.textContent = '🤖';
        text.textContent = 'Bot Running';
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        circle.className = 'status-circle stopped';
        icon.textContent = '🛑';
        text.textContent = 'Bot Stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }

    document.getElementById('nextRun').textContent = data.nextRun || 'Not Scheduled';
    document.getElementById('lastRun').textContent = data.lastRun ? new Date(data.lastRun).toLocaleString() : 'Never';
    
    const cycleStatus = document.getElementById('cycleStatus');
    cycleStatus.textContent = data.running ? 'Running Analysis...' : 'Idle';
    cycleStatus.style.color = data.running ? '#059669' : '#6b7280';
    cycleStatus.style.fontWeight = data.running ? 'bold' : 'normal';

    const marketStatus = document.getElementById('marketStatus');
    marketStatus.textContent = data.marketOpen ? 'Open ✅' : 'Closed ❌';
    marketStatus.style.color = data.marketOpen ? '#059669' : '#dc2626';
}

async function startBot() {
    try {
        localLog('Starting bot...', 'info');
        const response = await fetch('/api/bot/start', { method: 'POST' });
        const data = await response.json();
        updateStatus();
        localLog(data.message);
    } catch (error) {
        localLog('Error starting bot: ' + error.message, 'error');
    }
}

async function stopBot() {
    try {
        localLog('Stopping bot...', 'info');
        const response = await fetch('/api/bot/stop', { method: 'POST' });
        const data = await response.json();
        updateStatus();
        localLog(data.message);
    } catch (error) {
        localLog('Error stopping bot: ' + error.message, 'error');
    }
}

async function runNow() {
    const btn = document.getElementById('runNowBtn');
    btn.disabled = true;
    try {
        localLog('Triggering manual cycle (single run)...', 'info');
        const response = await fetch('/api/bot/run-now', { method: 'POST' });
        const data = await response.json();
        if (response.ok) {
            localLog('Manual cycle started. This runs once and does not enable the scheduler.', 'success');
        } else {
            localLog(data.error, 'error');
        }
        updateStatus();
    } catch (error) {
        localLog('Error triggering manual run: ' + error.message, 'error');
    } finally {
        setTimeout(() => { btn.disabled = false; }, 2000);
    }
}

async function updateSchedule() {
    const select = document.getElementById('scheduleSelect');
    const msg = document.getElementById('scheduleMsg');
    const cronExpression = select.value;
    
    try {
        msg.textContent = 'Updating...';
        msg.style.color = 'blue';
        
        const response = await fetch('/api/bot/config', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cronExpression })
        });
        
        const data = await response.json();
        if (response.ok) {
            msg.textContent = 'Schedule updated!';
            msg.style.color = 'green';
            localLog(data.message, 'success');
        } else {
            msg.textContent = 'Failed: ' + data.error;
            msg.style.color = 'red';
            localLog(data.error, 'error');
        }
        updateStatus();
    } catch (error) {
        msg.textContent = 'Error: ' + error.message;
        msg.style.color = 'red';
    } finally {
        setTimeout(() => { msg.textContent = ''; }, 3000);
    }
}

// For local UI actions
function localLog(msg, type = 'info') {
    appendLog({
        timestamp: new Date().toISOString(),
        level: type === 'error' ? 'error' : (type === 'success' ? 'info' : 'info'),
        message: msg
    });
}

function appendLog(logEntry) {
    const panel = document.getElementById('logPanel');
    const line = document.createElement('div');
    line.style.fontFamily = 'monospace';
    line.style.marginBottom = '4px';
    line.style.fontSize = '0.9rem';
    
    const time = new Date(logEntry.timestamp).toLocaleTimeString();
    
    let color = '#374151'; // Default text color
    if (logEntry.level === 'error') color = '#ef4444';
    if (logEntry.level === 'warn') color = '#f59e0b';
    if (logEntry.level === 'info') color = '#10b981'; // Greenish for info
    
    // Format: [Time] [LEVEL] Message
    // Make level uppercase
    const levelStr = logEntry.level.toUpperCase();
    
    line.innerHTML = `<span style="color: #6b7280; font-size: 0.8em;">[${time}]</span> <span style="color: ${color}; font-weight: bold;">[${levelStr}]</span> ${logEntry.message}`;
    
    panel.appendChild(line);
    panel.scrollTop = panel.scrollHeight;
}
