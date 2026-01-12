# 🚀 Quick Start - TWS Gateway Integration

## Step 1: Configure Credentials

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Interactive Brokers credentials:
   ```bash
   # TWS Credentials
   TWS_USERID=your_ib_username
   TWS_PASSWORD=your_ib_password
   TWS_ACCOUNT_ID=your_paper_account_id
   
   # Trading Mode
   TRADING_MODE=paper
   TWS_PORT=4004
   
   # VNC Access
   VNC_PASSWORD=password123
   ```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Start Services

```bash
# Start all services (Node.js app, TWS Gateway, PostgreSQL, Redis, noVNC)
docker-compose up -d

# Wait 30-60 seconds for TWS Gateway to fully start

# View logs
docker-compose logs -f app
```

## Step 4: Verify Connection

### Check TWS Gateway UI
1. Open browser: http://localhost:6080
2. Click "Connect"
3. Password: `password123` (or your `VNC_PASSWORD`)
4. You should see TWS Gateway interface

### Test API Connection
```bash
# Check trading status
curl http://localhost:3000/api/trading/status

# Should return:
# {"success":true,"connected":true,"accountId":"DU123456","ready":true}
```

## Step 5: Place Your First Order

### Test with Paper Trading Account

```bash
curl -X POST http://localhost:3000/api/trading/execute \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "action": "BUY",
    "quantity": 1,
    "orderType": "MARKET",
    "confidence": 85
  }'
```

### Check Order Status

```bash
# View open orders
curl http://localhost:3000/api/trading/orders

# View positions
curl http://localhost:3000/api/trading/positions

# View account summary
curl http://localhost:3000/api/trading/account
```

## 🎯 Available Services

| Service | URL | Description |
|---------|-----|-------------|
| Trading API | http://localhost:3000 | Main Node.js app |
| TWS Gateway VNC | http://localhost:6080 | Web-based TWS Gateway UI |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |
| Prisma Studio | http://localhost:5555 | Database UI (optional) |

## 📡 Key API Endpoints

```bash
# Connection & Status
GET  /api/trading/status              # Check TWS connection
GET  /api/trading/account             # Get account summary
GET  /api/trading/positions           # Get current positions
GET  /api/trading/orders              # Get open orders
GET  /api/trading/orders/history      # Get order history

# Trading
POST /api/trading/execute             # Execute single trade
POST /api/trading/execute/batch       # Execute multiple trades
DELETE /api/trading/orders/:orderId   # Cancel an order
```

## ⚠️ Important Notes

1. **Always use paper trading first**: `TRADING_MODE=paper`
2. **Wait for TWS to fully start**: Takes 30-60 seconds after `docker-compose up`
3. **Check VNC if issues**: http://localhost:6080 to see TWS GUI
4. **Monitor logs**: `docker-compose logs -f app`

## 🔧 Troubleshooting

### Connection Refused
```bash
# Check if TWS Gateway is running
docker-compose ps

# Restart TWS Gateway
docker-compose restart tws-gateway

# Wait 30 seconds then test again
```

### Orders Not Executing
- Verify paper trading account is active
- Check VNC (http://localhost:6080) for TWS popups
- Ensure `IBC_ReadOnlyApi: "no"` in docker-compose.yml

### Can't Access VNC
- Port 6080 might be in use
- Try: `docker-compose restart novnc`
- Check: `docker-compose logs novnc`

## 🎓 Next Steps

1. ✅ Test connection with `/api/trading/status`
2. ✅ Place a test order with 1 share
3. ✅ Verify order in VNC interface
4. ✅ Check position with `/api/trading/positions`
5. 🚀 Integrate with your AI decision engine

## 📚 Full Documentation

See [TWS_INTEGRATION.md](TWS_INTEGRATION.md) for complete documentation.
