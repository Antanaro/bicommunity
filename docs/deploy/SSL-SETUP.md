# Настройка SSL-сертификата

## Способ 1: Let's Encrypt (бесплатный, рекомендуется)

### Требования
- Доменное имя, направленное на IP вашего сервера
- Открытые порты 80 и 443

### Шаг 1: Установите Certbot на сервере

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### Шаг 2: Остановите nginx (если запущен)

```bash
docker compose down
```

### Шаг 3: Получите сертификат

```bash
sudo certbot certonly --standalone -d bicommunity.ru -d www.bicommunity.ru
```

Сертификаты будут сохранены в:
- `/etc/letsencrypt/live/bicommunity.ru/fullchain.pem`
- `/etc/letsencrypt/live/bicommunity.ru/privkey.pem`

### Шаг 4: Скопируйте сертификаты в папку проекта

```bash
# Создайте папку для SSL
mkdir -p nginx/ssl

# Скопируйте сертификаты
sudo cp /etc/letsencrypt/live/bicommunity.ru/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/bicommunity.ru/privkey.pem nginx/ssl/key.pem

# Установите права
sudo chmod 644 nginx/ssl/cert.pem
sudo chmod 600 nginx/ssl/key.pem
```

### Шаг 5: Обновите nginx.conf

Раскомментируйте HTTPS секцию в `nginx.conf` и замените `your-domain.com` на ваш домен.

### Шаг 6: Запустите проект

```bash
docker compose up -d
```

### Автообновление сертификата

Добавьте в crontab:

```bash
sudo crontab -e
```

Добавьте строку:
```
0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/bicommunity.ru/fullchain.pem /root/bicommunity/nginx/ssl/cert.pem && cp /etc/letsencrypt/live/bicommunity.ru/privkey.pem /root/bicommunity/nginx/ssl/key.pem && docker compose -f /root/bicommunity/docker-compose.yml restart nginx
```

---

## Способ 2: Самоподписанный сертификат (для тестирования)

⚠️ Браузеры будут показывать предупреждение о небезопасном соединении.

### Создайте самоподписанный сертификат

```bash
# Создайте папку
mkdir -p nginx/ssl

# Сгенерируйте сертификат (действует 365 дней)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=BICommunity/CN=localhost"
```

---

## После получения сертификата

### Обновите nginx.conf

Замените содержимое `nginx.conf` или раскомментируйте HTTPS секцию:

```nginx
# HTTP - редирект на HTTPS
server {
    listen 80;
    server_name bicommunity.ru www.bicommunity.ru;
    return 301 https://$host$request_uri;
}

# HTTPS сервер
server {
    listen 443 ssl http2;
    server_name bicommunity.ru www.bicommunity.ru;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # ... остальные location блоки ...
}
```

### Обновите .env

```bash
FRONTEND_URL=https://bicommunity.ru
```

### Перезапустите контейнеры

```bash
docker compose down
docker compose up -d
```

---

## Проверка SSL

```bash
# Проверьте, что порт 443 открыт
curl -I https://bicommunity.ru

# Проверьте сертификат
openssl s_client -connect bicommunity.ru:443 -servername bicommunity.ru
```

---

## Устранение проблем

### "Certificate not trusted"
- Используйте Let's Encrypt вместо самоподписанного
- Убедитесь, что скопирован fullchain.pem (включает промежуточные сертификаты)

### "Connection refused on port 443"
- Проверьте, что порт 443 открыт в firewall
- Проверьте docker-compose.yml: `"443:443"` в секции ports

### Сертификат не обновляется
- Проверьте права доступа к папке ssl
- Убедитесь, что certbot может записать новые файлы
