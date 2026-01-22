# Добавление SMTP настроек в .env

## Шаг 3: Настройка SMTP

Откройте файл `.env` в корне проекта и добавьте в конец файла следующие строки:

### Для Gmail (рекомендуется):

```env
# Email настройки для сброса пароля
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ваш_email@gmail.com
SMTP_PASSWORD=ваш_пароль_приложения_gmail
SMTP_FROM=ваш_email@gmail.com
FRONTEND_URL=http://localhost:3000
```

### Как получить пароль приложения Gmail:

1. Откройте [Google Account Security](https://myaccount.google.com/security)
2. Включите **Двухэтапную аутентификацию** (если еще не включена)
3. Прокрутите вниз до раздела **Пароли приложений**
4. Выберите:
   - Приложение: **Почта**
   - Устройство: **Другое устройство** (введите "Forum")
5. Нажмите **Создать**
6. Скопируйте 16-значный пароль (например: `abcd efgh ijkl mnop`)
7. Используйте его как `SMTP_PASSWORD` (можно без пробелов)

**⚠️ ВАЖНО:** Не используйте обычный пароль от Gmail! Только пароль приложения.

### Пример заполненного .env:

```env
PORT=5000
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=forum_db
DB_USER=postgres
DB_PASSWORD=rootroot
JWT_SECRET=ad4ef5e79b63c6e2eda814ff0e508782640adce41a63e7f9bfc0173347f9fcc6

# Email настройки для сброса пароля
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=example@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
SMTP_FROM=example@gmail.com
FRONTEND_URL=http://localhost:3000
```

### Альтернативные провайдеры:

#### Яндекс.Почта:
```env
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ваш_email@yandex.ru
SMTP_PASSWORD=ваш_пароль
SMTP_FROM=ваш_email@yandex.ru
FRONTEND_URL=http://localhost:3000
```

#### Mail.ru:
```env
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=ваш_email@mail.ru
SMTP_PASSWORD=ваш_пароль
SMTP_FROM=ваш_email@mail.ru
FRONTEND_URL=http://localhost:3000
```

## После настройки:

1. Сохраните файл `.env`
2. Перезапустите backend сервер
3. Протестируйте отправку письма

## Проверка:

После настройки и перезапуска сервера, попробуйте отправить запрос на сброс пароля. Если все настроено правильно, письмо должно прийти на указанный email.
