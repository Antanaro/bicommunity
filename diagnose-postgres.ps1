# Скрипт для диагностики проблем с подключением к PostgreSQL

Write-Host "=== Диагностика подключения к PostgreSQL ===" -ForegroundColor Green
Write-Host ""

# Шаг 1: Проверка службы PostgreSQL
Write-Host "[1/6] Проверка службы PostgreSQL..." -ForegroundColor Yellow
$pgServices = Get-Service -Name postgresql* -ErrorAction SilentlyContinue

if ($pgServices) {
    foreach ($service in $pgServices) {
        Write-Host "  Найдена служба: $($service.Name) - Статус: $($service.Status)" -ForegroundColor Cyan
        
        if ($service.Status -ne "Running") {
            Write-Host "  ⚠️  Служба не запущена!" -ForegroundColor Red
            $start = Read-Host "  Запустить службу $($service.Name)? (y/n)"
            if ($start -eq "y" -or $start -eq "Y") {
                try {
                    Start-Service -Name $service.Name
                    Write-Host "  ✅ Служба запущена" -ForegroundColor Green
                    Start-Sleep -Seconds 2
                } catch {
                    Write-Host "  ❌ Ошибка при запуске: $_" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "  ✅ Служба запущена" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  ❌ Службы PostgreSQL не найдены!" -ForegroundColor Red
    Write-Host "  Убедитесь, что PostgreSQL установлен." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Шаг 2: Проверка порта 5432
Write-Host ""
Write-Host "[2/6] Проверка порта 5432..." -ForegroundColor Yellow
$portCheck = netstat -an | Select-String "5432"
if ($portCheck) {
    Write-Host "  ✅ Порт 5432 используется:" -ForegroundColor Green
    $portCheck | ForEach-Object { Write-Host "    $_" -ForegroundColor Cyan }
} else {
    Write-Host "  ⚠️  Порт 5432 не прослушивается" -ForegroundColor Yellow
    Write-Host "  PostgreSQL может быть настроен на другой порт или не принимать TCP/IP подключения" -ForegroundColor Yellow
}

# Шаг 3: Проверка процессов PostgreSQL
Write-Host ""
Write-Host "[3/6] Проверка процессов PostgreSQL..." -ForegroundColor Yellow
$pgProcesses = Get-Process -Name postgres -ErrorAction SilentlyContinue
if ($pgProcesses) {
    Write-Host "  ✅ Найдено процессов PostgreSQL: $($pgProcesses.Count)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Процессы PostgreSQL не найдены" -ForegroundColor Yellow
}

# Шаг 4: Проверка файла .env
Write-Host ""
Write-Host "[4/6] Проверка файла backend/.env..." -ForegroundColor Yellow
$envPath = "backend\.env"
if (Test-Path $envPath) {
    Write-Host "  ✅ Файл .env существует" -ForegroundColor Green
    $envContent = Get-Content $envPath
    $hasDbHost = $envContent | Select-String "DB_HOST"
    $hasDbPort = $envContent | Select-String "DB_PORT"
    $hasDbUser = $envContent | Select-String "DB_USER"
    $hasDbPassword = $envContent | Select-String "DB_PASSWORD"
    
    if ($hasDbHost -and $hasDbPort -and $hasDbUser -and $hasDbPassword) {
        Write-Host "  ✅ Все необходимые переменные окружения найдены" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Некоторые переменные окружения отсутствуют" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ❌ Файл .env не найден!" -ForegroundColor Red
    Write-Host "  Создайте файл backend/.env согласно инструкции в SETUP.md" -ForegroundColor Yellow
}

# Шаг 5: Попытка подключения через psql
Write-Host ""
Write-Host "[5/6] Проверка подключения через psql..." -ForegroundColor Yellow
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlPath) {
    Write-Host "  ✅ psql найден: $($psqlPath.Source)" -ForegroundColor Green
    Write-Host "  Попробуйте подключиться вручную:" -ForegroundColor Cyan
    Write-Host "    psql -U postgres -h localhost -p 5432" -ForegroundColor Cyan
} else {
    Write-Host "  ⚠️  psql не найден в PATH" -ForegroundColor Yellow
    Write-Host "  Это нормально, если PostgreSQL не добавлен в PATH" -ForegroundColor Cyan
}

# Шаг 6: Запуск скрипта проверки подключения Node.js
Write-Host ""
Write-Host "[6/6] Запуск проверки подключения через Node.js..." -ForegroundColor Yellow
if (Test-Path "backend\package.json") {
    Set-Location backend
    if (Test-Path "node_modules") {
        Write-Host "  Запуск npm run check-db..." -ForegroundColor Cyan
        npm run check-db
    } else {
        Write-Host "  ⚠️  node_modules не найден. Установите зависимости:" -ForegroundColor Yellow
        Write-Host "    cd backend && npm install" -ForegroundColor Cyan
    }
    Set-Location ..
} else {
    Write-Host "  ⚠️  backend/package.json не найден" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Диагностика завершена ===" -ForegroundColor Green
Write-Host ""
Write-Host "Если проблема не решена, проверьте:" -ForegroundColor Yellow
Write-Host "1. Конфигурацию PostgreSQL (postgresql.conf и pg_hba.conf)" -ForegroundColor Cyan
Write-Host "2. Настройки файрвола Windows" -ForegroundColor Cyan
Write-Host "3. Правильность пароля в backend/.env" -ForegroundColor Cyan
Write-Host ""