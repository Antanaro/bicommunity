# PowerShell скрипт для развертывания проекта на виртуальную машину через SSH
# Использование: .\deploy-to-vm.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$VmHost,
    
    [Parameter(Mandatory=$true)]
    [string]$VmUser,
    
    [string]$VmPath = "~/bicommunity",
    [string]$SshKey = "",
    [switch]$SkipBuild = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Развертывание проекта на VM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия .env файла
if (-not (Test-Path ".env")) {
    Write-Host "ВНИМАНИЕ: Файл .env не найден!" -ForegroundColor Yellow
    Write-Host "Создайте файл .env на основе env.template перед развертыванием." -ForegroundColor Yellow
    $continue = Read-Host "Продолжить без .env файла? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Прервано пользователем." -ForegroundColor Red
        exit 1
    }
}

# Проверка SSH подключения
Write-Host "Проверка SSH подключения к $VmUser@$VmHost..." -ForegroundColor Yellow
if ($SshKey) {
    $sshTest = ssh -i $SshKey -o ConnectTimeout=5 -o BatchMode=yes "$VmUser@$VmHost" "echo 'OK'" 2>&1
} else {
    $sshTest = ssh -o ConnectTimeout=5 -o BatchMode=yes "$VmUser@$VmHost" "echo 'OK'" 2>&1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Не удалось подключиться к VM через SSH!" -ForegroundColor Red
    Write-Host "Убедитесь, что:" -ForegroundColor Yellow
    Write-Host "  1. VM доступна и SSH сервис запущен" -ForegroundColor Yellow
    Write-Host "  2. Указаны правильные хост и пользователь" -ForegroundColor Yellow
    Write-Host "  3. SSH ключ настроен (или используйте пароль)" -ForegroundColor Yellow
    exit 1
}

Write-Host "SSH подключение успешно!" -ForegroundColor Green
Write-Host ""

# Проверка Docker на VM
Write-Host "Проверка Docker на VM..." -ForegroundColor Yellow
if ($SshKey) {
    $dockerCheck = ssh -i $SshKey "$VmUser@$VmHost" "docker --version && docker compose version" 2>&1
} else {
    $dockerCheck = ssh "$VmUser@$VmHost" "docker --version && docker compose version" 2>&1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА: Docker не установлен на VM!" -ForegroundColor Red
    Write-Host "Установите Docker и Docker Compose перед продолжением." -ForegroundColor Yellow
    exit 1
}

Write-Host $dockerCheck -ForegroundColor Green
Write-Host ""

# Создание директории на VM
Write-Host "Создание директории на VM..." -ForegroundColor Yellow
if ($SshKey) {
    ssh -i $SshKey "$VmUser@$VmHost" "mkdir -p $VmPath" | Out-Null
} else {
    ssh "$VmUser@$VmHost" "mkdir -p $VmPath" | Out-Null
}
Write-Host "Директория создана: $VmPath" -ForegroundColor Green
Write-Host ""

# Определение файлов для исключения
$excludePatterns = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    "*.log",
    ".env.local",
    ".env.development.local",
    "uploads/*",
    ".vscode",
    ".idea",
    "*.swp",
    "*.swo",
    ".DS_Store",
    "Thumbs.db"
)

# Создание временного файла с исключениями для rsync
$excludeFile = [System.IO.Path]::GetTempFileName()
$excludePatterns | ForEach-Object { Add-Content -Path $excludeFile -Value $_ }

Write-Host "Копирование файлов на VM..." -ForegroundColor Yellow
Write-Host "Это может занять некоторое время..." -ForegroundColor Yellow

# Копирование файлов через SCP
$scpArgs = @()
if ($SshKey) {
    $scpArgs += "-i", $SshKey
}
$scpArgs += "-r", "-o", "StrictHostKeyChecking=no"

# Исключение файлов через rsync (если доступен) или простой scp
$rsyncAvailable = Get-Command rsync -ErrorAction SilentlyContinue

if ($rsyncAvailable) {
    Write-Host "Использование rsync для эффективного копирования..." -ForegroundColor Cyan
    $rsyncArgs = @(
        "-avz",
        "--exclude-from=$excludeFile",
        "--exclude=.env",  # .env копируем отдельно
        "-e"
    )
    
    if ($SshKey) {
        $rsyncArgs += "ssh", "-i", $SshKey
    } else {
        $rsyncArgs += "ssh"
    }
    
    $rsyncArgs += ".", "$VmUser@${VmHost}:$VmPath/"
    
    & rsync @rsyncArgs
} else {
    Write-Host "Использование SCP (rsync не найден)..." -ForegroundColor Cyan
    Write-Host "ВНИМАНИЕ: node_modules и другие большие папки будут скопированы!" -ForegroundColor Yellow
    Write-Host "Рекомендуется использовать Git на VM для более эффективного развертывания." -ForegroundColor Yellow
    
    $scpArgs += ".", "$VmUser@${VmHost}:$VmPath/"
    & scp @scpArgs
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА при копировании файлов!" -ForegroundColor Red
    Remove-Item $excludeFile -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Файлы скопированы!" -ForegroundColor Green
Write-Host ""

# Копирование .env файла отдельно (если существует)
if (Test-Path ".env") {
    Write-Host "Копирование .env файла..." -ForegroundColor Yellow
    if ($SshKey) {
        scp -i $SshKey -o StrictHostKeyChecking=no ".env" "$VmUser@${VmHost}:$VmPath/.env" | Out-Null
    } else {
        scp -o StrictHostKeyChecking=no ".env" "$VmUser@${VmHost}:$VmPath/.env" | Out-Null
    }
    Write-Host ".env файл скопирован!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "ВНИМАНИЕ: .env файл не найден. Создайте его на VM вручную!" -ForegroundColor Yellow
    Write-Host ""
}

# Удаление временного файла
Remove-Item $excludeFile -ErrorAction SilentlyContinue

# Запуск Docker Compose на VM
Write-Host "Запуск Docker Compose на VM..." -ForegroundColor Yellow
Write-Host ""

$dockerCommands = @(
    "cd $VmPath",
    "docker compose down",
    "docker compose build",
    "docker compose up -d"
)

$fullCommand = ($dockerCommands -join " && ")

if ($SshKey) {
    ssh -i $SshKey "$VmUser@$VmHost" $fullCommand
} else {
    ssh "$VmUser@$VmHost" $fullCommand
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "ОШИБКА при запуске Docker Compose!" -ForegroundColor Red
    Write-Host "Подключитесь к VM и проверьте логи: docker compose logs" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Развертывание завершено!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Проверьте статус контейнеров:" -ForegroundColor Cyan
Write-Host "  ssh $VmUser@$VmHost 'cd $VmPath; docker compose ps'" -ForegroundColor White
Write-Host ""
Write-Host "Просмотр логов:" -ForegroundColor Cyan
Write-Host "  ssh $VmUser@$VmHost 'cd $VmPath; docker compose logs -f'" -ForegroundColor White
Write-Host ""
Write-Host "Откройте в браузере:" -ForegroundColor Cyan
$url = "http://$VmHost"
Write-Host "  $url" -ForegroundColor White
Write-Host ""
