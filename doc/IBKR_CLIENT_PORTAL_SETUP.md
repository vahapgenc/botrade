# IBKR Client Portal API Setup Guide

## Overview

This project uses **IBKR Client Portal Web API** instead of TWS/IB Gateway. The Client Portal API is a REST-based API that doesn't require installing TWS desktop application.

## Why Client Portal API?

✅ **No desktop software required** - Runs as lightweight gateway  
✅ **REST API** - Standard HTTP requests (easier to implement)  
✅ **OAuth 2.0** - Modern authentication  
✅ **Cross-platform** - Works on any OS  
✅ **Browser-based login** - No complex API credentials setup

## Prerequisites

1. **IBKR Account** (Paper or Live)
2. **Client Portal Gateway** (download below)
3. **Node.js** 18+ installed

## Step 1: Download Client Portal Gateway

Visit: https://www.interactivebrokers.com/en/index.php?f=5041

Download the **Client Portal Gateway** for your operating system:
- **Windows**: clientportal.gw.zip
- **Mac/Linux**: clientportal.gw.zip

Extract the ZIP file to a location like:
- Windows: `C:\IBKR\clientportal.gw`
- Mac/Linux: `~/IBKR/clientportal.gw`

## Step 2: Configure Gateway

Navigate to the extracted folder and edit `root/conf.yaml`:

```yaml
# Listen on localhost only (secure)
listenHost: localhost
listenPort: 5000

# SSL Configuration (required)
listenSsl: true
sslCert: ssl/cert.pem
sslKey: ssl/key.pem

# Paper or Live trading
tradingMode: paper  # or 'live' for real trading

# Re-authentication settings
reauthenticate: true
```

## Step 3: Start the Gateway

### Windows (PowerShell):
```powershell
cd C:\IBKR\clientportal.gw
.\bin\run.bat root\conf.yaml
```

### Mac/Linux (Terminal):
```bash
cd ~/IBKR/clientportal.gw
./bin/run.sh root/conf.yaml
```

You should see:
```
Client Portal Gateway started
Listening on https://localhost:5000
```

## Step 4: Authenticate via Browser

1. Open browser: **https://localhost:5000**
2. Accept the self-signed certificate warning
3. Login with your IBKR credentials
4. Complete 2FA if enabled
5. Keep the gateway running

**Important**: The gateway must stay running while your trading bot operates.

## Step 5: Configure Your Bot

Update `.env` file:

```env
# IBKR Client Portal API Configuration
IBKR_API_URL=https://localhost:5000/v1/api
IBKR_ACCOUNT_ID=your_account_id

# OAuth 2.0 (optional - for advanced auth)
IBKR_CLIENT_ID=your_client_id
IBKR_CLIENT_SECRET=your_client_secret
```

**Find your Account ID**:
- Login to Client Portal web interface
- Go to Settings → Account
- Copy your account number (e.g., DU12345678)

## Step 6: Test the Connection

Run the test suite:

```bash
npm test tests/test-ibkr-clientportal.js
```

Or manually:
```bash
node tests/test-ibkr-clientportal.js
```

Expected output:
```
✅ Successfully authenticated with Client Portal!
✅ Positions test completed
✅ Orders test completed
```

## Common Issues

### Issue: "Connection refused"
**Solution**: Make sure Client Portal Gateway is running on port 5000

```bash
# Check if gateway is running
netstat -an | findstr :5000    # Windows
netstat -an | grep :5000       # Mac/Linux
```

### Issue: "Certificate error"
**Solution**: Accept the self-signed certificate in your code

The bot automatically handles this with:
```javascript
httpsAgent: new https.Agent({ rejectUnauthorized: false })
```

### Issue: "Session expired"
**Solution**: Re-authenticate through the browser

1. Visit https://localhost:5000
2. Login again
3. Restart your bot

### Issue: "401 Unauthorized"
**Solution**: Check authentication status

```bash
curl -k https://localhost:5000/v1/api/iserver/auth/status
```

### Issue: "Account ID not found"
**Solution**: Verify your account ID in `.env`

Login to IBKR Client Portal web interface and check Settings → Account.

## API Endpoints Used

### Authentication
- `GET /iserver/auth/status` - Check authentication
- `POST /tickle` - Keep session alive
- `GET /sso/validate` - Validate SSO session
- `POST /iserver/reauthenticate` - Re-authenticate if expired

### Trading
- `POST /iserver/account/{accountId}/orders` - Place orders
- `GET /portfolio/{accountId}/positions/0` - Get positions
- `GET /iserver/account/orders` - Get orders
- `DELETE /iserver/account/{accountId}/order/{orderId}` - Cancel order

### Market Data
- `GET /iserver/secdef/search?symbol={symbol}` - Search contracts
- `GET /iserver/marketdata/snapshot` - Get quotes

## Security Considerations

1. **Never commit credentials** - Use `.env` file (already in .gitignore)
2. **Use paper trading first** - Test with paper account before live
3. **SSL required** - Gateway enforces HTTPS
4. **Session timeout** - Re-authenticate every 24 hours
5. **Localhost only** - Gateway binds to 127.0.0.1 by default

## Differences from TWS/Gateway

| Feature | TWS/IB Gateway | Client Portal API |
|---------|----------------|-------------------|
| Installation | Heavy desktop app | Lightweight gateway |
| Connection | Socket API | REST API |
| Authentication | API credentials | OAuth/Browser login |
| Platform | Desktop required | Any platform |
| Port | 7497 (paper), 7496 (live) | 5000 (both) |

## Production Deployment

For production (e.g., cloud server):

1. **SSH Tunnel**: Forward port 5000 from local machine
```bash
ssh -L 5000:localhost:5000 user@server
```

2. **VPN**: Connect to network where gateway runs

3. **Dedicated Server**: Run gateway on same server as bot

4. **Docker**: Run gateway in Docker container (advanced)

## Monitoring

Check gateway logs:
```bash
# Gateway logs are in:
# Windows: C:\IBKR\clientportal.gw\logs\
# Mac/Linux: ~/IBKR/clientportal.gw/logs/
```

Check bot logs:
```bash
tail -f logs/combined-*.log
```

## Resources

- **Client Portal API Docs**: https://www.interactivebrokers.com/api/doc.html
- **Gateway Download**: https://www.interactivebrokers.com/en/index.php?f=5041
- **IBKR Developer Portal**: https://www.interactivebrokers.com/en/trading/ib-api.php

## Support

If you encounter issues:

1. Check gateway logs
2. Check bot logs: `logs/combined-*.log`
3. Verify `.env` configuration
4. Test with curl/Postman first
5. Check IBKR API status page

## Next Steps

After successful setup:

1. ✅ Test with paper trading
2. ✅ Place small test orders
3. ✅ Monitor execution
4. ✅ Review logs and database
5. ✅ Scale up gradually

**⚠️ ALWAYS test with paper trading first!**
