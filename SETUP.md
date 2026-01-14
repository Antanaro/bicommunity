# Инструкция по первому запуску

## Шаг 1: Установка зависимостей

```bash
npm run install:all
```

## Шаг 2: Настройка PostgreSQL

1. Установите PostgreSQL, если еще не установлен
2. Создайте базу данных:
   ```sql
   CREATE DATABASE forum_db;
   ```

## Шаг 3: Настройка переменных окружения

Создайте файл `backend/.env` со следующим содержимым:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forum_db
DB_USER=postgres
DB_PASSWORD=ваш_пароль
JWT_SECRET=случайная_строка_для_безопасности_минимум_32_символа

# Настройки для сброса пароля через email (опционально)
# Подробнее см. backend/PASSWORD-RESET-SETUP.md
FRONTEND_URL=http://localhost:3000
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=ваш_email@gmail.com
# SMTP_PASSWORD=ваш_пароль_приложения
# SMTP_FROM=ваш_email@gmail.com
```

**Важно:** 
- Замените `DB_PASSWORD` на ваш пароль от PostgreSQL
- Замените `JWT_SECRET` на случайную строку (можно сгенерировать командой: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

## Шаг 4: Проверка подключения к базе данных (опционально)

Перед запуском миграций можно проверить подключение:

```bash
cd backend
npm run check-db
```

Этот скрипт проверит:
- Подключение к PostgreSQL
- Существование базы данных `forum_db`

## Шаг 5: Запуск миграций

```bash
cd backend
npm run migrate
```

Вы должны увидеть сообщение: `✅ Database tables created successfully`

### Дополнительная миграция для сброса пароля

Для использования функции сброса пароля через email, запустите дополнительную миграцию:

```bash
cd backend
npm run migrate-password-reset
```

**Примечание:** Для работы сброса пароля необходимо настроить SMTP сервер. Подробные инструкции см. в файле `backend/PASSWORD-RESET-SETUP.md`

## Шаг 6: Запуск приложения

В корневой папке проекта:

```bash
npm run dev
```

Или запустите отдельно:

**Терминал 1 (Backend):**
```bash
cd backend
npm run dev
```

**Терминал 2 (Frontend):**
```bash
cd frontend
npm run dev
```

## Шаг 7: Откройте браузер

Перейдите на http://localhost:3000

## Создание первого пользователя

1. Зарегистрируйтесь через форму регистрации
2. Чтобы сделать пользователя администратором, выполните SQL:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'ваш_email';
   ```

## Создание первой категории

После того как вы стали администратором, категории можно создавать через API:

```bash
curl -X POST http://localhost:5000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ваш_jwt_токен" \
  -d '{"name": "Общие обсуждения", "description": "Общие темы для общения"}'
```

Или используйте Postman/Insomnia для отправки запросов.

## Возможные проблемы

### Ошибка подключения к БД: "Connection refused: connect"

Эта ошибка означает, что приложение не может подключиться к PostgreSQL на `localhost:5432`. 

#### Шаг 1: Проверьте, запущен ли PostgreSQL

**В Windows (PowerShell):**
```powershell
# Проверка статуса службы PostgreSQL
Get-Service -Name postgresql*

# Или проверка процессов
Get-Process -Name postgres -ErrorAction SilentlyContinue
```

**Если служба не запущена, запустите её:**
```powershell
# Запуск службы PostgreSQL (замените X на версию, например postgresql-x64-15)
Start-Service -Name postgresql-x64-15

# Или через Services (services.msc)
# Найдите "postgresql-x64-XX" и запустите службу
```

**Альтернативный способ:**
1. Нажмите `Win + R`, введите `services.msc` и нажмите Enter
2. Найдите службу PostgreSQL (обычно называется `postgresql-x64-XX` или `PostgreSQL`)
3. Если статус "Остановлена", нажмите правой кнопкой → "Запустить"

#### Шаг 2: Проверьте, слушает ли PostgreSQL на порту 5432

**В PowerShell:**
```powershell
# Проверка, занят ли порт 5432
netstat -an | Select-String "5432"
```

Если порт не отображается, PostgreSQL может быть настроен на другой порт или не принимать TCP/IP подключения.

#### Шаг 3: Проверьте конфигурацию PostgreSQL

Найдите файл `postgresql.conf` (обычно находится в `C:\Program Files\PostgreSQL\XX\data\`):

1. Откройте файл `postgresql.conf`
2. Убедитесь, что раскомментирована строка:
   ```
   listen_addresses = 'localhost'
   ```
   или
   ```
   listen_addresses = '*'
   ```

3. Найдите файл `pg_hba.conf` в той же папке
4. Убедитесь, что есть строка для локальных подключений:
   ```
   host    all             all             127.0.0.1/32            md5
   ```
   или
   ```
   host    all             all             ::1/128                 md5
   ```

5. После изменения конфигурации **перезапустите службу PostgreSQL**:
   ```powershell
   Restart-Service -Name postgresql-x64-15
   ```

#### Шаг 4: Проверьте файл .env

Убедитесь, что файл `backend/.env` существует и содержит правильные данные:
- `DB_HOST=localhost`
- `DB_PORT=5432`
- `DB_USER=postgres`
- `DB_PASSWORD=ваш_реальный_пароль`

#### Шаг 5: Проверьте подключение вручную

Попробуйте подключиться через `psql`:
```powershell
psql -U postgres -h localhost -p 5432
```

Если подключение успешно, значит проблема в настройках приложения. Если нет - проблема в конфигурации PostgreSQL.

#### Шаг 6: Проверьте файрвол

Убедитесь, что Windows Firewall не блокирует PostgreSQL:
1. Откройте "Брандмауэр Защитника Windows"
2. Проверьте правила для PostgreSQL
3. При необходимости добавьте исключение для порта 5432

#### Быстрая диагностика

Запустите скрипт проверки подключения:
```powershell
cd backend
npm run check-db
```

Этот скрипт покажет детальную информацию об ошибке подключения.

### Другие проблемы

- Проверьте правильность данных в `backend/.env`
- Убедитесь, что база данных `forum_db` создана

### Порт уже занят
- Измените `PORT` в `backend/.env` (для backend)
- Измените `port` в `frontend/vite.config.ts` (для frontend)

### Ошибки при установке зависимостей
- Убедитесь, что используете Node.js версии 18 или выше
- Попробуйте удалить `node_modules` и установить заново:
  ```bash
  rm -rf node_modules backend/node_modules frontend/node_modules
  npm run install:all
  ```
