# Настройка сброса пароля через email

## Шаг 1: Запуск миграции

Сначала необходимо создать таблицу для токенов сброса пароля:

```bash
cd backend
npm run migrate-password-reset
```

Или вручную:

```bash
cd backend
npx ts-node src/migrations/add-password-reset-tokens.ts
```

## Шаг 2: Настройка переменных окружения

Добавьте следующие переменные в файл `backend/.env`:

### Для Gmail (рекомендуется для начала)

```env
# Email настройки
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ваш_email@gmail.com
SMTP_PASSWORD=ваш_пароль_приложения
SMTP_FROM=ваш_email@gmail.com

# URL фронтенда (для ссылок в письмах)
FRONTEND_URL=http://localhost:3000
```

### Как получить пароль приложения для Gmail:

1. Войдите в ваш аккаунт Google
2. Перейдите в [Настройки безопасности](https://myaccount.google.com/security)
3. Включите двухфакторную аутентификацию (если еще не включена)
4. Перейдите в раздел "Пароли приложений"
5. Создайте новый пароль приложения для "Почта" и "Другое устройство"
6. Скопируйте сгенерированный пароль и используйте его как `SMTP_PASSWORD`

### Для других SMTP серверов:

#### Mailgun:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
SMTP_FROM=noreply@your-domain.com
```

#### SendGrid:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@your-domain.com
```

#### Яндекс.Почта:
```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ваш_email@yandex.ru
SMTP_PASSWORD=ваш_пароль
SMTP_FROM=ваш_email@yandex.ru
```

#### Mail.ru:
```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ваш_email@mail.ru
SMTP_PASSWORD=ваш_пароль
SMTP_FROM=ваш_email@mail.ru
```

## Шаг 3: Режим разработки

Если вы не настроили SMTP, в режиме разработки система будет пытаться использовать тестовый аккаунт Ethereal Email. Для реальной отправки писем необходимо настроить SMTP.

## API Endpoints

### POST /api/auth/forgot-password

Запрос на сброс пароля. Отправляет письмо с токеном на указанный email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Если пользователь с таким email существует, на него будет отправлено письмо с инструкциями по сбросу пароля"
}
```

### POST /api/auth/reset-password

Сброс пароля с использованием токена из письма.

**Request:**
```json
{
  "token": "токен_из_письма",
  "password": "новый_пароль"
}
```

**Response:**
```json
{
  "message": "Пароль успешно изменен. Теперь вы можете войти с новым паролем."
}
```

## Безопасность

- Токены сброса пароля действительны в течение 1 часа
- После использования токен помечается как использованный и больше не может быть использован
- При сбросе пароля все другие активные токены для пользователя также помечаются как использованные
- Для предотвращения перебора email адресов, система всегда возвращает успешный ответ, даже если пользователь не найден

## Тестирование

После настройки SMTP, протестируйте функциональность:

1. Отправьте POST запрос на `/api/auth/forgot-password` с email существующего пользователя
2. Проверьте почту - должно прийти письмо со ссылкой для сброса пароля
3. Используйте токен из ссылки для сброса пароля через `/api/auth/reset-password`
4. Попробуйте войти с новым паролем
