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
3. Включите Google+ API:
   - Перейдите в "APIs & Services" > "Library"
   - Найдите "Google+ API" и включите её
4. Создайте OAuth 2.0 Client ID:
   - Перейдите в "APIs & Services" > "Credentials"
   - Нажмите "Create Credentials" > "OAuth client ID"
   - Выберите "Web application"
   - Добавьте Authorized redirect URIs:
     - Для разработки: `http://localhost:5000/api/auth/google/callback`
     - Для production: `https://yourdomain.com/api/auth/google/callback`
5. Скопируйте Client ID и Client Secret

## Шаг 3: Настройка Yandex OAuth

1. Перейдите на [Yandex OAuth](https://oauth.yandex.ru/)
2. Нажмите "Зарегистрировать новое приложение"
3. Заполните форму:
   - Название приложения: ваше название
   - Платформы: выберите "Веб-сервисы"
   - Redirect URI:
     - Для разработки: `http://localhost:5000/api/auth/yandex/callback`
     - Для production: `https://yourdomain.com/api/auth/yandex/callback`
   - Права доступа: выберите "Доступ к email адресу" и "Доступ к имени, фамилии и портрету"
4. Скопируйте ID приложения и Пароль

## Шаг 4: Настройка переменных окружения

Добавьте следующие переменные в ваш `.env` файл:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Yandex OAuth
YANDEX_CLIENT_ID=your_yandex_client_id
YANDEX_CLIENT_SECRET=your_yandex_client_secret
YANDEX_CALLBACK_URL=http://localhost:5000/api/auth/yandex/callback
```

Для production замените `http://localhost:5000` на ваш production URL.

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
- Убедитесь, что redirect URI в настройках OAuth провайдера точно совпадает с URL в `.env` файле
- Проверьте, что используется правильный протокол (http/https)

### Ошибка "invalid_client"
- Проверьте правильность Client ID и Client Secret в `.env` файле
- Убедитесь, что нет лишних пробелов в значениях

### Пользователь не создается
- Проверьте логи backend сервера
- Убедитесь, что миграция OAuth полей выполнена успешно
- Проверьте подключение к базе данных
