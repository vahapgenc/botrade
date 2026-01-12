# TWS Gateway Integration - botrade

This document explains the integration of Interactive Brokers TWS Gateway into the botrade Node.js application.

## 🎯 Overview

The integration includes:
- **TWS Gateway Container**: Runs IB Gateway in Docker with VNC access
- **noVNC**: Web-based VNC client to access TWS Gateway UI (http://localhost:6080)
- **Node.js TWS Client**: Connects to TWS Gateway and executes orders
- **Order Service**: Manages trade execution with risk controls
- **Trading API**: REST endpoints for order management

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     botrade Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Node.js Trading Bot (Port 3000)             │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  AI Analysis Engine                          │   │  │
│  │  │  • Technical Analysis                        │   │  │
│  │  │  • Fundamental Analysis                      │   │  │
│  │  │  • News Sentiment                            │   │  │
│  │  │  • GPT-4 Decision Engine                     │   │  │
│  │  └───────────────────┬──────────────────────────┘   │  │
│  │                      │                               │  │
│  │                      ▼                               │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  Order Service (NEW)                         │   │  │
│  │  │  • Risk Management                           │   │  │
│  │  │  • Position Sizing                           │   │  │
│  │  │  • Order Execution                           │   │  │
│  │  └───────────────────┬──────────────────────────┘   │  │
│  │                      │                               │  │
│  │                      ▼                               │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │  TWS Client (@stoqey/ib)                     │   │  │
│  │  │  • Market Orders                             │   │  │
│  │  │  • Limit Orders                              │   │  │
│  │  │  • Position Tracking                         │   │  │
│  │  └───────────────────┬──────────────────────────┘   │  │
│  └────────────────────── ┼ ───────────────────────────┘  │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │         TWS Gateway (Port 4004)                  │   │
│  │         • Paper Trading API                       │   │
│  │         • Live Trading API                        │   │
│  │         • VNC Server (Port 5900)                  │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│                          ▼                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │         noVNC Web Interface (Port 6080)          │   │
│  │         http://localhost:6080                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────┐   ┌──────────────┐                   │
│  │  PostgreSQL  │   │    Redis     │                    │
│  │  (Port 5432) │   │  (Port 6379) │                    │
│  └──────────────┘   └──────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

## 📝 What Was Integrated

### 1. Docker Services (docker-compose.yml)

Added three new services:

#### TWS Gateway
```yaml
tws-gateway:
  image: ghcr.io/gnzsnz/ib-gateway:latest
  ports:
    - "4001:4001"  # Live API
    - "4002:4002"  # Paper API
    - "4004:4004"  # Proxy API (recommended)
    - "5900:5900"  # VNC Server
```

#### noVNC
```yaml
novnc:
  build: ./novnc
  ports:
    - "6080:8080"  # Web VNC client
```

### 2. Node.js Services

#### TWS Client (`src/services/ibkr/twsClient.js`)
- Connects to TWS Gateway using @stoqey/ib
- Handles order placement (market & limit orders)
- Tracks positions and account information
- Event-driven architecture for real-time updates

#### Order Service (`src/services/ibkr/orderService.js`)
- High-level order management
- Confidence threshold validation
- Batch order execution
- Order history tracking
- Position and account queries

#### Trading Routes (`src/api/routes/trading.js`)
New API endpoints:
- `GET /api/trading/status` - Check TWS connection
- `GET /api/trading/positions` - Get current positions
- `GET /api/trading/account` - Get account summary
- `GET /api/trading/orders` - Get open orders
- `GET /api/trading/orders/history` - Get order history
- `POST /api/trading/execute` - Execute a trade
- `POST /api/trading/execute/batch` - Execute multiple trades
- `DELETE /api/trading/orders/:orderId` - Cancel an order

### 3. Configuration (.env.example)

New environment variables:
```bash
# TWS Credentials
TWS_USERID=your_ib_username
TWS_PASSWORD=your_ib_password
TWS_ACCOUNT_ID=your_account_id
TRADING_MODE=paper

# TWS Connection
TWS_PORT=4004
IB_CLIENT_ID=2
VNC_PASSWORD=password123
```

## 🚀 Getting Started

### 1. Configure Environment

Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Edit `.env` with your IB credentials:
```bash
TWS_USERID=your_ib_username
TWS_PASSWORD=your_ib_password
TWS_ACCOUNT_ID=your_paper_account_id
TRADING_MODE=paper
```

### 2. Install Dependencies

```bash
npm install
```

This will install `@stoqey/ib` for TWS API communication.

### 3. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Check TWS Gateway logs
docker-compose logs -f tws-gateway
```

### 4. Access Services

- **Trading API**: http://localhost:3000
- **TWS Gateway VNC**: http://localhost:6080
- **Prisma Studio**: http://localhost:5555 (run with `docker-compose --profile tools up prisma-studio`)

### 5. Test Connection

```bash
# Check if TWS is connected
curl http://localhost:3000/api/trading/status

# Get account summary
curl http://localhost:3000/api/trading/account

# Get current positions
curl http://localhost:3000/api/trading/positions
```

## 📡 API Examples

### Execute a Market Order

```bash
curl -X POST http://localhost:3000/api/trading/execute \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "BUY",
    "quantity": 10,
    "orderType": "MARKET",
    "confidence": 85
  }'
