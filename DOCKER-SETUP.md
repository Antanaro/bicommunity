# Docker Setup для развертывания форума

Этот документ описывает процесс развертывания форума с использованием Docker и Docker Compose.

## Требования

- Docker (версия 20.10 или выше)
- Docker Compose (версия 2.0 или выше)

> **Важно:** В новых версиях Docker команда изменилась:
> - **Новая версия:** `docker compose` (без дефиса, подкоманда docker)
> - **Старая версия:** `docker-compose` (с дефисом, отдельная команда)
>
> Если `docker compose` не работает, попробуйте `docker-compose`

### Проверка установки

```powershell
# Проверьте версию Docker
docker --version

# Проверьте версию Docker Compose (новая версия)
docker compose version

# Или для старой версии
docker-compose --version
```

## Быстрый старт

### 1. Создайте файл `.env` в корне проекта

Скопируйте переменные окружения из примера ниже и заполните значения:

```env
# База данных PostgreSQL
DB_NAME=forum_db
DB_USER=postgres
DB_PASSWORD=your_secure_password_here

# JWT Secret (ОБЯЗАТЕЛЬНО измените!)
# Сгенерируйте безопасный ключ: openssl rand -hex 32
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# URL фронтенда (для CORS)
FRONTEND_URL=http://localhost

# Порты для nginx
HTTP_PORT=80
HTTPS_PORT=443

# Опциональные настройки SMTP для отправки email
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

# Опциональный токен Telegram-бота
TELEGRAM_BOT_TOKEN=
```

### 2. Запустите все сервисы

**Примечание:** Миграции базы данных запускаются автоматически при первом запуске backend контейнера через docker-entrypoint.sh

**Новая версия Docker:**
```powershell
docker compose up -d --build
```

**Старая версия Docker:**
```powershell
docker-compose up -d --build
```

### 4. Проверьте статус

```powershell
# Новая версия
docker compose ps
# Старая версия
docker-compose ps
```

### 5. Просмотрите логи

```powershell
# Все сервисы
docker compose logs -f
# или
docker-compose logs -f

# Конкретный сервис
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f postgres
```

## Доступ к приложению

После запуска приложение будет доступно по адресу:

- **Frontend:** http://localhost (или IP вашей виртуальной машины)
- **Backend API:** http://localhost/api
- **Health check:** http://localhost/api/health

## Структура сервисов

- **postgres** - База данных PostgreSQL
- **backend** - Node.js/Express API сервер
- **nginx** - Reverse proxy и веб-сервер (включает собранный frontend)

## Полезные команды

### Остановка сервисов
```powershell
docker compose down
# или
docker-compose down
```

### Остановка с удалением volumes (⚠️ удалит данные БД!)
```powershell
docker compose down -v
# или
docker-compose down -v
```

### Пересборка образов
```powershell
docker compose build --no-cache
# или
docker-compose build --no-cache
```

### Перезапуск конкретного сервиса
```powershell
docker compose restart backend
# или
docker-compose restart backend
```

### Выполнение команд в контейнере
```powershell
# Зайти в контейнер backend
docker compose exec backend sh
# или
docker-compose exec backend sh

# Выполнить миграции
docker compose exec backend npm run migrate
# или
docker-compose exec backend npm run migrate

# Проверить подключение к БД
docker compose exec backend npm run check-db
# или
docker-compose exec backend npm run check-db
```

## Настройка SSL/HTTPS

1. Получите SSL сертификаты (например, через Let's Encrypt)
2. Создайте директорию `nginx/ssl` в корне проекта
3. Поместите сертификаты:
   - `nginx/ssl/cert.pem` - сертификат
   - `nginx/ssl/key.pem` - приватный ключ
4. Раскомментируйте секцию HTTPS в `nginx.conf`
5. Измените `server_name` на ваш домен
6. Перезапустите nginx: `docker-compose restart nginx`

## Резервное копирование базы данных

### Создание бэкапа
```bash
docker-compose exec postgres pg_dump -U postgres forum_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Восстановление из бэкапа
```bash
docker-compose exec -T postgres psql -U postgres forum_db < backup.sql
```

## Мониторинг

### Использование ресурсов
```bash
docker stats
```

### Проверка здоровья сервисов
```bash
docker-compose ps
```

## Обновление приложения

1. Остановите сервисы: `docker-compose down`
2. Обновите код
3. Пересоберите образы: `docker-compose build`
4. Запустите: `docker-compose up -d`
5. Выполните миграции если нужно: `docker-compose exec backend npm run migrate`

## Устранение неполадок

### Проблемы с подключением к БД
```bash
# Проверьте логи postgres
docker-compose logs postgres

# Проверьте подключение из backend
docker-compose exec backend npm run check-db
```

### Проблемы с портами
Убедитесь, что порты 80, 443, 5432 не заняты другими приложениями.

### Очистка и перезапуск
```bash
# Остановить и удалить контейнеры
docker-compose down

# Удалить неиспользуемые образы
docker system prune -a

# Пересобрать и запустить
docker-compose up -d --build
```

## Production рекомендации

1. **Измените JWT_SECRET** на случайную строку
2. **Используйте сильные пароли** для БД
3. **Настройте SSL/HTTPS** для безопасности
4. **Настройте регулярные бэкапы** БД
5. **Используйте мониторинг** (например, Prometheus + Grafana)
6. **Настройте логирование** в централизованную систему
7. **Ограничьте ресурсы** контейнеров в docker-compose.yml
