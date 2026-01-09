@echo off
echo Installing backend dependencies...
cd /d "%~dp0"
call npm install
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Dependencies installed successfully!
    echo.
    pause
) else (
    echo.
    echo Error installing dependencies!
    pause
    exit /b 1
)
