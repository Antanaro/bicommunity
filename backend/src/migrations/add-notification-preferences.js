// Migration: Add notification preference fields and telegram_chat_id to users table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'forum_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'rootroot',
});

async function migrateNotificationPreferences() {
  const client = await pool.connect();

  try {
    console.log('Starting notification preferences migration...');

    const columns = [
      { name: 'telegram_chat_id', type: 'VARCHAR(50)', defaultClause: 'NULL' },
      {
        name: 'notify_reply_to_my_post_email',
        type: 'BOOLEAN',
        defaultClause: 'TRUE',
      },
      {
        name: 'notify_reply_to_my_post_telegram',
        type: 'BOOLEAN',
        defaultClause: 'FALSE',
      },
      {
        name: 'notify_reply_in_my_topic_email',
        type: 'BOOLEAN',
        defaultClause: 'TRUE',
      },
      {
        name: 'notify_reply_in_my_topic_telegram',
        type: 'BOOLEAN',
        defaultClause: 'FALSE',
      },
      {
        name: 'notify_new_topic_email',
        type: 'BOOLEAN',
        defaultClause: 'TRUE',
      },
      {
        name: 'notify_new_topic_telegram',
        type: 'BOOLEAN',
        defaultClause: 'FALSE',
      },
    ];

    for (const col of columns) {
      const check = await client.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = $1
      `,
        [col.name]
      );

      if (check.rows.length === 0) {
        console.log(`Adding ${col.name} column...`);
        await client.query(
          `
          ALTER TABLE users
          ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.defaultClause}
        `
        );
        console.log(`✅ ${col.name} column added`);
      } else {
        console.log(`✅ ${col.name} column already exists`);
      }
    }

    console.log('✅ Notification preferences migration completed successfully!');
  } catch (error) {
    console.error('❌ Notification preferences migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateNotificationPreferences()
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });

