@echo off
echo ========================================================
echo   TryAngle IEEE - Server Launcher
echo ========================================================

:: 1. Start Python Backend (FastAPI) in a new window
echo Starting Python Backend...
start "TryAngle Backend" cmd /k "call conda activate tryangle_v15 && cd /d C:\tryangle_IEEE\backend && python -m uvicorn api_server_v3:app --reload --host 0.0.0.0 --port 8000"

:: 2. Start React Frontend (Vite) in a new window
echo Starting React Frontend...
start "TryAngle Frontend" cmd /k "cd /d C:\tryangle_IEEE\frontend && npm run dev"

:: 3. Start Ngrok Tunnel (external access)
echo Starting Ngrok Tunnel...
start "Ngrok Tunnel" cmd /k "cd /d C:\tryangle_IEEE && ngrok http 3000"

echo.
echo ========================================================
echo   Launch Complete!
echo   - Backend: http://localhost:8000
echo   - Frontend: http://localhost:3000
echo   - Ngrok: Check Ngrok terminal for public URL
echo ========================================================
echo.
pause
