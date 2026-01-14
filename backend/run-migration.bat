@echo off
chcp 65001 >nul
echo ========================================
echo Запуск миграции: добавление reaction_type
echo ========================================
echo.

cd /d "%~dp0"

if not exist .env (
    echo ❌ ОШИБКА: Файл .env не найден!
    pause
    exit /b 1
)

echo Запускаю миграцию...
echo.

node src\migrations\add-reaction-type.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Миграция выполнена успешно!
    echo Теперь система лайков/дизлайков будет работать полностью.
) else (
    echo.
    echo ❌ Ошибка при выполнении миграции!
)

echo.
pause
