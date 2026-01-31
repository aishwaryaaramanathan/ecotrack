@echo off
echo Starting EcoTrack Backend Server...
start cmd /k "cd /d %~dp0 && node server.js"

echo Starting Frontend Server...
start cmd /k "cd /d %~dp0 && python -m http.server 8000"

echo.
echo EcoTrack is starting up...
echo Backend API: http://localhost:3000
echo Frontend: http://localhost:8000/eco.html
echo.
echo Press any key to exit...
pause >nul
