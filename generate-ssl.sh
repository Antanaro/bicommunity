#!/bin/bash

# Скрипт для генерации самоподписанного SSL-сертификата
# Для тестирования. В продакшене используйте Let's Encrypt!

SSL_DIR="./nginx/ssl"

# Создаём папку если не существует
mkdir -p "$SSL_DIR"

# Генерируем самоподписанный сертификат
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$SSL_DIR/key.pem" \
  -out "$SSL_DIR/cert.pem" \
  -subj "/C=RU/ST=Moscow/L=Moscow/O=BICommunity/CN=localhost"

echo ""
echo "✅ SSL-сертификат создан!"
echo ""
echo "Файлы:"
echo "  - $SSL_DIR/cert.pem"
echo "  - $SSL_DIR/key.pem"
echo ""
echo "Для активации SSL:"
echo "  1. Переименуйте nginx.ssl.conf в nginx.conf"
echo "     cp nginx.ssl.conf nginx.conf"
echo ""
echo "  2. Перезапустите контейнеры"
echo "     docker compose down"
echo "     docker compose up -d"
echo ""
echo "⚠️  Браузер покажет предупреждение о самоподписанном сертификате."
echo "    Для продакшена используйте Let's Encrypt!"
