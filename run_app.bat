@echo off
echo ==========================================
echo Multi-AI Voice Typer - Windows 11 Setup
echo ==========================================
echo.
echo Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed. Please download it from https://nodejs.org/
    pause
    exit /b
)

echo [STEP 1] Installing dependencies (Please wait)...
call npm install

echo [STEP 2] Starting the application...
echo.
echo App will be available at http://localhost:3000
echo.
start http://localhost:3000
call npm run dev

pause
