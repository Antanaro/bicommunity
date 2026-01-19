# Быстрый деплой bicommunity с GitHub

## Минимальные команды для деплоя

Выполните эти команды на вашем сервере:

```bash
# 1. Установка Docker (если не установлен)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit  # Перелогиньтесь

# 2. После повторного входа - клонирование проекта
git clone https://github.com/antanaro/bicommunity.git
cd bicommunity

# 3. Настройка
cp env.template .env
nano .env  # Измените DB_PASSWORD, JWT_SECRET, FRONTEND_URL

# 4. Запуск
docker compose up -d --build

# 5. Проверка
curl http://localhost/api/health
```

## Что изменить в .env

```env
DB_PASSWORD=надежный_пароль_базы_данных
JWT_SECRET=сгенерируйте_командой_openssl_rand_-hex_32
FRONTEND_URL=https://ваш-домен.ru
BACKEND_URL=https://ваш-домен.ru
```

## Обновление

```bash
cd bicommunity
git pull
docker compose up -d --build
```

## Подробная инструкция

См. [DEPLOY-FROM-GITHUB.md](./DEPLOY-FROM-GITHUB.md)
