import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
// In dev: __dirname = backend/src/config, path = ../../../.env = root/.env
// In prod: __dirname = backend/dist/config, path = ../../../.env = root/.env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// В production пароль БД обязан быть задан в .env
const dbPassword = process.env.DB_PASSWORD;
if (process.env.NODE_ENV === 'production' && !dbPassword) {
  throw new Error(
    'DB_PASSWORD не установлен в .env. В production запрещён запуск с паролем по умолчанию.'
  );
}

export const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'forum_db',
  user: process.env.DB_USER || 'postgres',
  password: dbPassword || 'rootroot', // fallback только для development
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});
