# Docker команды - Справочник

## ⚠️ Важно: Две версии команд

В новых версиях Docker команда изменилась:

- **Новая версия (Docker Compose V2):** `docker compose` (без дефиса)
- **Старая версия (Docker Compose V1):** `docker-compose` (с дефисом)

## Проверка версии

```powershell
# Проверьте, какая команда работает
docker compose version
# ИЛИ
docker-compose --version
```

## Основные команды

### Запуск

```powershell
# Новая версия
docker compose up -d --build

# Старая версия
docker-compose up -d --build
```

### Остановка

```powershell
# Новая версия
docker compose down

# Старая версия
docker-compose down
```

### Просмотр статуса

```powershell
# Новая версия
docker compose ps

# Старая версия
docker-compose ps
```

### Просмотр логов

```powershell
# Новая версия
docker compose logs -f

# Старая версия
docker-compose logs -f
```

### Перезапуск

```powershell
# Новая версия
docker compose restart

# Старая версия
docker-compose restart
```

### Выполнение команд в контейнере

```powershell
# Новая версия
docker compose exec backend sh

# Старая версия
docker-compose exec backend sh
```

## Решение проблемы "команда не найдена"

Если вы видите ошибку:
```
docker-compose : Имя "docker-compose" не распознано...
```

### Решение 1: Используйте новую команду

```powershell
docker compose up -d --build
```

### Решение 2: Установите Docker Desktop

1. Скачайте [Docker Desktop для Windows](https://www.docker.com/products/docker-desktop/)
2. Установите и перезапустите компьютер
3. Запустите Docker Desktop
4. Попробуйте снова: `docker compose version`

### Решение 3: Установите старую версию docker-compose

Если нужна именно команда `docker-compose`:

```powershell
# Скачайте docker-compose.exe
# Поместите в папку, которая в PATH
# Или используйте через pip:
pip install docker-compose
```

## Рекомендация

Используйте **новую версию** `docker compose` - это официальный способ в современных версиях Docker.
