# Развертывание bicommunity с GitHub

Инструкция по развертыванию форума из репозитория GitHub на виртуальной машине.

**Репозиторий:** https://github.com/antanaro/bicommunity

## Требования к серверу

- **ОС:** Ubuntu 20.04+ / Debian 11+ (или другой Linux)
- **RAM:** минимум 1 GB (рекомендуется 2 GB)
- **Docker:** версия 20.10+
- **Docker Compose:** версия 2.0+
- **Git:** для клонирования репозитория

## Быстрый старт (5 минут)

### 1. Подключитесь к серверу

```bash
ssh user@your-server-ip
```

### 2. Установите Docker (если не установлен)

```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Docker
curl -fsSL https://get.docker.com | sh

# Добавьте пользователя в группу docker
sudo usermod -aG docker $USER

# Перелогиньтесь для применения изменений
exit
# Подключитесь снова
ssh user@your-server-ip

# Проверьте установку
docker --version
docker compose version
```

### 3. Клонируйте репозиторий

```bash
# Создайте директорию для проектов (опционально)
mkdir -p ~/projects
cd ~/projects

# Клонируйте репозиторий
git clone https://github.com/antanaro/bicommunity.git
cd bicommunity
```

### 4. Создайте файл конфигурации

```bash
# Скопируйте шаблон
cp env.template .env

# Отредактируйте настройки
nano .env
```

**Обязательно измените:**

```env
# База данных PostgreSQL
DB_NAME=forum_db
DB_USER=postgres
DB_PASSWORD=ваш_надежный_пароль

# JWT Secret (ОБЯЗАТЕЛЬНО измените!)
# Сгенерируйте командой: openssl rand -hex 32
JWT_SECRET=сгенерированный_секретный_ключ

# URL вашего сайта
FRONTEND_URL=https://bicommunity.ru
BACKEND_URL=https://bicommunity.ru

# Порты
HTTP_PORT=80
HTTPS_PORT=443
```

**Опционально (для email уведомлений):**

```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@yandex.ru
SMTP_PASSWORD=ваш_пароль_приложения
SMTP_FROM=your-email@yandex.ru
```

### 5. Запустите проект

```bash
# Соберите и запустите контейнеры
docker compose up -d --build

# Проверьте статус
docker compose ps

# Посмотрите логи (при необходимости)
docker compose logs -f
```

### 6. Проверьте работу

```bash
# Проверьте API
curl http://localhost/api/health

# Или откройте в браузере
# http://your-server-ip
```

## Настройка домена и HTTPS

### 1. Направьте домен на сервер

В DNS настройках вашего домена создайте A-запись:
- **Тип:** A
- **Имя:** @ (или bicommunity.ru)
- **Значение:** IP-адрес вашего сервера

### 2. Установите Certbot для SSL

```bash
# Остановите nginx контейнер
docker compose stop nginx

# Установите certbot
sudo apt install certbot -y

# Получите сертификат
sudo certbot certonly --standalone -d bicommunity.ru -d www.bicommunity.ru

# Сертификаты будут в /etc/letsencrypt/live/bicommunity.ru/
```

### 3. Скопируйте сертификаты

```bash
# Создайте директорию для SSL
mkdir -p nginx/ssl

# Скопируйте сертификаты
sudo cp /etc/letsencrypt/live/bicommunity.ru/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/bicommunity.ru/privkey.pem nginx/ssl/

# Установите права
sudo chown -R $USER:$USER nginx/ssl/
```

### 4. Обновите nginx конфигурацию

Отредактируйте `nginx.conf` для поддержки HTTPS:

```bash
nano nginx.conf
```

Добавьте SSL секцию (пример есть в документации).

### 5. Перезапустите проект

```bash
docker compose up -d --build
```

## Обновление проекта

При выходе новой версии:

```bash
cd ~/projects/bicommunity

# Получите последние изменения
git pull origin main

# Пересоберите и перезапустите контейнеры
docker compose up -d --build

# Проверьте логи
docker compose logs -f
```

## Полезные команды

### Управление контейнерами

```bash
# Запуск
docker compose up -d

# Остановка
docker compose down

# Перезапуск
docker compose restart

# Пересборка
docker compose up -d --build

# Просмотр логов
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f nginx
```

### Работа с базой данных

