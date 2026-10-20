@echo off
cd /d "%~dp0"

echo Starting Backend...
start "Backend" cmd /c "cd /d "%~dp0backend" && npx tsx src/app.ts"

echo Starting Frontend...
start "Frontend" cmd /c "cd /d "%~dp0frontend" && npx vite --host"

echo Servers started. Close this window to stop, or use task manager.
pause
