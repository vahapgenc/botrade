# start.ps1
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   STARTING BOTRADE & FIXING GATEWAY     " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Start all containers in the background (Build app to ensure code changes are applied)
Write-Host "1. Launching Docker Containers..." -ForegroundColor Yellow
docker-compose up -d --build app
docker-compose up -d

# 2. Wait for the Gateway to initialize files (Crucial step)
Write-Host "2. Waiting 15 seconds for Gateway to generate config files..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 3. Apply the "Read-Only" and "IP" Fixes directly to the IBC config
Write-Host "3. Forcing 'Read-Only: No' and Trusted IPs settings..." -ForegroundColor Yellow
docker exec botrade-tws-gateway sh -c "sed -i 's/ReadOnlyApi=/ReadOnlyApi=no/' /home/ibgateway/ibc/config.ini && sed -i 's/TrustedTwsApiClientIPs=/TrustedTwsApiClientIPs=0.0.0.0\/0/' /home/ibgateway/ibc/config.ini"
docker exec botrade-tws-gateway sed -i 's/TrustedIPs=127.0.0.1/TrustedIPs=0.0.0.0\/0/g' /home/ibgateway/Jts/jts.ini

# 4. Restart Gateway to make sure it loads the new settings
Write-Host "4. Restarting Gateway to apply settings..." -ForegroundColor Yellow
docker restart botrade-tws-gateway

# 5. Wait for Gateway to restart and reconnect
Write-Host "5. Waiting for Gateway to restart..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 6. Restart app to reconnect to Gateway
Write-Host "6. Restarting app to reconnect..." -ForegroundColor Yellow
docker restart botrade-app

Write-Host "-----------------------------------------" -ForegroundColor Green
Write-Host "   SUCCESS! System is Ready.             " -ForegroundColor Green
Write-Host "-----------------------------------------" -ForegroundColor Green
Write-Host "Dashboard:  http://localhost:3000"
Write-Host "VNC:        http://localhost:6080"
Write-Host "Status API: http://localhost:3000/api/trading/status"
Write-Host ""
Write-Host "Open the dashboard in your browser to start trading!" -ForegroundColor Cyan
