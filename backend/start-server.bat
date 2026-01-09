@echo off
echo ========================================
echo Запуск backend сервера
echo ========================================
echo.

cd /d "%~dp0"

if not exist .env (
    echo ❌ ОШИБКА: Файл .env не найден!
    echo Создайте файл .env из env.txt или запустите create-env.bat
    pause
    exit /b 1
)

echo Проверяю зависимости...
if not exist node_modules (
    echo Устанавливаю зависимости...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Ошибка при установке зависимостей!
        pause
        exit /b 1
    )
)

echo.
echo Запускаю сервер...
echo.

npm run dev

pause
