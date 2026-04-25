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
start /B cmd /c "cd cmms_backend && npm start"

echo Starting Frontend Server...
start /B cmd /c "cd cmms_frontend && npm run dev"

echo.
echo Servers are starting up...
echo The browser will open automatically in 5 seconds.
timeout /t 5 >nul

echo Opening browser...
start http://localhost:5173

:: Hide this terminal window completely (Vanish)
powershell -Command "Add-Type -Name Window -Namespace Console -MemberDefinition '[DllImport(\"Kernel32.dll\")]public static extern IntPtr GetConsoleWindow();[DllImport(\"user32.dll\")]public static extern bool ShowWindow(IntPtr hWnd, Int32 nCmdShow);'; [Console.Window]::ShowWindow([Console.Window]::GetConsoleWindow(), 0)"

exit
