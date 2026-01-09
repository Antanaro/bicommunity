@echo off
echo ========================================
echo Создание базы данных forum_db
echo ========================================
echo.

cd /d "%~dp0"

if not exist .env (
    echo ОШИБКА: Файл .env не найден!
    echo Создайте файл .env из env.txt или запустите create-env.bat
    pause
    exit /b 1
)

echo Создание базы данных forum_db...
echo.

node src\scripts\create-database.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo База данных создана успешно!
    echo Теперь можно запустить миграции: migrate.bat
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ОШИБКА при создании базы данных!
    echo Проверьте сообщения выше.
    echo ========================================
)

pause
