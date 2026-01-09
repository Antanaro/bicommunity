import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get posts for a topic (usually called via topics/:id)
router.get('/topic/:topicId', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        p.*,
        u.username as author_name,
        COUNT(l.id) as like_count
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN likes l ON p.id = l.post_id
      WHERE p.topic_id = $1
      GROUP BY p.id, u.username
      ORDER BY p.created_at ASC
    `,
      [req.params.topicId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create post
router.post(
  '/',
  authenticate,
  [
    body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
    body('topic_id').isInt().withMessage('Topic ID is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { content, topic_id } = req.body;

      // Verify topic exists
      const topicCheck = await pool.query('SELECT id FROM topics WHERE id = $1', [topic_id]);
      if (topicCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      const result = await pool.query(
        'INSERT INTO posts (content, author_id, topic_id) VALUES ($1, $2, $3) RETURNING *',
        [content, req.userId, topic_id]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update post (author only)
router.put(
  '/:id',
  authenticate,
  [body('content').trim().isLength({ min: 1 }).withMessage('Content is required')],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if post exists and user is author
      const postCheck = await pool.query('SELECT author_id FROM posts WHERE id = $1', [
        req.params.id,
      ]);

      if (postCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      if (postCheck.rows[0].author_id !== req.userId && req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { content } = req.body;

      const result = await pool.query(
        'UPDATE posts SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [content, req.params.id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update post error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete post (author or admin)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const postCheck = await pool.query('SELECT author_id FROM posts WHERE id = $1', [
      req.params.id,
    ]);

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (postCheck.rows[0].author_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Like/Unlike post
router.post('/:id/like', authenticate, async (req: AuthRequest, res) => {
  try {
    const postId = req.params.id;

    // Check if post exists
    const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check if already liked
    const likeCheck = await pool.query('SELECT id FROM likes WHERE user_id = $1 AND post_id = $2', [
      req.userId,
      postId,
    ]);

    if (likeCheck.rows.length > 0) {
      // Unlike
      await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [
        req.userId,
        postId,
      ]);
      res.json({ liked: false });
    } else {
      // Like
      await pool.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2)', [
        req.userId,
        postId,
      ]);
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
