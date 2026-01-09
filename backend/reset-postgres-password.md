# Инструкция по сбросу пароля PostgreSQL

Если вы забыли пароль пользователя `postgres`, выполните следующие шаги:

## Шаг 1: Остановите службу PostgreSQL

В PowerShell (от имени администратора):
```powershell
Stop-Service -Name postgresql-x64-15
```
(Замените `15` на вашу версию PostgreSQL)

Или через Services:
1. Нажмите `Win + R`, введите `services.msc`
2. Найдите службу PostgreSQL
3. Остановите её

## Шаг 2: Найдите файл pg_hba.conf

Обычно находится в:
```
C:\Program Files\PostgreSQL\15\data\pg_hba.conf
```
(Замените `15` на вашу версию)

## Шаг 3: Измените метод аутентификации

Откройте файл `pg_hba.conf` в текстовом редакторе (от имени администратора).

Найдите строки:
```
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

Измените `md5` на `trust`:
```
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
```

Сохраните файл.

## Шаг 4: Запустите службу PostgreSQL

```powershell
Start-Service -Name postgresql-x64-15
```

## Шаг 5: Подключитесь и измените пароль

```powershell
psql -U postgres
```

Теперь подключение должно быть без пароля. Выполните:
```sql
ALTER USER postgres WITH PASSWORD 'новый_пароль';
\q
```

## Шаг 6: Верните md5 в pg_hba.conf

Верните `md5` вместо `trust` в файле `pg_hba.conf`:
```
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

## Шаг 7: Перезапустите службу

```powershell
Restart-Service -Name postgresql-x64-15
```

## Шаг 8: Обновите .env

Откройте `backend/.env` и установите новый пароль:
```
DB_PASSWORD=новый_пароль
```

## Готово!

Теперь можно запускать миграции:
```bash
cd backend
npm run migrate
```
