@echo off
echo ========================================
echo Installing all project dependencies
echo ========================================
echo.

echo [1/3] Installing root dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error installing root dependencies!
    pause
    exit /b 1
)

echo.
echo [2/3] Installing backend dependencies...
cd backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error installing backend dependencies!
    cd ..
    pause
    exit /b 1
)

echo.
echo [3/3] Installing frontend dependencies...
cd ..\frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error installing frontend dependencies!
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ========================================
echo All dependencies installed successfully!
echo ========================================
pause
