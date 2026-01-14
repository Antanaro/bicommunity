@echo off
echo Installing node-telegram-bot-api...
cd /d "%~dp0"
call npm install node-telegram-bot-api
echo.
echo Installing types for node-telegram-bot-api...
call npm install --save-dev @types/node-telegram-bot-api
echo.
echo Done!
pause
