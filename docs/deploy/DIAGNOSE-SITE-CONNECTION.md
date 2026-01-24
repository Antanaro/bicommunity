# Диагностика проблемы "Сайт отклоняет соединение"

Если сайт `bicommunity.ru` отклоняет соединение, выполните следующие шаги диагностики:

## Шаг 1: Проверьте статус контейнеров

```bash
docker compose ps
```

Все контейнеры должны быть в статусе `Up`:
- `forum_postgres` - база данных
- `forum_backend` - API сервер
- `forum_nginx` - веб-сервер

Если какой-то контейнер не запущен, проверьте логи:
```bash
docker compose logs nginx
docker compose logs backend
docker compose logs postgres
```

## Шаг 2: Проверьте, какой конфиг nginx используется

В `docker-compose.yml` проверьте, какой файл конфигурации монтируется:
```yaml
volumes:
  - ./nginx.conf:/etc/nginx/nginx.conf:ro
```

Если у вас настроен SSL, должен использоваться `nginx.ssl.conf`:
```yaml
volumes:
  - ./nginx.ssl.conf:/etc/nginx/nginx.conf:ro
```

## Шаг 3: Проверьте SSL сертификаты

Если используется HTTPS, проверьте наличие сертификатов:

```bash
# Проверьте наличие файлов
ls -la nginx/ssl/

# Должны быть:
# - cert.pem (сертификат)
# - key.pem (приватный ключ)
```

Если сертификаты отсутствуют, nginx не запустится с HTTPS конфигурацией.

## Шаг 4: Проверьте логи nginx

```bash
# Логи nginx контейнера
docker compose logs nginx

# Или внутри контейнера
docker compose exec nginx cat /var/log/nginx/error.log
```

Ищите ошибки типа:
- `SSL certificate not found`
- `bind() to 0.0.0.0:443 failed`
- `bind() to 0.0.0.0:80 failed`

## Шаг 5: Проверьте порты

```bash
# Проверьте, какие порты слушают
sudo netstat -tulpn | grep -E ':(80|443)'

# Или
sudo ss -tulpn | grep -E ':(80|443)'
```

Порты 80 и 443 должны быть заняты контейнером nginx.

## Шаг 6: Проверьте файрвол

```bash
# Проверьте правила файрвола
sudo ufw status
# или
sudo iptables -L -n

# Убедитесь, что порты 80 и 443 открыты
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Шаг 7: Проверьте DNS

```bash
# Проверьте, что домен указывает на правильный IP
nslookup bicommunity.ru
# или
dig bicommunity.ru

# Проверьте A-запись домена
```

## Быстрое решение: Временное отключение HTTPS

Если проблема в SSL, временно используйте HTTP конфигурацию:

1. В `docker-compose.yml` измените:
```yaml
volumes:
  - ./nginx.conf:/etc/nginx/nginx.conf:ro  # Используйте HTTP конфиг
```

2. Перезапустите nginx:
```bash
docker compose restart nginx
```

3. Проверьте доступность по HTTP: `http://bicommunity.ru`

## Решение для HTTPS

Если нужно использовать HTTPS:

1. **Получите SSL сертификаты** (например, через Let's Encrypt):
```bash
# Установите certbot
sudo apt install certbot

# Получите сертификат
sudo certbot certonly --standalone -d bicommunity.ru -d www.bicommunity.ru
```

2. **Скопируйте сертификаты в nginx/ssl/**:
```bash
sudo cp /etc/letsencrypt/live/bicommunity.ru/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/bicommunity.ru/privkey.pem nginx/ssl/key.pem
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem
```

3. **Используйте SSL конфиг**:
```yaml
volumes:
  - ./nginx.ssl.conf:/etc/nginx/nginx.conf:ro
```

4. **Перезапустите nginx**:
```bash
docker compose restart nginx
```

## Проверка доступности

После исправления проверьте:

```bash
# HTTP
curl -I http://bicommunity.ru

# HTTPS
curl -I https://bicommunity.ru

# Health check
curl http://bicommunity.ru/health
```

## Частые проблемы

### Проблема: "Connection refused"
**Причина:** Контейнеры не запущены или порты не открыты
**Решение:** 
```bash
docker compose up -d
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### Проблема: "SSL certificate error"
**Причина:** Отсутствуют или неправильные SSL сертификаты
**Решение:** См. раздел "Решение для HTTPS" выше

### Проблема: "502 Bad Gateway"
**Причина:** Backend не запущен или недоступен
**Решение:**
```bash
docker compose logs backend
docker compose restart backend
```

### Проблема: "DNS не резолвится"
**Причина:** DNS записи не настроены
**Решение:** Настройте A-запись домена на IP сервера
