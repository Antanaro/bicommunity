// Скрипт для проверки конфигурации Telegram уведомлений
const fs = require('fs');
const path = require('path');

console.log('🔍 Проверка конфигурации Telegram уведомлений\n');
console.log('='.repeat(60));

// Проверка корневого .env
const rootEnvPath = path.join(__dirname, '.env');
console.log('\n📁 Корневой .env файл:');
if (fs.existsSync(rootEnvPath)) {
  const rootEnv = fs.readFileSync(rootEnvPath, 'utf-8');
  const adminIdMatch = rootEnv.match(/^TELEGRAM_ADMIN_ID\s*=\s*(.+)$/m);
  const botTokenMatch = rootEnv.match(/^TELEGRAM_BOT_TOKEN\s*=\s*(.+)$/m);
  
  if (adminIdMatch) {
    console.log(`  ✅ TELEGRAM_ADMIN_ID: ${adminIdMatch[1].trim()}`);
  } else {
    console.log('  ❌ TELEGRAM_ADMIN_ID не найден');
  }
  
  if (botTokenMatch) {
    const token = botTokenMatch[1].trim();
    console.log(`  ✅ TELEGRAM_BOT_TOKEN: ${token.substring(0, 20)}...`);
  } else {
    console.log('  ❌ TELEGRAM_BOT_TOKEN не найден');
  }
} else {
  console.log('  ❌ Файл не найден');
}

// Проверка backend/.env
const backendEnvPath = path.join(__dirname, 'backend', '.env');
console.log('\n📁 backend/.env файл:');
if (fs.existsSync(backendEnvPath)) {
  const backendEnv = fs.readFileSync(backendEnvPath, 'utf-8');
  const adminIdMatch = backendEnv.match(/^TELEGRAM_ADMIN_ID\s*=\s*(.+)$/m);
  const botTokenMatch = backendEnv.match(/^TELEGRAM_BOT_TOKEN\s*=\s*(.+)$/m);
  
  if (adminIdMatch) {
    console.log(`  ✅ TELEGRAM_ADMIN_ID: ${adminIdMatch[1].trim()}`);
  } else {
    console.log('  ⚠️  TELEGRAM_ADMIN_ID не найден (может использоваться корневой .env)');
  }
  
  if (botTokenMatch) {
    const token = botTokenMatch[1].trim();
    console.log(`  ✅ TELEGRAM_BOT_TOKEN: ${token.substring(0, 20)}...`);
  } else {
    console.log('  ⚠️  TELEGRAM_BOT_TOKEN не найден (может использоваться корневой .env)');
  }
} else {
  console.log('  ⚠️  Файл не найден (используется корневой .env)');
}

// Проверка docker-compose.yml
const dockerComposePath = path.join(__dirname, 'docker-compose.yml');
console.log('\n🐳 docker-compose.yml:');
if (fs.existsSync(dockerComposePath)) {
  const dockerCompose = fs.readFileSync(dockerComposePath, 'utf-8');
  if (dockerCompose.includes('TELEGRAM_ADMIN_ID')) {
    console.log('  ✅ TELEGRAM_ADMIN_ID присутствует в environment');
  } else {
    console.log('  ❌ TELEGRAM_ADMIN_ID отсутствует в environment');
  }
  
  if (dockerCompose.includes('TELEGRAM_BOT_TOKEN')) {
    console.log('  ✅ TELEGRAM_BOT_TOKEN присутствует в environment');
  } else {
    console.log('  ❌ TELEGRAM_BOT_TOKEN отсутствует в environment');
  }
} else {
  console.log('  ⚠️  Файл не найден');
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 Рекомендации:');
console.log('  1. Убедитесь, что TELEGRAM_ADMIN_ID установлен в корневом .env');
console.log('  2. Если используете Docker, перезапустите контейнеры:');
console.log('     docker-compose down && docker-compose up -d --build');
console.log('  3. Если запускаете локально, перезапустите backend сервер');
console.log('  4. Проверьте логи при создании темы или регистрации пользователя');
