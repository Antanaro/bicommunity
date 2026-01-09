// Скрипт для проверки подключения к PostgreSQL
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // Подключаемся к системной БД для создания forum_db
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkConnection() {
  try {
    console.log('Проверка подключения к PostgreSQL...');
    const result = await pool.query('SELECT version()');
    console.log('✅ Подключение успешно!');
    console.log('Версия PostgreSQL:', result.rows[0].version);
    
    // Проверяем существование базы данных
    const dbCheck = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'forum_db']
    );
    
    if (dbCheck.rows.length === 0) {
      console.log('\n⚠️  База данных forum_db не найдена.');
      console.log('Создайте её командой: CREATE DATABASE forum_db;');
    } else {
      console.log('✅ База данных forum_db существует');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка подключения к PostgreSQL:');
    console.error(error.message);
    console.error('\nПроверьте:');
    console.error('1. PostgreSQL запущен');
    console.error('2. Правильность данных в backend/.env');
    console.error('3. База данных postgres существует');
    await pool.end();
    process.exit(1);
  }
}

checkConnection();
