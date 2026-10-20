@echo off
title Celia - NAS Discovery
color 0A
echo.
echo  ==========================================
echo     Celia - NAS Server Discovery Tool
echo  ==========================================
echo.

set /p "HOST=  Enter NAS server IP (e.g. 192.168.1.104): "

if "%HOST%"=="" (
    echo  No IP entered. Exiting.
    pause
    exit /b 1
)

cd /d "%~dp0"

echo  Running discovery for %HOST% ...
echo.

call npx tsx scripts/add-server.ts %HOST%

echo.
echo  ==========================================
echo  Press any key to exit...
echo  ==========================================
pause >nul
