# Быстрый старт: Сброс пароля через email

## Что было добавлено

✅ Функциональность сброса пароля через email
✅ Два новых API endpoint'а
✅ Email сервис с поддержкой различных SMTP провайдеров
✅ Таблица для хранения токенов сброса пароля

## Быстрая настройка (3 шага)

### 1. Установите зависимости

```bash
cd backend
npm install
```

### 2. Запустите миграцию

```bash
npm run migrate-password-reset
```

### 3. Настройте SMTP в `.env`

Добавьте в `backend/.env`:

```env
# Минимальная настройка для Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ваш_email@gmail.com
SMTP_PASSWORD=пароль_приложения_gmail
SMTP_FROM=ваш_email@gmail.com
FRONTEND_URL=http://localhost:3000
```

**Как получить пароль приложения Gmail:**
1. Включите двухфакторную аутентификацию в Google аккаунте
2. Создайте "Пароль приложения" в настройках безопасности
3. Используйте его как `SMTP_PASSWORD`

## Использование API

### Запрос сброса пароля

```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Сброс пароля

```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "токен_из_письма",
  "password": "новый_пароль_минимум_6_символов"
}
```

## Подробная документация

См. `PASSWORD-RESET-SETUP.md` для:
- Настройки других SMTP провайдеров (Mailgun, SendGrid, Яндекс, Mail.ru)
- Детальной информации о безопасности
- Решения проблем

## Важно

- Токены действительны 1 час
- После использования токен становится недействительным
- Для безопасности система всегда возвращает успешный ответ, даже если email не найден
