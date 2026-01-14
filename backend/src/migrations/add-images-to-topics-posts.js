const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'forum_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const addImagesColumn = async () => {
  try {
    console.log('🔄 Adding images column to topics and posts tables...');

    // Check if images column already exists in topics
    const topicsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='topics' AND column_name='images'
    `);

    if (topicsCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE topics 
        ADD COLUMN images TEXT[]
      `);
      console.log('✅ Added images column to topics table');
    } else {
      console.log('ℹ️  images column already exists in topics table');
    }

    // Check if images column already exists in posts
    const postsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='posts' AND column_name='images'
    `);

    if (postsCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE posts 
        ADD COLUMN images TEXT[]
      `);
      console.log('✅ Added images column to posts table');
    } else {
      console.log('ℹ️  images column already exists in posts table');
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

addImagesColumn();
