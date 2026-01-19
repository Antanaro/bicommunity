# Быстрый перенос проекта на VM

## Шаг 1: Подготовка на локальной машине

1. **Создайте файл `.env`** в корне проекта:
   ```powershell
   Copy-Item env.template .env
   ```
   
2. **Отредактируйте `.env`** и укажите:
   - `DB_PASSWORD` - надежный пароль
   - `JWT_SECRET` - сгенерируйте: `openssl rand -hex 32`
   - `FRONTEND_URL` - IP или домен вашей VM

## Шаг 2: Настройка VM (первый раз)

Подключитесь к VM и запустите скрипт настройки:

```bash
# Скопируйте setup-vm.sh на VM
scp setup-vm.sh user@your-vm-ip:~/

# Подключитесь к VM
ssh user@your-vm-ip

# Запустите скрипт настройки
chmod +x setup-vm.sh
sudo ./setup-vm.sh

# Выйдите и войдите снова (для применения изменений группы docker)
exit
ssh user@your-vm-ip
```

## Шаг 3: Копирование проекта на VM

### Вариант A: PowerShell скрипт (Windows)

```powershell
.\deploy-to-vm.ps1 -VmHost "your-vm-ip" -VmUser "username"
```

### Вариант B: Bash скрипт (Linux/Mac/WSL)

```bash
chmod +x deploy-to-vm.sh
./deploy-to-vm.sh user@your-vm-ip
```

### Вариант C: Вручную через Git

```bash
# На VM
cd ~
git clone your-repo-url bicommunity
cd bicommunity
cp env.template .env
nano .env  # Отредактируйте настройки
```

## Шаг 4: Запуск на VM

```bash
# Подключитесь к VM
ssh user@your-vm-ip
cd ~/bicommunity

# Запустите проект
docker compose up -d

# Проверьте статус
docker compose ps

# Просмотр логов
docker compose logs -f
```

## Шаг 5: Проверка

Откройте в браузере: `http://your-vm-ip`

## Обновление проекта

При обновлении кода:

```bash
# На VM
cd ~/bicommunity
git pull  # или скопируйте новые файлы
docker compose down
docker compose build
docker compose up -d
```

## Полезные команды

```bash
# Статус контейнеров
docker compose ps

# Логи
docker compose logs -f

# Остановка
docker compose down

# Перезапуск
docker compose restart backend
```

## Если что-то пошло не так

1. Проверьте логи: `docker compose logs`
2. Проверьте `.env` файл
3. Проверьте порты: `sudo netstat -tulpn | grep -E ':(80|443|5432)'`
4. Смотрите подробную инструкцию: `ПЕРЕНОС-НА-VM.md`
