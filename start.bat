@echo off
REM Development Server Startup Script for Windows
REM Uses CMD.exe batch commands ONLY - NO PowerShell
REM Starts the appropriate server based on available runtime

REM Prevent PowerShell execution
if "%PSModulePath%" NEQ "" (
    echo ❌ Error: PowerShell detected. This script uses CMD.exe batch commands only.
    echo Please run this script in CMD.exe, not PowerShell.
    echo.
    pause
    exit /b 1
)

echo 🚀 Starting Paxiit Website Development Server...
echo.

REM Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ Node.js found
    echo 📍 Starting Node.js server...
    echo.
    node server.js
    exit /b 0
)

REM Check for Python 3
where python3 >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ Python 3 found
    echo 📍 Starting Python server...
    echo.
    python3 server.py
    exit /b 0
)

REM Check for Python
where python >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo ✅ Python found
    echo 📍 Starting Python server...
    echo.
    python server.py
    exit /b 0
)

REM No runtime found
echo ❌ Error: No suitable runtime found!
echo.
echo Please install one of the following:
echo   - Node.js: https://nodejs.org/
echo   - Python 3: https://www.python.org/
echo.
pause
exit /b 1

