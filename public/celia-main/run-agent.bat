@echo off
echo ==========================================
echo    Celia Transfer Agent
echo ==========================================
echo.
echo Make sure you have a USB drive plugged in!
echo The agent will detect copies from NAS to USB.
echo.
set API_URL=https://celia-internet.vercel.app
set AGENT_NAME=GMSNOW-PC
echo Connecting to: %API_URL%
echo Agent name: %AGENT_NAME%
echo.
npx tsx scripts/transfer-agent.ts
pause
