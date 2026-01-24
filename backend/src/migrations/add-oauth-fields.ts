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
    
    // Проверяем, существует ли таблица users
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'users'
    `);
    
    if (tableCheck.rows.length === 0) {
      throw new Error('Таблица users не существует! Сначала запустите основную миграцию: npm run migrate');
    }
    
    console.log('✅ Таблица users существует');
    
    // Check if google_id column exists
    const googleIdCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_id'
    `);
    
    if (googleIdCheck.rows.length === 0) {
      console.log('Adding google_id column...');
      try {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN google_id VARCHAR(255)
        `);
        // Добавляем UNIQUE constraint отдельно, если нужно
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL
        `);
        console.log('✅ google_id column added');
      } catch (error: any) {
        console.error('❌ Ошибка при добавлении google_id:', error.message);
        throw error;
      }
    } else {
      console.log('✅ google_id column already exists');
    }
    
    // Проверяем, что колонка действительно добавлена
    const verifyGoogleId = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'google_id'
    `);
    if (verifyGoogleId.rows.length > 0) {
      console.log(`   Проверка: google_id существует (тип: ${verifyGoogleId.rows[0].data_type})`);
    }
    
    // Check if yandex_id column exists
    const yandexIdCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'yandex_id'
    `);
    
    if (yandexIdCheck.rows.length === 0) {
      console.log('Adding yandex_id column...');
      try {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN yandex_id VARCHAR(255)
        `);
        // Добавляем UNIQUE constraint отдельно
        await client.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_users_yandex_id_unique ON users(yandex_id) WHERE yandex_id IS NOT NULL
        `);
        console.log('✅ yandex_id column added');
      } catch (error: any) {
        console.error('❌ Ошибка при добавлении yandex_id:', error.message);
        throw error;
      }
    } else {
      console.log('✅ yandex_id column already exists');
    }
    
    // Проверяем, что колонка действительно добавлена
    const verifyYandexId = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'yandex_id'
    `);
    if (verifyYandexId.rows.length > 0) {
      console.log(`   Проверка: yandex_id существует (тип: ${verifyYandexId.rows[0].data_type})`);
    }
    
    // Check if oauth_provider column exists
    const oauthProviderCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'oauth_provider'
    `);
    
    if (oauthProviderCheck.rows.length === 0) {
      console.log('Adding oauth_provider column...');
      try {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN oauth_provider VARCHAR(20)
        `);
        console.log('✅ oauth_provider column added');
      } catch (error: any) {
        console.error('❌ Ошибка при добавлении oauth_provider:', error.message);
        throw error;
      }
    } else {
      console.log('✅ oauth_provider column already exists');
    }
    
    // Проверяем, что колонка действительно добавлена
    const verifyOAuthProvider = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'oauth_provider'
    `);
    if (verifyOAuthProvider.rows.length > 0) {
      console.log(`   Проверка: oauth_provider существует (тип: ${verifyOAuthProvider.rows[0].data_type})`);
    }
    
    // Make password_hash nullable for OAuth users
    const passwordHashCheck = await client.query(`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
    `);
    
    if (passwordHashCheck.rows.length > 0 && passwordHashCheck.rows[0].is_nullable === 'NO') {
      console.log('Making password_hash nullable for OAuth users...');
      try {
        await client.query(`
          ALTER TABLE users 
          ALTER COLUMN password_hash DROP NOT NULL
        `);
        console.log('✅ password_hash is now nullable');
      } catch (error: any) {
        console.error('⚠️ Не удалось сделать password_hash nullable:', error.message);
        // Не критично, продолжаем
      }
    } else {
      console.log('✅ password_hash is already nullable or column does not exist');
    }
    
    // Add indexes for OAuth IDs
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL
      `);
      console.log('✅ Index for google_id created');
    } catch (error: any) {
      console.error('⚠️ Не удалось создать индекс для google_id:', error.message);
    }
    
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_yandex_id ON users(yandex_id) WHERE yandex_id IS NOT NULL
      `);
      console.log('✅ Index for yandex_id created');
    } catch (error: any) {
      console.error('⚠️ Не удалось создать индекс для yandex_id:', error.message);
    }
    
    // Финальная проверка всех колонок
    console.log('\n📋 Финальная проверка структуры таблицы users:');
    const finalCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      AND column_name IN ('google_id', 'yandex_id', 'oauth_provider')
      ORDER BY column_name
    `);
    
    if (finalCheck.rows.length === 0) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Колонки OAuth не найдены после миграции!');
      console.error('Попробуйте выполнить SQL вручную:');
      console.error(`
ALTER TABLE users ADD COLUMN google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN yandex_id VARCHAR(255);
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20);
CREATE UNIQUE INDEX idx_users_google_id_unique ON users(google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX idx_users_yandex_id_unique ON users(yandex_id) WHERE yandex_id IS NOT NULL;
      `);
    } else {
      console.log('✅ Найдены следующие OAuth колонки:');
      finalCheck.rows.forEach((row: any) => {
        console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error);
    
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