```

### Execute a Limit Order

```bash
curl -X POST http://localhost:3000/api/trading/execute \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "BUY",
    "quantity": 10,
    "orderType": "LIMIT",
    "limitPrice": 150.50,
    "confidence": 85
  }'
```

### Execute Batch Orders

```bash
curl -X POST http://localhost:3000/api/trading/execute/batch \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      {
        "symbol": "AAPL",
        "action": "BUY",
        "quantity": 10,
        "confidence": 85
      },
      {
        "symbol": "MSFT",
        "action": "BUY",
        "quantity": 5,
        "confidence": 80
      }
    ]
  }'
```

### Get Open Orders

```bash
curl http://localhost:3000/api/trading/orders
```

### Cancel an Order

```bash
curl -X DELETE http://localhost:3000/api/trading/orders/123
```

## 🔧 Integration with AI Engine

To integrate with your AI decision engine, modify the order service:

```javascript
// In your AI decision engine
const orderService = require('./services/ibkr/orderService');

async function executeAIDecision(decision) {
    const result = await orderService.executeTrade({
        symbol: decision.symbol,
        action: decision.recommendation, // 'BUY' or 'SELL'
        quantity: decision.quantity,
        orderType: 'MARKET',
        confidence: decision.confidence
    });
    
    return result;
}
```

## ⚙️ Risk Management

The order service includes built-in risk controls:

1. **Confidence Threshold**: Only executes trades above `MIN_CONFIDENCE` (default: 70%)
2. **Position Sizing**: Respects `MAX_POSITION_PCT` (default: 10% of portfolio)
3. **Daily Trade Limit**: Respects `MAX_DAILY_TRADES` (default: 10 trades/day)

Configure in `.env`:
```bash
MIN_CONFIDENCE=70
MAX_POSITION_PCT=10
MAX_DAILY_TRADES=10
```

## 🔍 Troubleshooting

### TWS Gateway Not Connecting

1. Check TWS Gateway logs:
   ```bash
   docker-compose logs tws-gateway
   ```

2. Verify credentials in `.env`

3. Access VNC to see GUI:
   - Open http://localhost:6080
   - Password: value from `VNC_PASSWORD` in `.env`

### Node.js Can't Connect to TWS

1. Verify TWS Gateway is running:
   ```bash
   docker-compose ps
   ```

2. Check if port 4004 is open:
   ```bash
   curl http://localhost:4004
   ```

3. Check app logs:
   ```bash
   docker-compose logs -f app
   ```

### Orders Not Executing

1. Check if TWS is in read-only mode (should be "no"):
   ```yaml
   IBC_ReadOnlyApi: "no"
   ```

2. Verify account is funded in paper trading

3. Check order confidence vs `MIN_CONFIDENCE` threshold

## 📊 Monitoring

### View Real-Time Logs

```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Just TWS Gateway
docker-compose logs -f tws-gateway
```

### Check Order Status

The TWS client emits events for order updates:

```javascript
const twsClient = require('./services/ibkr/twsClient');

twsClient.on('orderStatus', (order) => {
    console.log('Order update:', order);
});

twsClient.on('execution', (exec) => {
    console.log('Order executed:', exec);
});
```

## 🎯 Next Steps

1. **Test in Paper Trading**: Always test thoroughly before live trading
2. **Implement Position Sizing**: Add logic for calculating optimal position sizes
3. **Add Stop Losses**: Implement stop-loss orders for risk management
4. **Dashboard**: Build a UI to monitor trades (can reuse React components from ibkr-bot if needed)
5. **Alerts**: Add notifications for order fills and errors
6. **Backtesting**: Test your strategies against historical data

## ⚠️ Important Notes

- Always start with **paper trading** (`TRADING_MODE=paper`)
- Never commit `.env` file with real credentials
- The TWS API requires TWS Gateway to be running
- Orders are executed immediately - ensure your logic is tested
- Keep `IBC_ReadOnlyApi: "no"` to allow order placement

## 📚 Resources

- [Interactive Brokers API Docs](https://interactivebrokers.github.io/tws-api/)
- [@stoqey/ib Documentation](https://github.com/stoqey/ib)
- [IB Gateway Docker Image](https://github.com/gnzsnz/ib-gateway-docker)

## 🆘 Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify TWS Gateway VNC: http://localhost:6080
3. Test connection: `curl http://localhost:3000/api/trading/status`
4. Review this document for configuration issues
