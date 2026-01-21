// Migration: Add avatar_url and bio fields to users table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'forum_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'rootroot',
});

async function migrateUserProfile() {
  const client = await pool.connect();
  
  try {
    console.log('Starting user profile fields migration...');
    
    // Check if avatar_url column exists
    const avatarCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'avatar_url'
    `);
    
    if (avatarCheck.rows.length === 0) {
      console.log('Adding avatar_url column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN avatar_url VARCHAR(500)
      `);
      console.log('✅ avatar_url column added');
    } else {
      console.log('✅ avatar_url column already exists');
    }
    
    // Check if bio column exists
    const bioCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'bio'
    `);
    
    if (bioCheck.rows.length === 0) {
      console.log('Adding bio column...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN bio TEXT
      `);
      console.log('✅ bio column added');
    } else {
      console.log('✅ bio column already exists');
    }
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateUserProfile()
  .then(() => {
    console.log('Migration finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });
