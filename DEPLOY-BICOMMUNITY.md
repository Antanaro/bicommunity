# Развертывание на bicommunity.ru

Инструкция по развертыванию форума на хостинге bicommunity.ru.

## Предварительные требования

1. **Доступ к серверу bicommunity.ru** (SSH, FTP, или панель управления)
2. **Node.js** (версия 18+) установлен на сервере
3. **PostgreSQL** установлен и настроен на сервере
4. **PM2** или другой процесс-менеджер для Node.js (рекомендуется)
5. **Nginx** или Apache для проксирования (рекомендуется)

## Варианты развертывания

### Вариант 1: Backend и Frontend на одном домене (рекомендуется)

В этом случае:
- Frontend: `https://bicommunity.ru`
- Backend API: `https://bicommunity.ru/api`

### Вариант 2: Backend и Frontend на разных поддоменах

- Frontend: `https://bicommunity.ru`
- Backend API: `https://api.bicommunity.ru`

## Шаги развертывания

### 1. Подготовка проекта

#### 1.1. Сборка Frontend

```bash
cd frontend
npm install
npm run build
```

Собранные файлы будут в папке `frontend/dist/`

#### 1.2. Сборка Backend

```bash
cd backend
npm install
npm run build
```

Скомпилированный код будет в папке `backend/dist/`

### 2. Загрузка файлов на сервер

Загрузите на сервер следующие папки/файлы:

```
backend/
  ├── dist/              # Скомпилированный код
  ├── node_modules/      # Зависимости
  ├── package.json
  └── .env               # Файл с переменными окружения (создайте на сервере)

frontend/
  └── dist/              # Собранный frontend
```

### 3. Настройка Backend

#### 3.1. Создайте файл `.env` на сервере в папке `backend/`

```env
# Порт для backend (может быть другой, если используете прокси)
PORT=5000

# Настройки базы данных PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forum_db
DB_USER=your_db_user
DB_PASSWORD=your_secure_password

# JWT секрет (ОБЯЗАТЕЛЬНО измените на случайную строку!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# URL для фронтенда (для CORS)
FRONTEND_URL=https://bicommunity.ru

# Настройки SMTP для отправки email (если используется)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
SMTP_FROM=noreply@bicommunity.ru
```

#### 3.2. Настройка базы данных

1. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE forum_db;
```

2. Запустите миграции:
```bash
cd backend
npm run migrate
```

### 4. Настройка Frontend для Production

#### 4.1. Обновите `frontend/src/services/api.ts`

Для варианта 1 (один домен):
```typescript
export const api = axios.create({
  baseURL: '/api',  // Относительный путь - будет работать через прокси
  headers: {
    'Content-Type': 'application/json',
  },
});
```

Для варианта 2 (разные поддомены):
```typescript
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.bicommunity.ru/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

И создайте файл `frontend/.env.production`:
```env
VITE_API_URL=https://api.bicommunity.ru/api
```

### 5. Настройка Nginx (рекомендуется)

Создайте конфигурацию Nginx `/etc/nginx/sites-available/bicommunity.ru`:

#### Для варианта 1 (один домен):

```nginx
server {
    listen 80;
    server_name bicommunity.ru www.bicommunity.ru;
    
    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bicommunity.ru www.bicommunity.ru;

    # SSL сертификаты (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/bicommunity.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bicommunity.ru/privkey.pem;

    # Корневая директория для frontend
    root /path/to/your/project/frontend/dist;
    index index.html;

    # Проксирование API запросов на backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Статические файлы frontend
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кэширование статических ресурсов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Для варианта 2 (разные поддомены):

**Для frontend (bicommunity.ru):**
```nginx
server {
    listen 443 ssl http2;
    server_name bicommunity.ru www.bicommunity.ru;

    ssl_certificate /etc/letsencrypt/live/bicommunity.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bicommunity.ru/privkey.pem;

    root /path/to/your/project/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Для backend (api.bicommunity.ru):**
```nginx
server {
    listen 443 ssl http2;
    server_name api.bicommunity.ru;

    ssl_certificate /etc/letsencrypt/live/api.bicommunity.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bicommunity.ru/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/bicommunity.ru /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Запуск Backend с PM2

Установите PM2:
```bash
npm install -g pm2
```

Запустите backend:
```bash
cd backend
pm2 start dist/index.js --name forum-backend
pm2 save
pm2 startup  # Для автозапуска при перезагрузке сервера
```

Проверьте статус:
```bash
pm2 status
pm2 logs forum-backend
```

### 7. Обновление CORS в Backend

Убедитесь, что в `backend/src/index.ts` настроен CORS для production:

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://bicommunity.ru',
  credentials: true,
};

app.use(cors(corsOptions));
```

### 8. Настройка SSL сертификата (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d bicommunity.ru -d www.bicommunity.ru
```

Для API поддомена:
```bash
sudo certbot --nginx -d api.bicommunity.ru
```

### 9. Проверка работы

1. **Проверьте backend:**
   ```bash
   curl https://bicommunity.ru/api/health
   # или
   curl https://api.bicommunity.ru/api/health
   ```

2. **Откройте в браузере:**
   - https://bicommunity.ru

3. **Проверьте логи:**
   ```bash
   pm2 logs forum-backend
   ```

## Обновление проекта

При обновлении кода:

1. Загрузите новые файлы на сервер
2. Пересоберите проект:
   ```bash
   cd frontend && npm run build
   cd ../backend && npm run build
   ```
3. Перезапустите backend:
   ```bash
   pm2 restart forum-backend
   ```

## Резервное копирование

Настройте регулярное резервное копирование базы данных:

```bash
# Создайте скрипт backup.sh
#!/bin/bash
pg_dump -U your_db_user forum_db > /backups/forum_db_$(date +%Y%m%d_%H%M%S).sql
```

Добавьте в crontab:
```bash
0 2 * * * /path/to/backup.sh
```

## Безопасность

1. ✅ Используйте сильный `JWT_SECRET`
2. ✅ Используйте HTTPS
3. ✅ Настройте firewall (откройте только 80, 443)
4. ✅ Регулярно обновляйте зависимости
5. ✅ Настройте резервное копирование БД
6. ✅ Используйте переменные окружения для секретов

## Troubleshooting

### Backend не запускается
- Проверьте логи: `pm2 logs forum-backend`
- Проверьте `.env` файл
- Проверьте подключение к БД

### CORS ошибки
- Убедитесь, что `FRONTEND_URL` в `.env` правильный
- Проверьте настройки CORS в `backend/src/index.ts`

### 404 на frontend
- Убедитесь, что `try_files` настроен в Nginx
- Проверьте путь к `dist` папке

### API не работает
- Проверьте, что backend запущен: `pm2 status`
- Проверьте прокси в Nginx
- Проверьте логи Nginx: `sudo tail -f /var/log/nginx/error.log`

## Поддержка

При возникновении проблем проверьте:
1. Логи PM2: `pm2 logs forum-backend`
2. Логи Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Статус сервисов: `pm2 status`, `sudo systemctl status nginx`
