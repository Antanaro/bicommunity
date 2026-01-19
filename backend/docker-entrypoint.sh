#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - executing migrations..."

# Запускаем основные миграции
npm run migrate || echo "Migration failed or already executed"

# Запускаем дополнительные миграции (если нужно)
# npm run migrate-email-verification || echo "Email verification migration skipped"
# npm run migrate-password-reset || echo "Password reset migration skipped"
# npm run migrate-reaction-type || echo "Reaction type migration skipped"

echo "Starting application..."
exec node dist/index.js
