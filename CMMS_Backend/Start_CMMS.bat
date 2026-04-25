@echo off
title CMMS Launcher
color 0b

echo ==========================================
echo        CMMS - System Initialization
echo ==========================================
echo.

:: 1. Check and install Backend dependencies
if not exist "cmms_backend\node_modules\" (
    echo [INFO] First time setup: Installing Backend dependencies...
    cd cmms_backend
    call npm install
    cd ..
)

:: 2. Check and install Frontend dependencies
if not exist "cmms_frontend\node_modules\" (
    echo [INFO] First time setup: Installing Frontend dependencies...
    cd cmms_frontend
    call npm install
    cd ..
)

:: 3. Setup .env file if missing
if not exist "cmms_backend\.env" (
    echo [WARNING] .env file not found! Copying from .env.example...
    copy "cmms_backend\.env.example" "cmms_backend\.env"
)

echo.
echo Starting Backend Server...
start "CMMS Backend Server" cmd /k "cd cmms_backend && npm start"

echo Starting Frontend Server...
start "CMMS Frontend UI" cmd /k "cd cmms_frontend && npm run dev"

echo.
echo Servers are starting up...
echo The browser will open automatically in 5 seconds.
timeout /t 5 >nul

echo Opening browser...
start http://localhost:5173

exit
