# Инструкция по переносу проекта на виртуальную машину через SSH

## Предварительные требования

1. **SSH доступ к виртуальной машине**
   - IP адрес или доменное имя VM
   - Логин и пароль (или SSH ключ)
   - SSH клиент (встроен в Windows 10/11, или используйте PuTTY)

2. **На виртуальной машине должны быть установлены:**
   - Docker (версия 20.10+)
   - Docker Compose (версия 2.0+)

## Шаг 1: Проверка Docker на VM

Подключитесь к VM через SSH и проверьте установку Docker:

```bash
ssh username@your-vm-ip
```

Проверьте Docker:
```bash
docker --version
docker compose version
```

Если Docker не установлен, установите его:

**Для Ubuntu/Debian:**
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo apt install docker-compose-plugin -y

# Перезапуск сессии (или выйдите и войдите снова)
newgrp docker
```

**Для CentOS/RHEL:**
```bash
# Установка Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## Шаг 2: Подготовка проекта на локальной машине

### 2.1. Создайте файл `.env` в корне проекта

Скопируйте `env.template` в `.env` и заполните значения:

```bash
# На Windows PowerShell
Copy-Item env.template .env
```

Отредактируйте `.env` файл и укажите:
- `DB_PASSWORD` - надежный пароль для PostgreSQL
- `JWT_SECRET` - случайный секретный ключ (можно сгенерировать: `openssl rand -hex 32`)
- `FRONTEND_URL` - URL вашего домена (например: `http://your-vm-ip` или `https://yourdomain.com`)
- Остальные настройки по необходимости

### 2.2. Убедитесь, что порты свободны на VM

На VM проверьте, что порты 80, 443 и 5432 свободны:

```bash
sudo netstat -tulpn | grep -E ':(80|443|5432)'
# или
sudo ss -tulpn | grep -E ':(80|443|5432)'
```

Если порты заняты, измените их в `.env` файле:
```env
HTTP_PORT=8080
HTTPS_PORT=8443
DB_PORT=5433
```

## Шаг 3: Копирование проекта на VM

### Вариант A: Использование PowerShell скрипта (Windows)

Используйте скрипт `deploy-to-vm.ps1` (см. ниже) для автоматического копирования.

### Вариант B: Ручное копирование через SCP

**Из Windows (PowerShell):**
```powershell
# Создайте архив проекта (исключая node_modules и другие ненужные файлы)
# Или используйте Git для клонирования на VM

# Копирование через SCP
scp -r -o StrictHostKeyChecking=no . username@your-vm-ip:/home/username/bicommunity
```

**Или используйте WinSCP / FileZilla** для графического интерфейса.

### Вариант C: Использование Git (рекомендуется)

Если проект в Git репозитории:

```bash
# На VM
cd ~
git clone your-repository-url bicommunity
cd bicommunity
```

## Шаг 4: Настройка на виртуальной машине

### 4.1. Подключитесь к VM

```bash
ssh username@your-vm-ip
cd ~/bicommunity  # или путь, куда скопировали проект
```

### 4.2. Создайте файл `.env`

```bash
# Если файл .env не был скопирован, создайте его
cp env.template .env
nano .env  # или используйте vi/vim
```

**Важно:** Обновите следующие значения в `.env`:
- `FRONTEND_URL` - должен указывать на IP или домен вашей VM
- `DB_PASSWORD` - надежный пароль
- `JWT_SECRET` - сгенерируйте новый: `openssl rand -hex 32`

### 4.3. Создайте директорию для SSL сертификатов (опционально)

Если планируете использовать HTTPS:

```bash
mkdir -p nginx/ssl
# Позже добавьте туда сертификаты cert.pem и key.pem
```

### 4.4. Настройте firewall (если используется)

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

## Шаг 5: Запуск проекта

### 5.1. Остановите существующие контейнеры (если есть)

```bash
cd ~/bicommunity
docker compose down
```

### 5.2. Соберите и запустите контейнеры

```bash
# Сборка образов
docker compose build

# Запуск в фоновом режиме
docker compose up -d

# Просмотр логов
docker compose logs -f
```