```bash
# Подключение к PostgreSQL
docker compose exec postgres psql -U postgres -d forum_db

# Резервная копия БД
docker compose exec postgres pg_dump -U postgres forum_db > backup_$(date +%Y%m%d).sql

# Восстановление из бэкапа
cat backup.sql | docker compose exec -T postgres psql -U postgres -d forum_db
```

### Просмотр статуса

```bash
# Статус контейнеров
docker compose ps

# Использование ресурсов
docker stats

# Проверка здоровья
curl http://localhost/api/health
```

## Автоматическое резервное копирование

Создайте скрипт автоматического бэкапа:

```bash
# Создайте скрипт
cat > ~/backup-forum.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backups/forum
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Бэкап базы данных
docker compose -f ~/projects/bicommunity/docker-compose.yml exec -T postgres pg_dump -U postgres forum_db > $BACKUP_DIR/db_$DATE.sql

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql"
EOF

chmod +x ~/backup-forum.sh
```

Добавьте в crontab:

```bash
# Открыть crontab
crontab -e

# Добавить строку (ежедневный бэкап в 3:00)
0 3 * * * ~/backup-forum.sh >> ~/backup-forum.log 2>&1
```

## Автообновление SSL сертификатов

```bash
# Создайте скрипт обновления
cat > ~/renew-ssl.sh << 'EOF'
#!/bin/bash
cd ~/projects/bicommunity

# Остановите nginx
docker compose stop nginx

# Обновите сертификат
certbot renew --quiet

# Скопируйте новые сертификаты
cp /etc/letsencrypt/live/bicommunity.ru/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/bicommunity.ru/privkey.pem nginx/ssl/

# Запустите nginx
docker compose start nginx
EOF

chmod +x ~/renew-ssl.sh
```

Добавьте в crontab:

```bash
# Обновление сертификатов каждый месяц 1-го числа в 2:00
0 2 1 * * ~/renew-ssl.sh >> ~/renew-ssl.log 2>&1
```

## Troubleshooting

### Контейнеры не запускаются

```bash
# Проверьте логи
docker compose logs

# Проверьте .env файл
cat .env

# Убедитесь, что порты свободны
sudo netstat -tulpn | grep -E ':(80|443|5432)'
```

### Ошибка подключения к БД

```bash
# Проверьте статус PostgreSQL
docker compose logs postgres

# Проверьте переменные окружения
docker compose exec backend env | grep DB_
```

### 502 Bad Gateway

```bash
# Проверьте, что backend запущен
docker compose ps
docker compose logs backend

# Перезапустите backend
docker compose restart backend
```

### Нет места на диске

```bash
# Проверьте использование диска
df -h

# Очистите Docker кэш
docker system prune -a
```

## Безопасность

1. ✅ Используйте надежный `JWT_SECRET` (минимум 32 символа)
2. ✅ Используйте надежный пароль для PostgreSQL
3. ✅ Настройте firewall (откройте только 22, 80, 443)
4. ✅ Используйте HTTPS
5. ✅ Регулярно обновляйте систему и Docker образы
6. ✅ Настройте автоматическое резервное копирование

### Настройка Firewall (UFW)

```bash
# Установите ufw
sudo apt install ufw -y

# Разрешите SSH
sudo ufw allow 22/tcp

# Разрешите HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включите firewall
sudo ufw enable

# Проверьте статус
sudo ufw status
```

## Мониторинг

### Простой мониторинг с помощью cron

```bash
# Скрипт проверки здоровья
cat > ~/health-check.sh << 'EOF'
#!/bin/bash
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health)

if [ "$RESPONSE" != "200" ]; then
    echo "$(date): Forum is down! HTTP $RESPONSE" >> ~/health-check.log
    # Попытка перезапуска
    cd ~/projects/bicommunity && docker compose restart
fi
EOF

chmod +x ~/health-check.sh
```

Добавьте в crontab:

```bash
# Проверка каждые 5 минут
*/5 * * * * ~/health-check.sh
```

---

## Поддержка

При возникновении проблем:

1. Проверьте логи: `docker compose logs -f`
2. Убедитесь, что `.env` файл настроен правильно
3. Проверьте состояние контейнеров: `docker compose ps`
4. Создайте issue в репозитории: https://github.com/antanaro/bicommunity/issues
