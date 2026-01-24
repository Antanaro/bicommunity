// Migration: Add OAuth fields to users table
import dotenv from 'dotenv';
import path from 'path';
import { pool } from '../config/database';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function migrateOAuthFields() {
  // Проверяем настройки подключения перед попыткой подключения
  console.log('Проверка настроек подключения к базе данных...');
  console.log(`DB_HOST: ${process.env.DB_HOST || '127.0.0.1'}`);
  console.log(`DB_PORT: ${process.env.DB_PORT || '5432'}`);
  console.log(`DB_NAME: ${process.env.DB_NAME || 'forum_db'}`);
  console.log(`DB_USER: ${process.env.DB_USER || 'postgres'}`);
  console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***установлен***' : '❌ НЕ УСТАНОВЛЕН!'}`);
  
  if (!process.env.DB_PASSWORD) {
    console.error('\n❌ ОШИБКА: DB_PASSWORD не установлен в .env файле!');
    console.error('Пожалуйста, откройте .env файл в корне проекта и установите правильный пароль для PostgreSQL.');
    console.error('Пример: DB_PASSWORD=ваш_пароль_от_postgresql');
    process.exit(1);
  }
  
  const client = await pool.connect();
  
  try {
    console.log('\n✅ Подключение к базе данных установлено');
    console.log('Starting OAuth fields migration...');
    
    // Check if google_id column exists
    const googleIdCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'google_id'
    `);
    
    if (googleIdCheck.rows.length === 0) {
      console.log('Adding google_id column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN google_id VARCHAR(255) UNIQUE
      `);
      console.log('✅ google_id column added');
    } else {
      console.log('✅ google_id column already exists');
    }
    
    // Check if yandex_id column exists
    const yandexIdCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'yandex_id'
    `);
    
    if (yandexIdCheck.rows.length === 0) {
      console.log('Adding yandex_id column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN yandex_id VARCHAR(255) UNIQUE
      `);
      console.log('✅ yandex_id column added');
    } else {
      console.log('✅ yandex_id column already exists');
    }
    
    // Check if oauth_provider column exists
    const oauthProviderCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'oauth_provider'
    `);
    
    if (oauthProviderCheck.rows.length === 0) {
      console.log('Adding oauth_provider column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN oauth_provider VARCHAR(20)
      `);
      console.log('✅ oauth_provider column added');
    } else {
      console.log('✅ oauth_provider column already exists');
    }
    
    // Make password_hash nullable for OAuth users
    const passwordHashCheck = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    
    if (passwordHashCheck.rows.length > 0 && passwordHashCheck.rows[0].is_nullable === 'NO') {
      console.log('Making password_hash nullable for OAuth users...');
      await client.query(`
        ALTER TABLE users 
        ALTER COLUMN password_hash DROP NOT NULL
      `);
      console.log('✅ password_hash is now nullable');
    } else {
      console.log('✅ password_hash is already nullable or column does not exist');
    }
    
    // Add indexes for OAuth IDs
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_yandex_id ON users(yandex_id) WHERE yandex_id IS NOT NULL
    `);
    
    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.code === '28P01') {
      console.error('\n🔐 ОШИБКА АУТЕНТИФИКАЦИИ:');
      console.error('Неверный пароль для пользователя PostgreSQL.');
      console.error('\nПроверьте:');
      console.error('1. Откройте файл .env в корне проекта');
      console.error('2. Убедитесь, что DB_PASSWORD установлен правильно');
      console.error('3. Пароль должен совпадать с паролем пользователя postgres в PostgreSQL');
      console.error('\nПример правильной настройки:');
      console.error('DB_USER=postgres');
      console.error('DB_PASSWORD=ваш_реальный_пароль');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n🔌 ОШИБКА ПОДКЛЮЧЕНИЯ:');
      console.error('Не удалось подключиться к PostgreSQL серверу.');
      console.error('\nПроверьте:');
      console.error('1. PostgreSQL сервер запущен?');
      console.error('2. Правильный ли хост и порт в .env? (DB_HOST, DB_PORT)');
    } else if (error.code === '3D000') {
      console.error('\n📊 ОШИБКА БАЗЫ ДАННЫХ:');
      console.error('База данных не существует.');
      console.error('\nСоздайте базу данных:');
      console.error('CREATE DATABASE forum_db;');
    }
    
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateOAuthFields()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateOAuthFields };
