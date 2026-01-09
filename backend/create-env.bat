@echo off
echo ========================================
echo Создание файла .env
echo ========================================
echo.

cd /d "%~dp0"

if exist .env (
    echo Файл .env уже существует!
    echo Открываю файл для редактирования...
    notepad .env
    goto :end
)

if exist env.txt (
    echo Найден файл env.txt
    echo Переименовываю в .env...
    ren env.txt .env
    echo Файл .env создан!
    echo.
    echo ВАЖНО: Измените пароль в строке DB_PASSWORD на ваш реальный пароль PostgreSQL!
    echo.
    notepad .env
) else (
    echo Создаю файл .env...
    (
        echo PORT=5000
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=forum_db
        echo DB_USER=postgres
        echo DB_PASSWORD=postgres
        echo JWT_SECRET=ad4ef5e79b63c6e2eda814ff0e508782640adce41a63e7f9bfc0173347f9fcc6
    ) > .env
    echo Файл .env создан!
    echo.
    echo ВАЖНО: Измените пароль в строке DB_PASSWORD на ваш реальный пароль PostgreSQL!
    echo.
    notepad .env
)

:end
pause
