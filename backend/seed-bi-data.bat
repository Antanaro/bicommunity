@echo off
chcp 65001 >nul
echo.
echo ========================================
echo Заполнение базы данных категориями по BI
echo ========================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo ⚠️  node_modules не найден. Устанавливаем зависимости...
    call npm install
    echo.
)

echo Запускаем скрипт заполнения...
echo.

node src/scripts/seed-bi-data.js

echo.
pause
