import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { telegramBotService } from '../services/telegram-bot';

const router = express.Router();

// Get all topics (with optional category filter)
router.get('/', async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.category_id;
    let query = `
      SELECT 
        t.*,
        u.username as author_name,
        c.name as category_name,
        COUNT(p.id) as post_count,
        MAX(p.created_at) as last_post_at,
        (
          SELECT u2.username 
          FROM posts p2
          JOIN users u2 ON p2.author_id = u2.id
          WHERE p2.topic_id = t.id
          ORDER BY p2.created_at DESC
          LIMIT 1
        ) as last_post_author
      FROM topics t
      JOIN users u ON t.author_id = u.id
      JOIN categories c ON t.category_id = c.id
      LEFT JOIN posts p ON t.id = p.topic_id
    `;

    const params: any[] = [];
    if (categoryId) {
      query += ' WHERE t.category_id = $1';
      params.push(categoryId);
    }

    query += ' GROUP BY t.id, u.username, c.name ORDER BY COALESCE(MAX(p.created_at), t.created_at) DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single topic with posts
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Get topic
    const topicResult = await pool.query(
      `
      SELECT 
        t.*,
        u.username as author_name,
        u.avatar_url as author_avatar,
        c.name as category_name
      FROM topics t
      JOIN users u ON t.author_id = u.id
      JOIN categories c ON t.category_id = c.id
      WHERE t.id = $1
    `,
      [req.params.id]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get posts with parent information and reaction counts
    // Check if reaction_type column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='likes' AND column_name='reaction_type'
    `);
    
    const hasReactionType = columnCheck.rows.length > 0;
    
    const postsResult = await pool.query(
      hasReactionType
        ? `
          SELECT 
            p.*,
            u.username as author_name,
            u.avatar_url as author_avatar,
            COALESCE(COUNT(CASE WHEN l.reaction_type = 1 THEN 1 END)::INTEGER, 0) as upvote_count,
            COALESCE(COUNT(CASE WHEN l.reaction_type = -1 THEN 1 END)::INTEGER, 0) as downvote_count,
            parent_u.username as parent_author_name,
            parent_u.avatar_url as parent_author_avatar
          FROM posts p
          JOIN users u ON p.author_id = u.id
          LEFT JOIN likes l ON p.id = l.post_id
          LEFT JOIN posts parent_p ON p.parent_id = parent_p.id
          LEFT JOIN users parent_u ON parent_p.author_id = parent_u.id
          WHERE p.topic_id = $1
          GROUP BY p.id, u.username, u.avatar_url, parent_u.username, parent_u.avatar_url
          ORDER BY p.created_at ASC
        `
        : `
          SELECT 
            p.*,
            u.username as author_name,
            u.avatar_url as author_avatar,
            COALESCE(COUNT(l.id)::INTEGER, 0) as upvote_count,
            0::INTEGER as downvote_count,
            parent_u.username as parent_author_name,
            parent_u.avatar_url as parent_author_avatar
          FROM posts p
          JOIN users u ON p.author_id = u.id
          LEFT JOIN likes l ON p.id = l.post_id
          LEFT JOIN posts parent_p ON p.parent_id = parent_p.id
          LEFT JOIN users parent_u ON parent_p.author_id = parent_u.id
          WHERE p.topic_id = $1
          GROUP BY p.id, u.username, u.avatar_url, parent_u.username, parent_u.avatar_url
          ORDER BY p.created_at ASC
        `,
      [req.params.id]
    );

    res.json({
      ...topicResult.rows[0],
      posts: postsResult.rows,
    });
  } catch (error) {
    console.error('Get topic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create topic
router.post(
  '/',
  authenticate,
  [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required'),
    body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
    body('category_id').isInt().withMessage('Category ID is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, content, category_id, images } = req.body;

      // Verify category exists
      const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [
        category_id,
      ]);
      if (categoryCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Convert images array to PostgreSQL array format
      const imagesArray = images && Array.isArray(images) ? images : [];

      const result = await pool.query(
        'INSERT INTO topics (title, content, author_id, category_id, images) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [title, content, req.userId, category_id, imagesArray]
      );

      // Отправляем уведомление администратору о новой теме
      try {
        // Получаем информацию об авторе темы
        const authorResult = await pool.query(
          'SELECT username, email FROM users WHERE id = $1',
          [req.userId]
        );
        
        if (authorResult.rows.length > 0) {
          const author = authorResult.rows[0];
          const notificationMessage = `📝 <b>Создана новая тема</b>\n\n` +
            `📌 Название: <b>${title}</b>\n` +
            `👤 Автор: <code>${author.username}</code>\n` +
            `🆔 ID темы: ${result.rows[0].id}`;
          await telegramBotService.sendAdminNotification(notificationMessage);
        }
      } catch (notificationError) {
        // Игнорируем ошибки уведомлений, чтобы не нарушать создание темы
        console.error('Failed to send topic creation notification:', notificationError);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create topic error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update topic (author only)
router.put(
  '/:id',
  authenticate,
  [
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('content').optional().trim().isLength({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if topic exists and user is author
      const topicCheck = await pool.query('SELECT author_id FROM topics WHERE id = $1', [
        req.params.id,
      ]);

      if (topicCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      if (topicCheck.rows[0].author_id !== req.userId && req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const { title, content } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramCount++}`);
        values.push(title);
      }
      if (content !== undefined) {
        updates.push(`content = $${paramCount++}`);
        values.push(content);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(req.params.id);

      const result = await pool.query(
        `UPDATE topics SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update topic error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete topic (author or admin)
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const topicCheck = await pool.query('SELECT author_id FROM topics WHERE id = $1', [
      req.params.id,
    ]);

    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (topicCheck.rows[0].author_id !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM topics WHERE id = $1', [req.params.id]);

    res.json({ message: 'Topic deleted' });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
