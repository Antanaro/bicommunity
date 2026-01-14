@echo off
cd /d "%~dp0"

echo ========================================
echo Проверка и запуск backend сервера
echo ========================================
echo.

REM Проверка .env файла
if not exist .env (
    echo ❌ Файл .env не найден!
    echo.
    echo Создаю .env из env.txt...
    if exist env.txt (
        copy env.txt .env >nul
        echo ✅ Файл .env создан
    ) else (
        echo ❌ Файл env.txt также не найден!
        echo Создайте файл .env вручную или запустите create-env.bat
        pause
        exit /b 1
    )
) else (
    echo ✅ Файл .env найден
)

echo.
echo Проверяю конфигурацию...
call check-config.bat
echo.

echo Проверяю подключение к базе данных...
call check-db.bat
echo.

echo.
echo Запускаю backend сервер...
echo Если увидите ошибки, проверьте:
echo 1. Запущен ли PostgreSQL
echo 2. Правильный ли пароль в .env
echo 3. Создана ли база данных forum_db
echo.
echo Нажмите Ctrl+C для остановки сервера
echo.

npm run dev

pause