### 5.3. Проверка статуса

```bash
# Статус контейнеров
docker compose ps

# Логи всех сервисов
docker compose logs

# Логи конкретного сервиса
docker compose logs backend
docker compose logs postgres
docker compose logs nginx
```

### 5.4. Выполнение миграций базы данных

Миграции должны запуститься автоматически через `docker-entrypoint.sh`, но если нужно запустить вручную:

```bash
# Войти в контейнер backend
docker compose exec backend sh

# Запустить миграции
npm run migrate
```

## Шаг 6: Проверка работы

### 6.1. Проверка через браузер

Откройте в браузере:
- `http://your-vm-ip` - должен открыться frontend
- `http://your-vm-ip/api/health` - должен вернуть статус

### 6.2. Проверка через curl

```bash
# Health check
curl http://localhost/api/health

# Проверка frontend
curl http://localhost
```

## Шаг 7: Настройка домена (опционально)

Если у вас есть домен:

1. Настройте DNS записи, чтобы домен указывал на IP вашей VM
2. Обновите `FRONTEND_URL` в `.env` файле
3. Настройте SSL сертификат (Let's Encrypt):

```bash
# Установка certbot
sudo apt install certbot -y

# Получение сертификата
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Копирование сертификатов
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem

# Раскомментируйте HTTPS секцию в nginx.conf
# Перезапустите контейнеры
docker compose restart nginx
```

## Обновление проекта

При обновлении кода:

```bash
# На VM
cd ~/bicommunity

# Получить обновления (если используете Git)
git pull

# Пересобрать и перезапустить
docker compose down
docker compose build
docker compose up -d

# Просмотр логов
docker compose logs -f
```

## Резервное копирование

### Резервное копирование базы данных

```bash
# Создайте скрипт backup-db.sh
cat > ~/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
docker compose exec -T postgres pg_dump -U postgres forum_db > $BACKUP_DIR/forum_db_$(date +%Y%m%d_%H%M%S).sql
# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "forum_db_*.sql" -mtime +7 -delete
EOF

chmod +x ~/backup-db.sh

# Добавьте в crontab (ежедневно в 2:00)
crontab -e
# Добавьте строку:
# 0 2 * * * ~/backup-db.sh
```

## Устранение неполадок

### Контейнеры не запускаются

```bash
# Проверьте логи
docker compose logs

# Проверьте статус
docker compose ps

# Проверьте использование ресурсов
docker stats
```

### Проблемы с базой данных

```bash
# Проверьте подключение к БД
docker compose exec backend npm run check-db

# Проверьте логи PostgreSQL
docker compose logs postgres
```

### Проблемы с портами

```bash
# Проверьте, какие порты заняты
sudo netstat -tulpn | grep -E ':(80|443|5432)'

# Остановите конфликтующие сервисы или измените порты в .env
```

### Проблемы с правами доступа

```bash
# Проверьте права на файлы
ls -la

# Исправьте права (если нужно)
sudo chown -R $USER:$USER .
```

## Полезные команды

```bash
# Остановка всех контейнеров
docker compose down

# Остановка с удалением volumes (ОСТОРОЖНО: удалит данные БД!)
docker compose down -v

# Перезапуск конкретного сервиса
docker compose restart backend

# Просмотр использования ресурсов
docker stats

# Очистка неиспользуемых образов
docker system prune -a

# Просмотр логов в реальном времени
docker compose logs -f backend
```

## Безопасность

1. ✅ Используйте сильный `JWT_SECRET` и `DB_PASSWORD`
2. ✅ Настройте firewall (откройте только необходимые порты)
3. ✅ Используйте HTTPS в production
4. ✅ Регулярно обновляйте Docker образы
5. ✅ Настройте резервное копирование БД
6. ✅ Не храните `.env` файл в Git репозитории

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker compose logs`
2. Проверьте статус контейнеров: `docker compose ps`
3. Проверьте использование ресурсов: `docker stats`
4. Проверьте настройки в `.env` файле
