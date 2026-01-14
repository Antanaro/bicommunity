@echo off
chcp 65001 >nul
echo Freeing port 5000...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Found process PID: %%a
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo Failed to stop process %%a
    ) else (
        echo Process %%a stopped successfully
    )
)

echo.
echo Port 5000 should be free now.
timeout /t 1 /nobreak >nul
