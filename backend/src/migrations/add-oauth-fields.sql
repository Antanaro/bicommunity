-- Migration: Add OAuth fields to users table
-- Выполните этот SQL вручную, если миграция не работает

-- Добавляем OAuth поля
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS yandex_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20);

-- Делаем password_hash nullable для OAuth пользователей
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Добавляем уникальные индексы для OAuth ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_yandex_id_unique ON users(yandex_id) WHERE yandex_id IS NOT NULL;

-- Добавляем обычные индексы для поиска
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_yandex_id ON users(yandex_id) WHERE yandex_id IS NOT NULL;

-- Проверка: посмотрите структуру таблицы
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'users'
-- AND column_name IN ('google_id', 'yandex_id', 'oauth_provider')
-- ORDER BY column_name;
