# Устранение проблем с OAuth

## Быстрая диагностика

### 1. Проверьте переменные окружения в контейнере

```bash
# Проверьте, что переменные установлены
docker compose exec backend env | grep -E 'GOOGLE_|YANDEX_'
```

Должны быть видны:
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `GOOGLE_CALLBACK_URL=...`
- `YANDEX_CLIENT_ID=...`
- `YANDEX_CLIENT_SECRET=...`
- `YANDEX_CALLBACK_URL=...`

Если переменных нет - они не передаются в контейнер.

### 2. Проверьте логи при попытке OAuth

```bash
# Смотрите логи в реальном времени
docker compose logs -f backend

# Затем попробуйте войти через OAuth и смотрите ошибки
```

### 3. Проверьте .env файл

```bash
# На сервере проверьте .env файл
cat .env | grep -E 'GOOGLE_|YANDEX_'
```

Убедитесь, что:
- Переменные добавлены в `.env` в корне проекта (не в backend/)
- Нет пробелов вокруг знака `=`
- Нет кавычек вокруг значений
- Значения не пустые

## Частые проблемы и решения

### Проблема: Переменные не передаются в контейнер

**Симптом:** `docker compose exec backend env | grep GOOGLE` не показывает переменные

**Решение:**
1. Убедитесь, что переменные добавлены в `.env` в корне проекта
2. Убедитесь, что в `docker-compose.yml` они указаны в секции `environment` для backend
3. Пересоздайте контейнер:
   ```bash
   docker compose down
   docker compose up -d
   ```

### Проблема: "invalid_client" или "The OAuth client was not found"

**Причина:** Неверный Client ID или Client Secret

**Решение:**
1. Проверьте, что значения скопированы правильно из Google Cloud Console / Yandex OAuth
2. Убедитесь, что нет лишних пробелов
3. Проверьте, что используете правильные значения:
   - Для Google: Client ID и Client Secret из OAuth 2.0 Client ID
   - Для Yandex: ID приложения (не пароль!) и Пароль

### Проблема: "redirect_uri_mismatch"

**Причина:** Redirect URI не совпадает

**Решение:**
1. Проверьте Redirect URI в настройках OAuth приложения
2. Проверьте `GOOGLE_CALLBACK_URL` / `YANDEX_CALLBACK_URL` в `.env`
3. Они должны **ТОЧНО** совпадать, включая:
   - Протокол (http/https)
   - Домен
   - Путь

**Пример для production:**
- В Google Cloud Console: `https://bicommunity.ru/api/auth/google/callback`
- В .env: `GOOGLE_CALLBACK_URL=https://bicommunity.ru/api/auth/google/callback`

### Проблема: "Неизвестно приложение с таким client_id" (Yandex)

**Причина:** Неверный YANDEX_CLIENT_ID

**Решение:**
1. Убедитесь, что используете **ID приложения**, а не пароль
2. Проверьте на https://oauth.yandex.ru/ - откройте ваше приложение
3. ID приложения - это длинная строка, обычно начинается с букв/цифр
4. Пароль - это отдельное поле, это `YANDEX_CLIENT_SECRET`

### Проблема: Cookie не сохраняется (state не совпадает)

**Причина:** Проблемы с cookie в Docker

**Решение:**
1. Убедитесь, что CORS настроен правильно в backend
2. Проверьте, что `credentials: true` в CORS настройках
3. Проверьте логи backend при OAuth callback

## Пошаговая проверка настроек

### Шаг 1: Проверка .env файла

```bash
# На сервере
cd ~/bicommunity
cat .env | grep -E 'GOOGLE_|YANDEX_|FRONTEND_URL|BACKEND_URL'
```

Должно быть:
```env
FRONTEND_URL=https://bicommunity.ru
BACKEND_URL=https://bicommunity.ru:5000
GOOGLE_CLIENT_ID=ваш_реальный_id
GOOGLE_CLIENT_SECRET=ваш_реальный_secret
GOOGLE_CALLBACK_URL=https://bicommunity.ru/api/auth/google/callback
YANDEX_CLIENT_ID=ваш_реальный_id
YANDEX_CLIENT_SECRET=ваш_реальный_secret
YANDEX_CALLBACK_URL=https://bicommunity.ru/api/auth/yandex/callback
```

### Шаг 2: Проверка docker-compose.yml

Убедитесь, что в `docker-compose.yml` в секции `backend` > `environment` есть:

```yaml
GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
GOOGLE_CALLBACK_URL: ${GOOGLE_CALLBACK_URL:-}
YANDEX_CLIENT_ID: ${YANDEX_CLIENT_ID:-}
YANDEX_CLIENT_SECRET: ${YANDEX_CLIENT_SECRET:-}
YANDEX_CALLBACK_URL: ${YANDEX_CALLBACK_URL:-}
```

### Шаг 3: Перезапуск контейнеров

```bash
# Остановите контейнеры
docker compose down

# Запустите заново (переменные загрузятся из .env)
docker compose up -d

# Проверьте логи
docker compose logs backend | tail -20
```

### Шаг 4: Проверка переменных в контейнере

```bash
docker compose exec backend env | grep -E 'GOOGLE_|YANDEX_'
```

Если переменных нет - они не загружаются из .env.

### Шаг 5: Тестирование OAuth

1. Откройте сайт: `https://bicommunity.ru/register`
2. Нажмите кнопку "Google" или "Yandex"
3. Смотрите логи в реальном времени:
   ```bash
   docker compose logs -f backend
   ```

## Дополнительная диагностика

### Проверка URL при редиректе

В логах backend при нажатии на кнопку OAuth должно быть видно:
- URL редиректа на Google/Yandex
- Callback URL, который используется

### Проверка callback

После авторизации в Google/Yandex проверьте:
1. На какой URL происходит редирект
2. Есть ли ошибки в логах backend
3. Правильно ли обрабатывается callback

### Тестирование вручную

Можно протестировать OAuth endpoint напрямую:

```bash
# Проверьте, что маршрут доступен
curl -I https://bicommunity.ru/api/auth/google

# Должен быть редирект на Google
```

## Если ничего не помогает

1. Проверьте все логи:
   ```bash
   docker compose logs backend > backend.log
   docker compose logs nginx > nginx.log
   ```

2. Проверьте настройки OAuth приложений:
   - Google: https://console.cloud.google.com/apis/credentials
   - Yandex: https://oauth.yandex.ru/

3. Убедитесь, что домен правильно настроен и доступен

4. Проверьте файрвол - порты 80 и 443 должны быть открыты
