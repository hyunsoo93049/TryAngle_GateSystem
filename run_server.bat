@echo off
echo ========================================================
echo   TryAngle Gate System - Server Launcher
echo ========================================================
echo.

:: 1. Start Python Backend (FastAPI) in a new window
echo Starting Python Backend...
start "TryAngle Backend" cmd /k "call conda activate tryangle && cd /d %~dp0backend && python -m uvicorn api_server_v3:app --reload --host 0.0.0.0 --port 8000"

:: Wait a moment for backend to initialize
timeout /t 2 /nobreak >nul

:: 2. Start React Frontend (Vite) in a new window
echo Starting React Frontend...
start "TryAngle Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: 3. Ngrok Tunnel (Optional - only if ngrok is installed and configured)
where ngrok >nul 2>nul
if %errorlevel%==0 (
    echo.
    echo Ngrok detected. Do you want to start ngrok tunnel for external access?
    choice /C YN /M "Start ngrok"
    if errorlevel 2 goto skip_ngrok
    if errorlevel 1 (
        echo Starting Ngrok Tunnel...
        start "Ngrok Tunnel" cmd /k "ngrok http 3000"
    )
)
:skip_ngrok

echo.
echo ========================================================
echo   Launch Complete!
echo   - Backend: http://localhost:8000
echo   - Frontend: http://localhost:3000
echo   - API Docs: http://localhost:8000/docs
echo ========================================================
echo.
pause
