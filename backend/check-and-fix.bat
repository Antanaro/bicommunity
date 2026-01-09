@echo off
echo ========================================
echo Проверка и исправление конфигурации
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Проверка файла .env...
if not exist .env (
    echo Файл .env не найден!
    if exist env.txt (
        echo Создаю .env из env.txt...
        copy env.txt .env >nul
    ) else (
        echo ОШИБКА: Файл env.txt не найден!
        pause
        exit /b 1
    )
)

echo [2/3] Проверка порта...
findstr /C:"PORT=5432" .env >nul
if %ERRORLEVEL% EQU 0 (
    echo ❌ Найдена ошибка: PORT=5432 (это порт PostgreSQL!)
    echo Исправляю на PORT=5000...
    powershell -Command "(Get-Content .env) -replace '^PORT=5432', 'PORT=5000' | Set-Content .env"
    echo ✅ Порт исправлен!
) else (
    echo ✅ Порт правильный
)

echo.
echo [3/3] Содержимое файла .env:
echo ----------------------------------------
type .env
echo ----------------------------------------
echo.

echo ========================================
echo Проверка завершена
echo ========================================
echo.
echo Теперь можно запустить сервер:
echo   npm run dev
echo.
pause
