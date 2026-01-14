@echo off
echo ========================================
echo Перезапуск backend сервера
echo ========================================
echo.

cd /d "%~dp0"

echo Останавливаю процессы на порту 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Найден процесс PID: %%a
    taskkill /F /PID %%a
    if %ERRORLEVEL% EQU 0 (
        echo Процесс %%a успешно остановлен
    )
)

timeout /t 3 /nobreak >nul

echo.
echo Запускаю сервер...
echo.

if not exist .env (
    echo ❌ ОШИБКА: Файл .env не найден!
    echo Создайте файл .env из env.txt или запустите create-env.bat
    pause
    exit /b 1
)

call npm run dev

pause
