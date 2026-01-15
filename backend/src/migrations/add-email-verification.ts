import { pool } from '../config/database';

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

export default addEmailVerificationFields;
