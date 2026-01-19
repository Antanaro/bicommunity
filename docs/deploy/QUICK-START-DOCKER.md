# Быстрый старт с Docker

## Требования

- **Docker Desktop** для Windows (или Docker Engine + Docker Compose)
- Если команда `docker compose` не работает, попробуйте `docker-compose` (старая версия)

## Проверка установки Docker

```powershell
# Проверьте версию Docker
docker --version

# Проверьте версию Docker Compose
docker compose version
# ИЛИ (для старых версий)
docker-compose --version
```

Если Docker не установлен:
1. Скачайте [Docker Desktop для Windows](https://www.docker.com/products/docker-desktop/)
2. Установите и перезапустите компьютер
3. Запустите Docker Desktop

## Шаг 1: Создайте файл `.env`

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
DB_NAME=forum_db
DB_USER=postgres
DB_PASSWORD=ваш_пароль_для_бд
JWT_SECRET=$(openssl rand -hex 32)
FRONTEND_URL=http://localhost
HTTP_PORT=80
HTTPS_PORT=443
```

**Важно:** Замените `ваш_пароль_для_бд` на безопасный пароль!

## Шаг 2: Запустите Docker Compose

**Для новых версий Docker (рекомендуется):**
```powershell
docker compose up -d --build
```

**Для старых версий Docker:**
```powershell
docker-compose up -d --build
```

> **Примечание:** В новых версиях Docker команда изменилась с `docker-compose` на `docker compose` (без дефиса, как подкоманда docker).

Это команда:
- Соберет все Docker образы
- Запустит PostgreSQL, Backend и Nginx
- Автоматически выполнит миграции базы данных
- Соберет и включит frontend в nginx

## Шаг 3: Проверьте статус

**Новая версия:**
```powershell
docker compose ps
```

**Старая версия:**
```powershell
docker-compose ps
```

Все сервисы должны быть в статусе "Up".

## Шаг 4: Откройте в браузере

Откройте http://localhost (или IP вашей виртуальной машины)

## Полезные команды

### Просмотр логов
```powershell
# Новая версия
docker compose logs -f
# Старая версия
docker-compose logs -f
```

### Остановка
```powershell
docker compose down
# или
docker-compose down
```

### Перезапуск
```powershell
docker compose restart
# или
docker-compose restart
```

### Выполнение команд в контейнере
```powershell
# Зайти в backend контейнер
docker compose exec backend sh
# или
docker-compose exec backend sh

# Выполнить миграции вручную (если нужно)
docker compose exec backend npm run migrate
# или
docker-compose exec backend npm run migrate
```

## Устранение проблем

### Если порты заняты
Измените порты в `.env`:
```env
HTTP_PORT=8080
DB_PORT=5433
```

### Если нужно пересобрать образы
```powershell
docker compose build --no-cache
docker compose up -d
# или
docker-compose build --no-cache
docker-compose up -d
```

### Очистка и перезапуск
```powershell
docker compose down -v  # ⚠️ Удалит данные БД!
docker compose up -d --build
# или
docker-compose down -v
docker-compose up -d --build
```
