@echo off
echo ========================================
echo Исправление порта в .env файле
echo ========================================
echo.

cd /d "%~dp0"

if not exist .env (
    echo Файл .env не найден, создаю из env.txt...
    if exist env.txt (
        copy env.txt .env >nul
        echo Файл .env создан
    ) else (
        echo ОШИБКА: Файл env.txt не найден!
        pause
        exit /b 1
    )
)

echo Проверяю файл .env...
findstr /C:"PORT=5432" .env >nul
if %ERRORLEVEL% EQU 0 (
    echo Найдена ошибка: PORT=5432 (это порт PostgreSQL!)
    echo Исправляю на PORT=5000...
    
    powershell -Command "(Get-Content .env) -replace '^PORT=5432', 'PORT=5000' | Set-Content .env"
    
    echo ✅ Порт исправлен!
    echo.
    echo Содержимое файла .env:
    echo ----------------------------------------
    type .env
    echo ----------------------------------------
) else (
    echo ✅ Порт уже правильный (PORT=5000)
)

echo.
echo Теперь можно запустить сервер: npm run dev
echo.
pause
