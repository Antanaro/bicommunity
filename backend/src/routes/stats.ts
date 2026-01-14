import express, { Request, Response } from 'express';
import { pool } from '../config/database';

const router = express.Router();

// Get most upvoted post
router.get('/most-upvoted', async (req: Request, res: Response) => {
  try {
    // Check if reaction_type column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='likes' AND column_name='reaction_type'
    `);
    const hasReactionType = columnCheck.rows.length > 0;

    const result = await pool.query(
      hasReactionType
        ? `
          SELECT 
            p.*,
            u.username as author_name,
            t.id as topic_id,
            t.title as topic_title,
            COALESCE(COUNT(CASE WHEN l.reaction_type = 1 THEN 1 END)::INTEGER, 0) as upvote_count
          FROM posts p
          JOIN users u ON p.author_id = u.id
          JOIN topics t ON p.topic_id = t.id
          LEFT JOIN likes l ON p.id = l.post_id AND l.reaction_type = 1
          GROUP BY p.id, u.username, t.id, t.title
          ORDER BY upvote_count DESC, p.created_at DESC
          LIMIT 1
        `
        : `
          SELECT 
            p.*,
            u.username as author_name,
            t.id as topic_id,
            t.title as topic_title,
            COALESCE(COUNT(l.id)::INTEGER, 0) as upvote_count
          FROM posts p
          JOIN users u ON p.author_id = u.id
          JOIN topics t ON p.topic_id = t.id
          LEFT JOIN likes l ON p.id = l.post_id
          GROUP BY p.id, u.username, t.id, t.title
          ORDER BY upvote_count DESC, p.created_at DESC
          LIMIT 1
        `
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get most upvoted post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get most downvoted post
router.get('/most-downvoted', async (req: Request, res: Response) => {
  try {
    // Check if reaction_type column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='likes' AND column_name='reaction_type'
    `);
    const hasReactionType = columnCheck.rows.length > 0;

    if (!hasReactionType) {
      return res.json(null);
    }

    const result = await pool.query(`
      SELECT 
        p.*,
        u.username as author_name,
        t.id as topic_id,
        t.title as topic_title,
        COALESCE(COUNT(CASE WHEN l.reaction_type = -1 THEN 1 END)::INTEGER, 0) as downvote_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      JOIN topics t ON p.topic_id = t.id
      LEFT JOIN likes l ON p.id = l.post_id AND l.reaction_type = -1
      GROUP BY p.id, u.username, t.id, t.title
      HAVING COUNT(CASE WHEN l.reaction_type = -1 THEN 1 END) > 0
      ORDER BY downvote_count DESC, p.created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get most downvoted post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get top 3 most discussed topics
router.get('/top-discussed', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        t.*,
        u.username as author_name,
        c.name as category_name,
        COUNT(p.id)::INTEGER as post_count
      FROM topics t
      JOIN users u ON t.author_id = u.id
      JOIN categories c ON t.category_id = c.id
      LEFT JOIN posts p ON t.id = p.topic_id
      GROUP BY t.id, u.username, c.name
      ORDER BY post_count DESC, t.created_at DESC
      LIMIT 3
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get top discussed topics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
