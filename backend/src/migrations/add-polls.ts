import { pool } from '../config/database';

const addPolls = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id SERIAL PRIMARY KEY,
        topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        multiple_choice BOOLEAN NOT NULL DEFAULT FALSE,
        allow_view_without_vote BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(topic_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS poll_options (
        id SERIAL PRIMARY KEY,
        poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id SERIAL PRIMARY KEY,
        poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
        UNIQUE(poll_id, user_id, option_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_polls_topic ON polls(topic_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id)
    `);

    console.log('✅ Polls tables created');
  } catch (error) {
    console.error('❌ Error creating polls tables:', error);
    throw error;
  }
};

if (require.main === module) {
  addPolls()
    .then(() => {
      console.log('Migration completed');
      pool.end();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      pool.end();
      process.exit(1);
    });
}

export default addPolls;
