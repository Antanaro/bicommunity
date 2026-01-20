# Simple script to copy project to VM
# Usage: .\copy-to-vm.ps1

$VM_HOST = "158.160.24.193"
$VM_USER = "antanaro"
$VM_PATH = "~/bicommunity"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Copying project to VM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create directory on VM
Write-Host "Creating directory on VM..." -ForegroundColor Yellow
ssh "${VM_USER}@${VM_HOST}" "mkdir -p ${VM_PATH}" 2>&1 | Out-Null
Write-Host "Directory created" -ForegroundColor Green
Write-Host ""

# Copy main files
Write-Host "Copying project files..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan
Write-Host ""

# List of files and folders to copy
$items = @(
    "docker-compose.yml",
    "nginx.conf",
    "env.template",
    "backend",
    "frontend",
    "nginx"
)

foreach ($item in $items) {
    if (Test-Path $item) {
        Write-Host "Copying: $item" -ForegroundColor Gray
        scp -r -o StrictHostKeyChecking=no $item "${VM_USER}@${VM_HOST}:${VM_PATH}/" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  OK: $item copied" -ForegroundColor Green
        } else {
            Write-Host "  ERROR: Failed to copy $item" -ForegroundColor Red
        }
    }
}

# Copy .env file separately if exists
if (Test-Path ".env") {
    Write-Host ""
    Write-Host "Copying .env file..." -ForegroundColor Yellow
    scp -o StrictHostKeyChecking=no ".env" "${VM_USER}@${VM_HOST}:${VM_PATH}/.env" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: .env copied" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Failed to copy .env" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "WARNING: .env file not found!" -ForegroundColor Yellow
    Write-Host "Create it on VM: cp env.template .env" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Copy completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Connect to VM:" -ForegroundColor White
Write-Host "   ssh ${VM_USER}@${VM_HOST}" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Go to project directory:" -ForegroundColor White
Write-Host "   cd ${VM_PATH}" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Create/update .env file:" -ForegroundColor White
Write-Host "   cp env.template .env" -ForegroundColor Gray
Write-Host "   nano .env" -ForegroundColor Gray
Write-Host "   (Set FRONTEND_URL=http://${VM_HOST})" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Start project:" -ForegroundColor White
Write-Host '   docker compose up -d' -ForegroundColor Gray
Write-Host ""
