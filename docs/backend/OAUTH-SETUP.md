# Настройка OAuth авторизации (Google и Yandex)

Это руководство поможет вам настроить авторизацию через Google и Yandex для вашего приложения.

## Шаг 1: Запуск миграции базы данных

Сначала необходимо добавить OAuth поля в таблицу users:

```bash
cd backend
npm run migrate-oauth
```

## Шаг 2: Настройка Google OAuth

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google OAuth API:
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Google+ API" (или "People API") и включите её
   - Также включите "Google Identity Services API"
4. Настройте OAuth consent screen:
   - Перейдите в "APIs & Services" > "OAuth consent screen"
   - Выберите "External" (для тестирования) или "Internal" (для G Suite)
   - Заполните обязательные поля:
     - App name: название вашего приложения
     - User support email: ваш email
     - Developer contact information: ваш email
   - Сохраните и продолжите
5. Создайте OAuth 2.0 Client ID:
   - Перейдите в "APIs & Services" > "Credentials"
   - Нажмите "Create Credentials" > "OAuth client ID"
   - Выберите "Web application"
   - **ВАЖНО:** Добавьте Authorized redirect URIs:
     - Для разработки: `http://localhost:5000/api/auth/google/callback`
     - Для production: `https://bicommunity.ru/api/auth/google/callback`
     - Или используйте ваш домен: `https://yourdomain.com/api/auth/google/callback`
   - Нажмите "Create"
6. **Скопируйте Client ID и Client Secret** - они понадобятся для .env файла

## Шаг 3: Настройка Yandex OAuth

1. Перейдите на [Yandex OAuth](https://oauth.yandex.ru/)
2. Войдите в свой аккаунт Yandex
3. Нажмите "Зарегистрировать новое приложение"
4. Заполните форму:
   - **Название приложения:** название вашего приложения (например, "BI Community")
   - **Описание:** краткое описание (опционально)
   - **Платформы:** выберите "Веб-сервисы"
   - **Redirect URI:** ⚠️ **ОЧЕНЬ ВАЖНО** - укажите точно:
     - Для разработки: `http://localhost:5000/api/auth/yandex/callback`
     - Для production: `https://bicommunity.ru/api/auth/yandex/callback`
     - Или ваш домен: `https://yourdomain.com/api/auth/yandex/callback`
   - **Права доступа:** выберите:
     - ✅ "Доступ к email адресу" (обязательно)
     - ✅ "Доступ к имени, фамилии и портрету" (рекомендуется)
5. Нажмите "Создать приложение"
6. **Скопируйте ID приложения (Client ID) и Пароль (Client Secret)** - они понадобятся для .env файла
   - ID приложения - это ваш `YANDEX_CLIENT_ID`
   - Пароль - это ваш `YANDEX_CLIENT_SECRET`

## Шаг 4: Настройка переменных окружения

**ВАЖНО:** Откройте файл `.env` в корне проекта (не в папке backend) и добавьте следующие переменные:

```env
# Google OAuth
GOOGLE_CLIENT_ID=ваш_google_client_id_здесь
GOOGLE_CLIENT_SECRET=ваш_google_client_secret_здесь
GOOGLE_CALLBACK_URL=https://bicommunity.ru/api/auth/google/callback

# Yandex OAuth
YANDEX_CLIENT_ID=ваш_yandex_client_id_здесь
YANDEX_CLIENT_SECRET=ваш_yandex_client_secret_здесь
YANDEX_CALLBACK_URL=https://bicommunity.ru/api/auth/yandex/callback
```

**Для разработки (localhost):**
```env
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
YANDEX_CALLBACK_URL=http://localhost:5000/api/auth/yandex/callback
```

**Для production:**
```env
GOOGLE_CALLBACK_URL=https://bicommunity.ru/api/auth/google/callback
YANDEX_CALLBACK_URL=https://bicommunity.ru/api/auth/yandex/callback
```

⚠️ **КРИТИЧЕСКИ ВАЖНО:**
- Callback URL в `.env` должен **ТОЧНО** совпадать с тем, что указан в настройках OAuth приложения
- Не должно быть пробелов в начале или конце значений
- Не используйте кавычки вокруг значений
- После изменения `.env` перезапустите backend: `docker compose restart backend`

## Шаг 5: Перезапуск сервера

После настройки переменных окружения перезапустите backend сервер:

```bash
cd backend
npm run dev
```

## Особенности

- Пользователи, зарегистрированные через OAuth, не требуют пригласительного кода
- Email автоматически подтверждается при регистрации через OAuth
- Если пользователь с таким email уже существует, он будет связан с OAuth аккаунтом
- Пользователи могут использовать как обычную регистрацию, так и OAuth

## Тестирование

1. Откройте страницу регистрации или входа
2. Нажмите на кнопку "Google" или "Yandex"
3. Выполните авторизацию в выбранном сервисе
4. После успешной авторизации вы будете автоматически залогинены

## Устранение неполадок

### Ошибка "redirect_uri_mismatch"
**Причина:** Redirect URI в настройках OAuth не совпадает с URL в `.env`
**Решение:**
1. Проверьте, что redirect URI в Google Cloud Console / Yandex OAuth **ТОЧНО** совпадает с `GOOGLE_CALLBACK_URL` / `YANDEX_CALLBACK_URL` в `.env`
2. Проверьте протокол (http/https) - должен совпадать
3. Проверьте домен - должен совпадать
4. Проверьте путь - должен быть `/api/auth/google/callback` или `/api/auth/yandex/callback`

### Ошибка "invalid_client" или "The OAuth client was not found"
**Причина:** Неверный Client ID или Client Secret
**Решение:**
1. Проверьте, что `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` правильно скопированы из Google Cloud Console
2. Проверьте, что `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET` правильно скопированы из Yandex OAuth
3. Убедитесь, что нет лишних пробелов в начале или конце значений
4. Убедитесь, что переменные добавлены в `.env` в корне проекта
5. Перезапустите backend после изменения `.env`: `docker compose restart backend`

### Ошибка "Неизвестно приложение с таким client_id" (Yandex)
**Причина:** Неверный YANDEX_CLIENT_ID или приложение не создано
**Решение:**
1. Проверьте, что приложение создано на https://oauth.yandex.ru/
2. Убедитесь, что используете правильный ID приложения (не пароль!)
3. Проверьте, что приложение не удалено или не деактивировано
4. Убедитесь, что `YANDEX_CLIENT_ID` в `.env` совпадает с ID приложения в Yandex

### Проверка настроек
Выполните на сервере для проверки:
```bash
# Проверьте, что переменные установлены
docker compose exec backend env | grep -E 'GOOGLE_|YANDEX_'

# Или проверьте логи при попытке OAuth
docker compose logs backend | grep -i oauth
```

### Пользователь не создается
- Проверьте логи backend сервера
- Убедитесь, что миграция OAuth полей выполнена успешно
- Проверьте подключение к базе данных
