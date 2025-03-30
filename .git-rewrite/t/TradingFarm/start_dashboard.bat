@echo off
echo Starting TradingFarm Dashboard with Grafana...
echo.
echo Step 1: Please ensure Docker Desktop is running
echo - Look for the Docker Desktop icon in your system tray
echo - If not running, please start Docker Desktop manually
echo.
echo Step 2: Starting the API server...
start cmd /k python -m src.api.grafana_api
echo.
echo Step 3: Once Docker is running, execute these commands:
echo cd grafana_setup
echo docker-compose up -d
echo.
echo Step 4: Access Grafana at http://localhost:3000
echo - Username: admin
echo - Password: tradingfarm
echo.
echo Press any key to open the API in your browser...
pause > nul
start http://localhost:8051
echo.
echo Press any key to exit...
pause > nul
