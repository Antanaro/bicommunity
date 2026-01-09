@echo off
echo ========================================
echo Проверка конфигурации backend
echo ========================================
echo.

cd /d "%~dp0"

if not exist .env (
    echo ❌ ОШИБКА: Файл .env не найден!
    echo Создайте файл .env из env.txt или запустите create-env.bat
    pause
    exit /b 1
)

echo ✅ Файл .env найден
echo.

echo Проверяю содержимое .env...
echo ----------------------------------------
type .env
echo ----------------------------------------
echo.

echo Проверяю переменные окружения...
echo.

node -e "require('dotenv').config(); console.log('PORT:', process.env.PORT || 'не установлен'); console.log('DB_HOST:', process.env.DB_HOST || 'не установлен'); console.log('DB_PORT:', process.env.DB_PORT || 'не установлен'); console.log('DB_NAME:', process.env.DB_NAME || 'не установлен'); console.log('DB_USER:', process.env.DB_USER || 'не установлен'); console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***установлен***' : 'не установлен'); console.log('JWT_SECRET:', process.env.JWT_SECRET ? '***установлен***' : '❌ НЕ УСТАНОВЛЕН!');"

echo.
echo ========================================
echo Проверка завершена
echo ========================================
echo.

if "%ERRORLEVEL%" NEQ "0" (
    echo ❌ Ошибка при проверке конфигурации
    pause
    exit /b 1
)

echo ✅ Все переменные окружения загружены
echo.
echo Если JWT_SECRET не установлен, это может вызвать ошибку 500!
echo.
pause
