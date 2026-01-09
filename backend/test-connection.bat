@echo off
echo ========================================
echo Проверка подключения к PostgreSQL
echo ========================================
echo.

cd /d "%~dp0"

if not exist .env (
    echo ОШИБКА: Файл .env не найден!
    echo.
    echo Создайте файл .env из env.txt:
    echo 1. Откройте env.txt
    echo 2. Измените пароль DB_PASSWORD
    echo 3. Сохраните и переименуйте в .env
    echo.
    echo Или запустите create-env.bat
    pause
    exit /b 1
)

echo Файл .env найден
echo.
echo Содержимое файла .env:
echo ----------------------------------------
type .env
echo ----------------------------------------
echo.

echo Проверяю подключение к PostgreSQL...
echo.

node src\scripts\check-db.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Подключение успешно!
    echo Теперь можно запустить миграции: migrate.bat
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ОШИБКА подключения!
    echo.
    echo Возможные причины:
    echo 1. Неверный пароль в файле .env
    echo 2. PostgreSQL не запущен
    echo 3. База данных forum_db не создана
    echo.
    echo Проверьте:
    echo - Пароль в строке DB_PASSWORD в файле .env
    echo - Запущен ли PostgreSQL (services.msc)
    echo - Создана ли база данных: CREATE DATABASE forum_db;
    echo ========================================
)

pause
