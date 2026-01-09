// Скрипт для создания базы данных forum_db
const { Pool } = require('pg');
require('dotenv').config();

// Подключаемся к системной базе данных postgres для создания новой БД
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Подключаемся к системной БД
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function createDatabase() {
  try {
    console.log('Подключение к PostgreSQL...');
    
    // Проверяем, существует ли база данных
    const checkResult = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'forum_db']
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ База данных forum_db уже существует');
      await pool.end();
      process.exit(0);
    }

    // Создаем базу данных
    console.log('Создание базы данных forum_db...');
    await pool.query(`CREATE DATABASE ${process.env.DB_NAME || 'forum_db'}`);
    
    console.log('✅ База данных forum_db успешно создана!');
    console.log('Теперь можно запустить миграции: npm run migrate');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при создании базы данных:');
    console.error(error.message);
    
    if (error.code === '3D000') {
      console.error('\nБаза данных не может быть создана. Проверьте права пользователя.');
    } else if (error.code === '28P01') {
      console.error('\nОшибка аутентификации. Проверьте пароль в файле .env');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nНе удалось подключиться к PostgreSQL.');
      console.error('Проверьте:');
      console.error('1. PostgreSQL запущен');
      console.error('2. Правильность DB_HOST и DB_PORT в .env');
    }
    
    await pool.end();
    process.exit(1);
  }
}

createDatabase();
