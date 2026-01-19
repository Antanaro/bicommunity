# Multi-stage build для nginx с frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Копируем package.json
COPY frontend/package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код frontend
COPY frontend/ ./

# Собираем приложение для production
RUN npm run build

# Финальный образ nginx
FROM nginx:alpine

# Копируем собранные файлы frontend
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
