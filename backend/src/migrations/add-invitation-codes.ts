import { pool } from '../config/database';

const addInvitationCodes = async () => {
  try {
    // Таблица пригласительных кодов
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invitation_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(64) UNIQUE NOT NULL,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        used_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP
      )
    `);

    // Колонка для отслеживания кто пригласил пользователя
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    // Индексы
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_invitation_codes_owner ON invitation_codes(owner_id);
      CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
    `);

    console.log('✅ Invitation codes table created successfully');
  } catch (error) {
    console.error('❌ Error creating invitation codes table:', error);
    throw error;
  }
};

// Run migration
if (require.main === module) {
  addInvitationCodes()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default addInvitationCodes;
