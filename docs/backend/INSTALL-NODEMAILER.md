# Установка nodemailer

## Проблема

Ошибка: `Cannot find module 'nodemailer'`

Это происходит потому, что пакет `nodemailer` добавлен в `package.json`, но не установлен в `node_modules`.

## Решение

### Вариант 1: Через командную строку

Откройте терминал в папке `backend` и выполните:

```bash
npm install
```

### Вариант 2: Через bat-файл

Дважды кликните на:
```
backend\install-dependencies.bat
```

### Вариант 3: Установка только nodemailer

Если хотите установить только nodemailer:

```bash
cd backend
npm install nodemailer @types/nodemailer
```

## После установки

После установки зависимостей:

1. Перезапустите backend сервер
2. Ошибка должна исчезнуть
3. Сервер должен запуститься успешно

## Проверка

После установки проверьте, что пакет установлен:

```bash
cd backend
npm list nodemailer
```

Должно показать версию пакета.
