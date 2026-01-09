@echo off
echo ========================================
echo Создание файла .env из env.txt
echo ========================================
echo.

cd /d "%~dp0"

if not exist env.txt (
    echo ОШИБКА: Файл env.txt не найден!
    pause
    exit /b 1
)

echo Найден файл env.txt
echo Создаю файл .env...
echo.

copy env.txt .env >nul

echo Файл .env создан!
echo.
echo ВАЖНО: Проверьте содержимое файла .env
echo Убедитесь, что:
echo 1. PORT=5000 (не 5432!)
echo 2. DB_PASSWORD=rootroot (ваш реальный пароль PostgreSQL)
echo.
echo Открываю файл для проверки...
notepad .env

echo.
echo После проверки и сохранения файла запустите:
echo - test-connection.bat (для проверки подключения)
echo - migrate.bat (для создания таблиц)
echo.
pause
