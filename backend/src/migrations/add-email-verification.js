require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'forum_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const addEmailVerificationFields = async () => {
  try {
    // Добавляем поле email_verified
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
    `);

    // Добавляем поле email_verification_token
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255)
    `);

    // Добавляем индекс для быстрого поиска по токену
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_token 
      ON users(email_verification_token) 
      WHERE email_verification_token IS NOT NULL
    `);

    console.log('✅ Email verification fields added successfully');
  } catch (error) {
    console.error('❌ Error adding email verification fields:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run migration
if (require.main === module) {
  addEmailVerificationFields()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addEmailVerificationFields;
