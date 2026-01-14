@echo off
echo ========================================
echo Запуск миграции для сброса пароля
echo ========================================
echo.

cd /d "%~dp0"

if not exist .env (
    echo ❌ ОШИБКА: Файл .env не найден!
    echo Создайте файл .env из env.txt или запустите create-env.bat
    pause
    exit /b 1
)

echo Запускаю миграцию...
echo.

call npm run migrate-password-reset

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Миграция выполнена успешно!
    echo.
) else (
    echo.
    echo ❌ Ошибка при выполнении миграции!
    echo.
)

pause
