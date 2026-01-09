# Скрипт для автоматической настройки проекта

Write-Host "=== Настройка проекта форума ===" -ForegroundColor Green

# Шаг 1: Установка зависимостей
Write-Host "`n[1/4] Установка зависимостей..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при установке зависимостей в корне" -ForegroundColor Red
    exit 1
}

Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при установке зависимостей backend" -ForegroundColor Red
    exit 1
}

Set-Location ..\frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ошибка при установке зависимостей frontend" -ForegroundColor Red
    exit 1
}

Set-Location $PSScriptRoot

# Шаг 2: Создание .env файла
Write-Host "`n[2/4] Создание файла .env..." -ForegroundColor Yellow
$envPath = "backend\.env"
if (-not (Test-Path $envPath)) {
    $jwtSecret = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
    $envContent = @"
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forum_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=$jwtSecret
"@
    $envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
    Write-Host "Файл .env создан с автоматически сгенерированным JWT_SECRET" -ForegroundColor Green
    Write-Host "ВАЖНО: Измените DB_PASSWORD на ваш пароль от PostgreSQL!" -ForegroundColor Yellow
} else {
    Write-Host "Файл .env уже существует, пропускаем..." -ForegroundColor Cyan
}

# Шаг 3: Проверка PostgreSQL
Write-Host "`n[3/4] Проверка PostgreSQL..." -ForegroundColor Yellow
try {
    $pgVersion = psql --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PostgreSQL найден: $pgVersion" -ForegroundColor Green
    } else {
        Write-Host "PostgreSQL не найден в PATH" -ForegroundColor Yellow
        Write-Host "Убедитесь, что PostgreSQL установлен и добавлен в PATH" -ForegroundColor Yellow
    }
} catch {
    Write-Host "PostgreSQL не найден в PATH" -ForegroundColor Yellow
    Write-Host "Убедитесь, что PostgreSQL установлен и добавлен в PATH" -ForegroundColor Yellow
}

# Шаг 4: Инструкции
Write-Host "`n[4/4] Завершение настройки..." -ForegroundColor Yellow
Write-Host "`n=== Следующие шаги ===" -ForegroundColor Green
Write-Host "1. Убедитесь, что PostgreSQL установлен и запущен" -ForegroundColor White
Write-Host "2. Создайте базу данных: CREATE DATABASE forum_db;" -ForegroundColor White
Write-Host "3. Отредактируйте backend\.env и укажите правильный DB_PASSWORD" -ForegroundColor White
Write-Host "4. Запустите миграции: cd backend && npm run migrate" -ForegroundColor White
Write-Host "5. Запустите проект: npm run dev" -ForegroundColor White
Write-Host "`nГотово! Проект настроен." -ForegroundColor Green
