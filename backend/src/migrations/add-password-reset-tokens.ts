import { pool } from '../config/database';

const createPasswordResetTokensTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Индекс для быстрого поиска по токену
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
    `);

    // Индекс для очистки истекших токенов
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);
    `);

    console.log('✅ Password reset tokens table created successfully');
  } catch (error) {
    console.error('❌ Error creating password_reset_tokens table:', error);
    throw error;
  }
};

// Run migration
if (require.main === module) {
  createPasswordResetTokensTable()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default createPasswordResetTokensTable;
