# IBKR Client Portal API - Quick Reference

## 🚀 Quick Start (3 Steps)

### 1. Start Gateway
```powershell
cd C:\IBKR\clientportal.gw
.\bin\run.bat root\conf.yaml
```

### 2. Login
Open https://localhost:5000 → Enter credentials

### 3. Test
```bash
node tests/test-ibkr-clientportal.js
```

---

## 📡 API Endpoints

### Authentication
```javascript
GET  /iserver/auth/status         // Check auth
POST /tickle                      // Keep alive
GET  /sso/validate                // Validate session
POST /iserver/reauthenticate      // Re-auth
POST /logout                      // Logout
```

### Trading
```javascript
GET  /iserver/secdef/search?symbol=AAPL  // Search contract
POST /iserver/account/:accountId/orders  // Place order
POST /iserver/reply/:id                  // Confirm order
GET  /iserver/account/orders             // Get orders
DELETE /iserver/account/:accountId/order/:orderId  // Cancel
```

### Portfolio
```javascript
GET /portfolio/:accountId/positions/0  // Get positions
GET /portfolio/accounts                // Get accounts
```

---

## 🔧 Code Examples

### Connect
```javascript
const ibkrClient = require('./services/ibkr/ibkrClient');
await ibkrClient.connect();
```

### Place Stock Order
```javascript
const order = await ibkrClient.placeOrder(
    'AAPL',    // symbol
    'BUY',     // action
    10,        // quantity
    'MKT'      // orderType
);
```

### Place Options Order
```javascript
const order = await ibkrClient.placeOptionsOrder(
    'AAPL',           // symbol
    'C',              // right (C=call, P=put)
    150,              // strike
    '20240315',       // expiry YYYYMMDD
    'BUY',            // action
    1,                // quantity (contracts)
    'LMT',            // orderType
    5.50              // limit price
);
```

### Get Positions
```javascript
const positions = await ibkrClient.getPositions();
positions.forEach(pos => {
    console.log(`${pos.symbol}: ${pos.position} shares`);
});
```

### Get Orders
```javascript
const orders = await ibkrClient.getOrders();
orders.forEach(order => {
    console.log(`${order.symbol}: ${order.status}`);
});
```

### Cancel Order
```javascript
await ibkrClient.cancelOrder(orderId);
```

---

## 🌐 REST API Routes

### Connect to IBKR
```bash
POST http://localhost:3000/api/ibkr/connect
```

### Check Status
```bash
GET http://localhost:3000/api/ibkr/status
```

### Get Positions
```bash
GET http://localhost:3000/api/ibkr/positions
GET http://localhost:3000/api/ibkr/positions/AAPL
```

### Place Order
```bash
POST http://localhost:3000/api/ibkr/order/stock
Content-Type: application/json

{
  "symbol": "AAPL",
  "action": "BUY",
  "quantity": 10,
  "orderType": "MKT"
}
```

### Execute AI Decision
```bash
POST http://localhost:3000/api/ibkr/execute
Content-Type: application/json

{
  "aiDecisionId": "decision-id"
}
```

---

## ⚙️ Configuration (.env)

```env
# Client Portal API
IBKR_API_URL=https://localhost:5000/v1/api
IBKR_ACCOUNT_ID=DU12345678

# Risk Management
MAX_POSITION_SIZE=10000
MAX_PORTFOLIO_RISK=0.02
MIN_CONFIDENCE=70
```

---

## 🐛 Quick Troubleshooting

### Gateway not running?
```bash
netstat -an | findstr :5000    # Windows
netstat -an | grep :5000       # Mac/Linux
```

### Session expired?
```
Visit: https://localhost:5000
Login again
```

### 401 Unauthorized?
```bash
# Check auth status
curl -k https://localhost:5000/v1/api/iserver/auth/status
```

### Order rejected?
Check logs: `logs/combined-*.log`

---

## 📊 Response Formats

### Position Object
```javascript
{
  account: 'DU12345678',
  symbol: 'AAPL',
  conid: 265598,
  position: 100,
  avgCost: 150.00,
  marketPrice: 155.00,
  marketValue: 15500.00,
  unrealizedPnL: 500.00,
  realizedPnL: 0
}
```

### Order Object
```javascript
{
  orderId: '12345',
  symbol: 'AAPL',
  action: 'BUY',
  quantity: 10,
  filled: 0,
  remaining: 10,
  status: 'Submitted',
  orderType: 'MKT'
}
```

---

## ⚡ Common Patterns

### Place Order with Retry
```javascript
async function placeOrderSafely(symbol, action, quantity) {
    try {
        const order = await ibkrClient.placeOrder(symbol, action, quantity);
        return order;
    } catch (error) {
        if (error.response?.status === 401) {
            await ibkrClient.connect();
            return await ibkrClient.placeOrder(symbol, action, quantity);
        }
        throw error;
    }
}
```

### Check Position Before Trade
```javascript
const currentPos = await ibkrClient.getPosition('AAPL');
if (currentPos && currentPos.position > 0) {
    console.log(`Already have ${currentPos.position} shares`);
} else {
    await ibkrClient.placeOrder('AAPL', 'BUY', 10);
}
```

### Monitor Order Status
```javascript
async function waitForFill(orderId) {
    let filled = false;
    while (!filled) {
        const order = await ibkrClient.getOrder(orderId);
        if (order.status === 'Filled') {
            filled = true;
        }
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s
    }
    return true;
}
```

---

## 🔐 Security Checklist

- ✅ Use paper trading first
- ✅ Never commit .env file
- ✅ Keep gateway on localhost
- ✅ Use strong IBKR password
- ✅ Enable 2FA on IBKR account
- ✅ Monitor logs regularly
- ✅ Set position size limits
- ✅ Implement circuit breakers

---

## 📚 Documentation Links

- **Setup Guide**: `doc/IBKR_CLIENT_PORTAL_SETUP.md`
- **Migration Guide**: `doc/STEP12_CLIENT_PORTAL_MIGRATION.md`
- **Step 12 Docs**: `doc/step12_ibkr_integration.md`
- **IBKR API Docs**: https://www.interactivebrokers.com/api/doc.html

---

## 💡 Pro Tips

1. **Keep Gateway Running**: Don't close it during trading
2. **Session Timeout**: Re-login every 24 hours
3. **Paper Trading**: Account IDs start with "DU"
4. **Rate Limits**: Add 100ms delay between rapid calls
5. **Error Handling**: Always catch and log errors
6. **Order Confirmation**: Some orders need manual confirm
7. **SSL Certs**: Self-signed, safe to ignore for localhost
8. **Logs**: Check both bot and gateway logs

---

**Last Updated**: 2024 (Step 12 Implementation)
**API Version**: Client Portal Web API v1
**Status**: ✅ Production Ready (Paper Trading)
