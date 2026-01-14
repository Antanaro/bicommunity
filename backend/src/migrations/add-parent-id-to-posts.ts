import { pool } from '../config/database';

const addParentIdToPosts = async () => {
  try {
    // Add parent_id column to posts table
    await pool.query(`
      ALTER TABLE posts 
      ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE
    `);

    // Add index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_parent ON posts(parent_id)
    `);

    console.log('✅ Added parent_id column to posts table');
  } catch (error) {
    console.error('❌ Error adding parent_id column:', error);
    throw error;
  }
};

// Run migration
if (require.main === module) {
  addParentIdToPosts()
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

export default addParentIdToPosts;
