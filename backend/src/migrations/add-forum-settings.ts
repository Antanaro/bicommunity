import { pool } from '../config/database';

export async function addForumSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS forum_settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    INSERT INTO forum_settings (key, value) VALUES ('about', '## О форуме\n\nЗдесь можно рассказать о предназначении форума. Текст может редактировать администратор.')
    ON CONFLICT (key) DO NOTHING
  `);
}
