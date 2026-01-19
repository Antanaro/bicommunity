#!/bin/bash
# Bash скрипт для развертывания проекта на виртуальную машину через SSH
# Использование: ./deploy-to-vm.sh user@host [path]

set -e

VM_HOST=${1:-}
VM_PATH=${2:-~/bicommunity}

if [ -z "$VM_HOST" ]; then
    echo "Использование: ./deploy-to-vm.sh user@host [path]"
    echo "Пример: ./deploy-to-vm.sh user@192.168.1.100 ~/bicommunity"
    exit 1
fi

echo "========================================"
echo "Развертывание проекта на VM"
echo "========================================"
echo "Хост: $VM_HOST"
echo "Путь: $VM_PATH"
echo ""

# Проверка SSH подключения
echo "Проверка SSH подключения..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$VM_HOST" "echo 'OK'" &>/dev/null; then
    echo "ОШИБКА: Не удалось подключиться к VM через SSH!"
    echo "Убедитесь, что SSH доступен и настроен."
    exit 1
fi
echo "SSH подключение успешно!"
echo ""

# Проверка Docker на VM
echo "Проверка Docker на VM..."
if ! ssh "$VM_HOST" "docker --version && docker compose version" &>/dev/null; then
    echo "ОШИБКА: Docker не установлен на VM!"
    echo "Запустите setup-vm.sh на VM для установки Docker."
    exit 1
fi
echo "Docker установлен!"
echo ""

# Создание директории на VM
echo "Создание директории на VM..."
ssh "$VM_HOST" "mkdir -p $VM_PATH"
echo "Директория создана: $VM_PATH"
echo ""

# Копирование файлов
echo "Копирование файлов на VM..."
echo "Это может занять некоторое время..."
echo ""

# Использование rsync для эффективного копирования
rsync -avz \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'build' \
    --exclude '*.log' \
    --exclude '.env.local' \
    --exclude '.env.development.local' \
    --exclude 'uploads/*' \
    --exclude '.vscode' \
    --exclude '.idea' \
    --exclude '*.swp' \
    --exclude '*.swo' \
    --exclude '.DS_Store' \
    --exclude 'Thumbs.db' \
    -e ssh \
    ./ "$VM_HOST:$VM_PATH/"

if [ $? -ne 0 ]; then
    echo "ОШИБКА при копировании файлов!"
    exit 1
fi

echo "Файлы скопированы!"
echo ""

# Копирование .env файла отдельно (если существует)
if [ -f ".env" ]; then
    echo "Копирование .env файла..."
    scp ".env" "$VM_HOST:$VM_PATH/.env"
    echo ".env файл скопирован!"
    echo ""
else
    echo "ВНИМАНИЕ: .env файл не найден. Создайте его на VM вручную!"
    echo ""
fi

# Запуск Docker Compose на VM
echo "Запуск Docker Compose на VM..."
echo ""

ssh "$VM_HOST" << EOF
    set -e
    cd $VM_PATH
    echo "Остановка существующих контейнеров..."
    docker compose down || true
    echo "Сборка образов..."
    docker compose build
    echo "Запуск контейнеров..."
    docker compose up -d
    echo ""
    echo "Статус контейнеров:"
    docker compose ps
EOF

if [ $? -ne 0 ]; then
    echo "ОШИБКА при запуске Docker Compose!"
    echo "Подключитесь к VM и проверьте логи: docker compose logs"
    exit 1
fi

echo ""
echo "========================================"
echo "Развертывание завершено!"
echo "========================================"
echo ""
echo "Проверьте статус контейнеров:"
echo "  ssh $VM_HOST 'cd $VM_PATH && docker compose ps'"
echo ""
echo "Просмотр логов:"
echo "  ssh $VM_HOST 'cd $VM_PATH && docker compose logs -f'"
echo ""
echo "Откройте в браузере:"
echo "  http://$(echo $VM_HOST | cut -d@ -f2)"
echo ""
