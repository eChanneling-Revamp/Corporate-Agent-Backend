@echo off
echo Starting Corporate Agent Microservices...
echo.

echo Starting API Gateway on port 3001...
start "API Gateway" cmd /k "cd /d %~dp0 && npm run start:api-gateway"

timeout /t 2

echo Starting Auth Service on port 3002...
start "Auth Service" cmd /k "cd /d %~dp0 && npm run start:auth"

echo.
echo All services are starting...
echo.
echo API Gateway: http://localhost:3001
echo Auth Service: http://localhost:3002
echo API Documentation: http://localhost:3001/api/docs
echo.
echo Press any key to exit...
pause > nul