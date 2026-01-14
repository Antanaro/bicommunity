@echo off
echo Installing nodemailer...
cd /d "%~dp0"
call npm install nodemailer @types/nodemailer
if %ERRORLEVEL% EQU 0 (
    echo.
    echo nodemailer installed successfully!
    echo.
    pause
) else (
    echo.
    echo Error installing nodemailer!
    pause
    exit /b 1
)
