/**
 * Скрипт для авторизации в Telegram MTProto API
 * 
 * Запуск: npx ts-node src/scripts/telegram-auth.ts
 * 
 * После авторизации скрипт выведет TELEGRAM_SESSION_STRING,
 * который нужно добавить в .env файл.
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔐 Telegram MTProto Authorization');
  console.log('='.repeat(60));
  console.log();

  // Получаем API credentials
  let apiId = process.env.TELEGRAM_API_ID;
  let apiHash = process.env.TELEGRAM_API_HASH;

  if (!apiId || !apiHash) {
    console.log('API ID и API Hash не найдены в .env файле.');
    console.log('Получить их можно на https://my.telegram.org');
    console.log();
    
    apiId = await question('Введите API ID: ');
    apiHash = await question('Введите API Hash: ');
  } else {
    console.log(`✅ API ID: ${apiId}`);
    console.log(`✅ API Hash: ${apiHash.substring(0, 5)}...`);
  }

  console.log();
  console.log('Начинаю авторизацию...');
  console.log();

  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, parseInt(apiId), apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => {
      return await question('📱 Введите номер телефона (в формате +7...): ');
    },
    password: async () => {
      return await question('🔒 Введите пароль 2FA (если есть): ');
    },
    phoneCode: async () => {
      return await question('📨 Введите код из Telegram: ');
    },
    onError: (err) => {
      console.error('❌ Ошибка:', err);
    },
  });

  console.log();
  console.log('='.repeat(60));
  console.log('✅ Авторизация успешна!');
  console.log('='.repeat(60));
  console.log();
  
  const sessionString = client.session.save() as unknown as string;
  
  console.log('Добавьте следующие строки в ваш .env файл:');
  console.log();
  console.log('-'.repeat(60));
  console.log(`TELEGRAM_API_ID=${apiId}`);
  console.log(`TELEGRAM_API_HASH=${apiHash}`);
  console.log(`TELEGRAM_SESSION_STRING=${sessionString}`);
  console.log('-'.repeat(60));
  console.log();
  console.log('⚠️  ВАЖНО: Session string содержит вашу авторизацию.');
  console.log('   Храните его в безопасности и не публикуйте!');
  console.log();

  await client.disconnect();
  rl.close();
}

main().catch(console.error);
