@echo off
title WAN Hardware Inventory System Launcher
echo ===================================================
echo   Starting WAN Hardware Inventory System...
echo ===================================================

:: Set Paths (Adjust if installation paths differ)
set "XAMPP_DIR=C:\xampp"
set "PHP_BIN=%XAMPP_DIR%\php"
set "NODE_BIN=C:\Program Files\nodejs"

:: Add PHP and Node.js to PATH for this session
set "PATH=%PHP_BIN%;%NODE_BIN%;%PATH%"

:: Check if PHP is available
php -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PHP not found. Please check XAMPP installation path in this script.
    echo Expected path: %PHP_BIN%
    pause
    exit /b
)

:: Check if Node.js is available
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js or check path.
    echo Expected path: %NODE_BIN%
    pause
    exit /b
)

echo.
echo [1/4] Launching XAMPP Control Panel...
if exist "%XAMPP_DIR%\xampp-control.exe" (
    start "" "%XAMPP_DIR%\xampp-control.exe"
    
    :: Attempt to start Apache and MySQL services
    if exist "%XAMPP_DIR%\mysql_start.bat" (
        echo        - Starting MySQL Service...
        start /min "" "%XAMPP_DIR%\mysql_start.bat"
    )
    if exist "%XAMPP_DIR%\apache_start.bat" (
        echo        - Starting Apache Service...
        start /min "" "%XAMPP_DIR%\apache_start.bat"
    )
) else (
    echo [WARNING] XAMPP Control Panel not found at %XAMPP_DIR%
)

echo.
echo [2/4] Starting Backend Server (Laravel)...
cd /d "%~dp0backend"
if exist "artisan" (
    :: Run on host 0.0.0.0 to allow network access
    start "Laravel Backend" php artisan serve --host=0.0.0.0 --port=8000
) else (
    echo [ERROR] artisan file not found in %CD%
    pause
)

echo.
echo [3/4] Starting Frontend Server (Vite)...
cd /d "%~dp0"
if exist "package.json" (
    :: Run with --host to expose to network
    start "React Frontend" npm run dev -- --host
) else (
    echo [ERROR] package.json not found in %CD%
    pause
)

echo.
echo [4/4] Opening Application in Browser...
:: Wait 5 seconds for servers to initialize
timeout /t 5 >nul
start http://localhost:5173

:: Get Local IP Address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do set IP=%%a
set IP=%IP:~1%

echo.
echo ===================================================
echo   SYSTEM LAUNCHED SUCCESSFULLY!
echo ===================================================
echo.
echo   Access locally:      http://localhost:5173
echo   Access from Network: http://%IP%:5173
echo.
echo   NOTE: 
echo   - Keep this window and the other server windows open.
echo   - Ensure your firewall allows port 8000 (Backend) and 5173 (Frontend).
echo.
echo ===================================================
pause
