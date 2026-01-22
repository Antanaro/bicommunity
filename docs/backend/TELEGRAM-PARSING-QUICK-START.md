# Быстрый старт: Парсинг Telegram каналов

## Шаги для настройки на продакшене

### 1. Установка зависимостей

Убедитесь что установлена библиотека `telegram`:

```bash
cd backend
npm install
```

Проверьте что в `package.json` есть:
- `"telegram": "^2.26.22"`
- `"input": "^1.0.1"`

### 2. Получение API credentials

1. Зайдите на https://my.telegram.org
2. Войдите с номером телефона
3. Перейдите в "API development tools"
4. Скопируйте `api_id` и `api_hash`

### 3. Получение Session String

**На локальной машине или на сервере:**

```bash
cd backend
npm run telegram-auth
```

Введите:
- API ID
- API Hash  
- Номер телефона (+7...)
- Код из Telegram

Скопируйте выведенный `TELEGRAM_SESSION_STRING`.

### 4. Настройка .env на сервере

Добавьте в `.env` на продакшене:

```env
TELEGRAM_API_ID=ваш_api_id
TELEGRAM_API_HASH=ваш_api_hash
TELEGRAM_SESSION_STRING=ваша_session_string
```

### 5. Перезапуск сервера

```bash
# Если используете Docker
docker-compose restart backend

# Или если запускаете напрямую
npm run build
npm start
```

### 6. Проверка

Отправьте боту в Telegram:

```
/status
```

Должно показать:
- Bot API: ✅ Работает
- MTProto Client: ✅ Подключен

### 7. Тестирование

Попробуйте спарсить канал:

```
/parse durov 5
```

Это спарсит последние 5 постов из @durov и создаст темы на форуме.

## Команды бота

- `/parse @channel 10` - спарсить канал
- `/stop` - остановить парсинг
- `/status` - статус
- `/help` - справка

## Важно

⚠️ `TELEGRAM_SESSION_STRING` содержит авторизацию — храните в безопасности!

## Подробная документация

См. [TELEGRAM-CHANNEL-PARSING.md](./TELEGRAM-CHANNEL-PARSING.md)
