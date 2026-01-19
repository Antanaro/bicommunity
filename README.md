# Профессиональный форум

Простой форум для общения на профессиональные темы с коллегами.

## Технологии

### Backend
- Node.js + Express.js
- PostgreSQL
- JWT для аутентификации
- TypeScript
- bcryptjs для хеширования паролей
- express-validator для валидации

### Frontend
- React + TypeScript
- React Router для навигации
- Axios для HTTP запросов
- Tailwind CSS для стилизации
- Vite как сборщик

## Требования

- Node.js (версия 18 или выше)
- PostgreSQL (версия 12 или выше)
- npm или yarn

## Установка

### 1. Установите все зависимости

```bash
npm run install:all
```

Или вручную:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Настройте базу данных PostgreSQL

Создайте базу данных:
```sql
CREATE DATABASE forum_db;
```

### 3. Настройте переменные окружения

Создайте файл `backend/.env` на основе `backend/env.production.example`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forum_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

**Важно:** Измените `JWT_SECRET` на случайную строку для безопасности!

### 4. Запустите миграции базы данных

```bash
cd backend
npm run migrate
```

Это создаст все необходимые таблицы в базе данных.

### 5. Запустите проект

В корневой папке проекта:

```bash
npm run dev
```

Это запустит одновременно backend и frontend.

Или запустите отдельно:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Доступ к приложению

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health check:** http://localhost:5000/api/health

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход

### Категории
- `GET /api/categories` - Получить все категории
- `GET /api/categories/:id` - Получить категорию
- `POST /api/categories` - Создать категорию (требуется admin)
- `PUT /api/categories/:id` - Обновить категорию (требуется admin)
- `DELETE /api/categories/:id` - Удалить категорию (требуется admin)

### Темы
- `GET /api/topics` - Получить все темы (опционально `?category_id=1`)
- `GET /api/topics/:id` - Получить тему с сообщениями
- `POST /api/topics` - Создать тему (требуется авторизация)
- `PUT /api/topics/:id` - Обновить тему (автор или admin)
- `DELETE /api/topics/:id` - Удалить тему (автор или admin)

### Сообщения
- `GET /api/posts/topic/:topicId` - Получить сообщения темы
- `POST /api/posts` - Создать сообщение (требуется авторизация)
- `PUT /api/posts/:id` - Обновить сообщение (автор или admin)
- `DELETE /api/posts/:id` - Удалить сообщение (автор или admin)
- `POST /api/posts/:id/like` - Лайкнуть/убрать лайк (требуется авторизация)

## Структура проекта

```
.
├── backend/               # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── config/        # Конфигурация БД
│   │   ├── middleware/    # Middleware (auth)
│   │   ├── migrations/    # Миграции БД
│   │   ├── routes/        # API роуты
│   │   ├── scripts/       # Утилиты (seed, check-db)
│   │   ├── services/      # Сервисы (email, telegram)
│   │   └── index.ts       # Точка входа
│   ├── package.json
│   └── tsconfig.json
├── frontend/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── contexts/      # React контексты (Auth)
│   │   ├── pages/         # Страницы приложения
│   │   ├── services/      # API сервисы
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── docs/                  # Документация
│   ├── backend/           # Инструкции по backend
│   └── deploy/            # Инструкции по деплою
├── nginx/                 # Конфигурация Nginx
├── docker-compose.yml     # Docker конфигурация
├── package.json
└── README.md
```

## Создание первого администратора

Для создания администратора можно использовать SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
```

Или зарегистрируйте пользователя через API и затем обновите роль в БД.

## Разработка

### Backend
- Используется TypeScript
- Hot reload через nodemon
- Структура: routes → middleware → database

### Frontend
- React с TypeScript
- Hot reload через Vite
- Tailwind CSS для стилей
- React Router для маршрутизации

## Документация

Вся дополнительная документация находится в папке `docs/`:

- **[docs/QUICK-START.md](docs/QUICK-START.md)** - Быстрый старт
- **[docs/backend/](docs/backend/)** - Инструкции по настройке backend
- **[docs/deploy/](docs/deploy/)** - Инструкции по развертыванию (Docker, VM)

## Деплой на сервер

### Быстрый деплой с GitHub

```bash
# На сервере (Ubuntu/Debian)

# 1. Установите Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Перелогиньтесь

# 2. Клонируйте проект
git clone https://github.com/antanaro/bicommunity.git
cd bicommunity

# 3. Настройте окружение
cp env.template .env
nano .env  # Измените DB_PASSWORD, JWT_SECRET, FRONTEND_URL

# 4. Запустите
docker compose up -d --build
```

Подробнее: [docs/deploy/DEPLOY-FROM-GITHUB.md](docs/deploy/DEPLOY-FROM-GITHUB.md)

### Обновление на сервере

```bash
cd bicommunity
git pull
docker compose up -d --build
```

## Локальный Docker

Для локального запуска через Docker:

```bash
# Скопируйте пример конфигурации
cp env.template .env

# Отредактируйте .env файл

# Запустите контейнеры
docker compose up -d --build
```

Подробнее: [docs/deploy/DOCKER-SETUP.md](docs/deploy/DOCKER-SETUP.md)

## Лицензия

MIT
