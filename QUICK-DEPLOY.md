# Быстрое развертывание на bicommunity.ru

## Краткая инструкция

### 1. Подготовка на локальной машине

```bash
# Сборка frontend
cd frontend
npm install
npm run build

# Сборка backend
cd ../backend
npm install
npm run build
```

### 2. На сервере bicommunity.ru

#### 2.1. Загрузите файлы:
- `backend/dist/` → `/path/to/project/backend/dist/`
- `backend/node_modules/` → `/path/to/project/backend/node_modules/`
- `backend/package.json` → `/path/to/project/backend/package.json`
- `frontend/dist/` → `/path/to/project/frontend/dist/`

#### 2.2. Создайте `.env` в `backend/`:
```bash
cp env.production.example .env
nano .env  # Заполните все значения
```

#### 2.3. Настройте базу данных:
```bash
# Создайте БД
createdb forum_db

# Запустите миграции
cd backend
npm run migrate
```

#### 2.4. Запустите backend:
```bash
# Установите PM2 (если еще не установлен)
npm install -g pm2

# Запустите backend
pm2 start dist/index.js --name forum-backend
pm2 save
pm2 startup
```

#### 2.5. Настройте Nginx (см. DEPLOY-BICOMMUNITY.md)

### 3. Проверка

```bash
# Проверьте backend
curl http://localhost:5000/api/health

# Проверьте в браузере
# https://bicommunity.ru
```

## Подробная инструкция

См. файл `DEPLOY-BICOMMUNITY.md` для полной инструкции.
