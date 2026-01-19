# Backend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json
COPY package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем TypeScript
RUN npm run build

# Production образ
FROM node:18-alpine

WORKDIR /app

# Устанавливаем wget для healthcheck
RUN apk add --no-cache wget

# Копируем package.json для production зависимостей
COPY package.json ./

# Устанавливаем только production зависимости
RUN npm install --only=production

# Копируем собранный код из builder
COPY --from=builder /app/dist ./dist

# Копируем миграции и скрипты
COPY --from=builder /app/src/migrations ./src/migrations
COPY --from=builder /app/src/scripts ./src/scripts

# Устанавливаем PostgreSQL клиент для проверки подключения
RUN apk add --no-cache postgresql-client

# Копируем entrypoint скрипт
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Создаем директорию для загрузок
RUN mkdir -p uploads

# Открываем порт
EXPOSE 5000

# Используем entrypoint для запуска миграций перед стартом
ENTRYPOINT ["./docker-entrypoint.sh"]
