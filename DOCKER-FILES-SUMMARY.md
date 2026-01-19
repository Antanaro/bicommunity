# Сводка Docker файлов

## Созданные файлы

### Основные файлы Docker

1. **`docker-compose.yml`** - Главный файл оркестрации
   - Определяет 3 сервиса: postgres, backend, nginx
   - Настраивает volumes, networks, healthchecks
   - Автоматически запускает миграции при старте backend

2. **`nginx.conf`** - Конфигурация Nginx
   - Проксирует `/api` на backend
   - Проксирует `/uploads` на backend
   - Обслуживает статические файлы frontend из `/usr/share/nginx/html`
   - Поддержка SPA (React Router) через `try_files`
   - Готов к настройке SSL/HTTPS

### Backend

3. **`backend/Dockerfile`** - Образ для backend
   - Multi-stage build (builder + production)
   - Устанавливает PostgreSQL клиент для healthcheck
   - Копирует миграции и скрипты
   - Использует entrypoint для автоматических миграций

4. **`backend/docker-entrypoint.sh`** - Скрипт запуска backend
   - Ждет готовности PostgreSQL
   - Автоматически выполняет миграции
   - Запускает приложение

5. **`backend/.dockerignore`** - Исключения для сборки backend
   - Исключает node_modules, логи, .env файлы

### Frontend/Nginx

6. **`nginx/Dockerfile`** - Образ для nginx с frontend
   - Multi-stage build: собирает frontend, затем копирует в nginx
   - Frontend автоматически собирается при сборке образа
   - Статические файлы доступны через nginx

7. **`frontend/Dockerfile`** - Отдельный Dockerfile для frontend (опционально)
   - Может использоваться для отдельной сборки frontend
   - В основном проекте используется через nginx/Dockerfile

8. **`frontend/.dockerignore`** - Исключения для сборки frontend

### Документация

9. **`DOCKER-SETUP.md`** - Полная документация по развертыванию
10. **`QUICK-START-DOCKER.md`** - Быстрая инструкция по запуску

## Структура сервисов

```
┌─────────────┐
│   Nginx     │ ← Порт 80/443 (публичный)
│  (Frontend  │
│   встроен)  │
└──────┬──────┘
       │
       ├──→ /api → ┌──────────┐
       │           │ Backend  │ ← Порт 5000 (внутренний)
       │           │ (Node.js)│
       │           └────┬─────┘
       │                │
       └──→ /uploads ───┘
                    │
                    ▼
            ┌──────────────┐
            │  PostgreSQL  │ ← Порт 5432 (внутренний)
            └──────────────┘
```

## Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# База данных
DB_NAME=forum_db
DB_USER=postgres
DB_PASSWORD=your_password

# Безопасность
JWT_SECRET=your_secret_key

# URL
FRONTEND_URL=http://localhost

# Порты
HTTP_PORT=80
HTTPS_PORT=443
DB_PORT=5432

# Опционально: SMTP, Telegram
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
TELEGRAM_BOT_TOKEN=
```

## Команды для запуска

```bash
# Первый запуск (сборка образов)
docker-compose up -d --build

# Обычный запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Пересборка
docker-compose build --no-cache
docker-compose up -d
```

## Особенности

1. **Автоматические миграции** - выполняются при первом запуске backend
2. **Healthchecks** - для postgres и backend
3. **Volumes** - данные БД и загрузки сохраняются между перезапусками
4. **SPA поддержка** - React Router работает корректно
5. **Готовность к SSL** - можно легко добавить HTTPS

## Порты

- **80** - HTTP (nginx)
- **443** - HTTPS (nginx, если настроен)
- **5432** - PostgreSQL (опционально, для внешнего доступа)

## Volumes

- `postgres_data` - данные базы данных
- `backend_uploads` - загруженные изображения

## Следующие шаги

1. Создайте `.env` файл с вашими настройками
2. Запустите `docker-compose up -d --build`
3. Откройте http://localhost в браузере
4. (Опционально) Настройте SSL для HTTPS
