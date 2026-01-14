require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'forum_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'rootroot',
});

const addReactionTypeToLikes = async () => {
  try {
    console.log('🔄 Adding reaction_type column to likes table...');
    
    // Add reaction_type column to likes table (1 for upvote, -1 for downvote)
    await pool.query(`
      ALTER TABLE likes 
      ADD COLUMN IF NOT EXISTS reaction_type INTEGER DEFAULT 1 CHECK (reaction_type IN (1, -1))
    `);

    // Update existing likes to be upvotes (1)
    await pool.query(`
      UPDATE likes SET reaction_type = 1 WHERE reaction_type IS NULL
    `);

    // Drop old unique constraint if it exists
    await pool.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'likes_user_id_post_id_key'
        ) THEN
          ALTER TABLE likes DROP CONSTRAINT likes_user_id_post_id_key;
        END IF;
      END $$;
    `);

    // Create new unique constraint on (user_id, post_id) - one reaction per user per post
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'likes_user_post_unique'
        ) THEN
          ALTER TABLE likes ADD CONSTRAINT likes_user_post_unique UNIQUE (user_id, post_id);
        END IF;
      END $$;
    `);

    console.log('✅ Added reaction_type column to likes table');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error adding reaction_type column:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

// Run migration
addReactionTypeToLikes()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
