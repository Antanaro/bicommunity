#!/bin/bash
# Скрипт для настройки виртуальной машины перед развертыванием
# Использование: ./setup-vm.sh

set -e

echo "========================================"
echo "Настройка виртуальной машины"
echo "========================================"
echo ""

# Проверка, что скрипт запущен от root или с sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Запустите скрипт с sudo: sudo ./setup-vm.sh"
    exit 1
fi

# Определение дистрибутива
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Не удалось определить дистрибутив Linux"
    exit 1
fi

echo "Обнаружен дистрибутив: $OS"
echo ""

# Обновление системы
echo "Обновление системы..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt update && apt upgrade -y
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    yum update -y
fi
echo "Система обновлена!"
echo ""

# Установка Docker
if ! command -v docker &> /dev/null; then
    echo "Установка Docker..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        yum install -y docker
        systemctl start docker
        systemctl enable docker
    fi
    echo "Docker установлен!"
else
    echo "Docker уже установлен: $(docker --version)"
fi
echo ""

# Установка Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo "Установка Docker Compose..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt install -y docker-compose-plugin
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    echo "Docker Compose установлен!"
else
    echo "Docker Compose уже установлен: $(docker compose version)"
fi
echo ""

# Добавление пользователя в группу docker
if [ -n "$SUDO_USER" ]; then
    echo "Добавление пользователя $SUDO_USER в группу docker..."
    usermod -aG docker $SUDO_USER
    echo "Пользователь добавлен в группу docker!"
    echo "ВНИМАНИЕ: Выйдите и войдите снова, чтобы изменения вступили в силу!"
    echo ""
fi

# Настройка firewall
echo "Настройка firewall..."
if command -v ufw &> /dev/null; then
    echo "Настройка UFW..."
    ufw allow 22/tcp   # SSH
    ufw allow 80/tcp   # HTTP
    ufw allow 443/tcp  # HTTPS
    ufw --force enable
    echo "UFW настроен!"
elif command -v firewall-cmd &> /dev/null; then
    echo "Настройка firewalld..."
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo "firewalld настроен!"
else
    echo "Firewall не обнаружен. Настройте вручную при необходимости."
fi
echo ""

# Проверка портов
echo "Проверка занятых портов..."
if command -v netstat &> /dev/null; then
    netstat -tulpn | grep -E ':(80|443|5432)' || echo "Порты 80, 443, 5432 свободны"
elif command -v ss &> /dev/null; then
    ss -tulpn | grep -E ':(80|443|5432)' || echo "Порты 80, 443, 5432 свободны"
fi
echo ""

# Установка дополнительных утилит
echo "Установка дополнительных утилит..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    apt install -y curl wget git nano
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    yum install -y curl wget git nano
fi
echo "Утилиты установлены!"
echo ""

echo "========================================"
echo "Настройка завершена!"
echo "========================================"
echo ""
echo "Следующие шаги:"
echo "1. Выйдите и войдите снова (для применения изменений группы docker)"
echo "2. Скопируйте проект на VM"
echo "3. Создайте .env файл в корне проекта"
echo "4. Запустите: docker compose up -d"
echo ""
