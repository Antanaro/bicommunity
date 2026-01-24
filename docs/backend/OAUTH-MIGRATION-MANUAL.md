# Ручное выполнение миграции OAuth полей

Если автоматическая миграция не работает, выполните SQL вручную.

## Вариант 1: Через Docker контейнер PostgreSQL

```bash
# Подключитесь к PostgreSQL
docker compose exec postgres psql -U postgres -d forum_db

# Затем выполните SQL команды (см. ниже)
```

## Вариант 2: Через psql напрямую

```bash
# Если PostgreSQL установлен локально
psql -U postgres -d forum_db
```

## SQL команды для выполнения

Скопируйте и выполните следующие команды:

```sql
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
```

## Проверка после выполнения

После выполнения SQL проверьте структуру таблицы:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
AND column_name IN ('google_id', 'yandex_id', 'oauth_provider')
ORDER BY column_name;
```

Должны быть видны все три колонки:
- `google_id` (character varying)
- `yandex_id` (character varying)
- `oauth_provider` (character varying)

## Если возникают ошибки

### Ошибка: "column already exists"
Это нормально - колонка уже существует, можно пропустить.

### Ошибка: "permission denied"
Убедитесь, что вы используете пользователя с правами на изменение таблиц (обычно `postgres`).

### Ошибка: "relation users does not exist"
Сначала запустите основную миграцию:
```bash
docker compose exec backend npm run migrate
```

## Быстрое выполнение через файл

Можно выполнить SQL из файла:

```bash
# Скопируйте SQL в файл
cat > /tmp/oauth_migration.sql << 'EOF'
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS yandex_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_yandex_id_unique ON users(yandex_id) WHERE yandex_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_yandex_id ON users(yandex_id) WHERE yandex_id IS NOT NULL;
EOF

# Выполните через Docker
docker compose exec -T postgres psql -U postgres -d forum_db < /tmp/oauth_migration.sql
```

Или скопируйте файл на сервер и выполните:

```bash
# На сервере
docker compose exec -T postgres psql -U postgres -d forum_db < backend/src/migrations/add-oauth-fields.sql
```
