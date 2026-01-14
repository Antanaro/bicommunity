@echo off
echo Останавливаю процессы на порту 5000...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Найден процесс PID: %%a
    taskkill /F /PID %%a
    if %ERRORLEVEL% EQU 0 (
        echo Процесс %%a успешно остановлен
    ) else (
        echo Не удалось остановить процесс %%a
    )
)

echo.
echo Готово! Теперь можно запустить сервер заново.
timeout /t 2 /nobreak >nul
