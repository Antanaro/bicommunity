# Frontend Dockerfile - только для сборки
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение для production
RUN npm run build

# Финальный образ - копируем dist в volume
FROM alpine:latest
RUN apk add --no-cache rsync
COPY --from=builder /app/dist /dist
WORKDIR /
CMD ["sh", "-c", "rsync -av /dist/ /output/ || cp -r /dist/* /output/ 2>/dev/null || true"]
