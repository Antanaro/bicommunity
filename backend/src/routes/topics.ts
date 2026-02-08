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

// Global ID map for Board (#1, #2, ...) — one query instead of 1 + N topic requests
router.get('/global-id-map', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      WITH topic_rows AS (
        SELECT id, created_at, 'topic' AS type FROM topics
      ),
      post_rows AS (
        SELECT p.id, p.created_at, 'post' AS type FROM posts p
      ),
      combined AS (
        SELECT id, created_at, type FROM topic_rows
        UNION ALL
        SELECT id, created_at, type FROM post_rows
      ),
      ordered AS (
        SELECT id, type, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS global_id
        FROM combined
      )
      SELECT id, type, global_id FROM ordered
    `);
    const map: Record<string, number> = {};
    result.rows.forEach((row: { id: number; type: string; global_id: string }) => {
      const key = row.type === 'topic' ? `topic-${row.id}` : `post-${row.id}`;
      map[key] = parseInt(row.global_id, 10);
    });
    res.json(map);
  } catch (error) {
    console.error('Get global-id-map error:', error);
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

    // Load poll for this topic (if any)
    const topicId = parseInt(req.params.id, 10);
    const pollResult = await pool.query(
      'SELECT id, question, multiple_choice, allow_view_without_vote FROM polls WHERE topic_id = $1',
      [topicId]
    );
    let poll: any = null;
    if (pollResult.rows.length > 0) {
      const p = pollResult.rows[0];
      const optionsResult = await pool.query(
        `SELECT po.id, po.text, po.position,
          COALESCE(v.cnt, 0)::int AS vote_count
         FROM poll_options po
         LEFT JOIN (
           SELECT option_id, COUNT(*) AS cnt FROM poll_votes WHERE poll_id = $1 GROUP BY option_id
         ) v ON po.id = v.option_id
         WHERE po.poll_id = $1
         ORDER BY po.position ASC, po.id ASC`,
        [p.id]
      );
      const totalVotes = optionsResult.rows.reduce((sum: number, row: any) => sum + (row.vote_count || 0), 0);
      let userVotedOptionIds: number[] = [];
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        if (token) {
          try {
            const jwt = await import('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: number };
            const uv = await pool.query(
              'SELECT option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2',
              [p.id, decoded.userId]
            );
            userVotedOptionIds = uv.rows.map((r: any) => r.option_id);
          } catch {
            // not authenticated
          }
        }
      }
      poll = {
        id: p.id,
        question: p.question,
        multiple_choice: p.multiple_choice,
        allow_view_without_vote: p.allow_view_without_vote,
        total_votes: totalVotes,
        options: optionsResult.rows.map((o: any) => ({
          id: o.id,
          text: o.text,
          position: o.position,
          vote_count: parseInt(o.vote_count, 10) || 0,
        })),
        user_voted_option_ids: userVotedOptionIds,
      };
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
      poll,
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
      console.log('📝 Topic created, preparing admin notification...');
      try {
        // Получаем информацию об авторе темы
        const authorResult = await pool.query(
          'SELECT username, email FROM users WHERE id = $1',
          [req.userId]
        );
        
        console.log(`👤 Author query result: ${authorResult.rows.length} rows`);
        
        if (authorResult.rows.length > 0) {
          const author = authorResult.rows[0];
          const notificationMessage = `📝 <b>Создана новая тема</b>\n\n` +
            `📌 Название: <b>${title}</b>\n` +
            `👤 Автор: <code>${author.username}</code>\n` +
            `🆔 ID темы: ${result.rows[0].id}`;
          console.log('📤 Calling sendAdminNotification...');
          await telegramBotService.sendAdminNotification(notificationMessage);
          console.log('✅ sendAdminNotification call completed');
        } else {
          console.warn('⚠️  Author not found for user_id:', req.userId);
        }
      } catch (notificationError: any) {
        // Игнорируем ошибки уведомлений, чтобы не нарушать создание темы
        console.error('❌ Failed to send topic creation notification:', notificationError);
        console.error('❌ Error stack:', notificationError.stack);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create topic error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Create poll in topic (author or admin only, one poll per topic)
router.post(
  '/:id/polls',
  authenticate,
  [
    body('question').trim().isLength({ min: 1, max: 500 }).withMessage('Question is required'),
    body('options').isArray({ min: 2, max: 10 }).withMessage('From 2 to 10 options required'),
    body('options.*').trim().isLength({ min: 1, max: 200 }).withMessage('Option text required'),
    body('multiple_choice').optional().isBoolean(),
    body('allow_view_without_vote').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const topicId = parseInt(req.params.id, 10);
      if (isNaN(topicId)) {
        return res.status(400).json({ error: 'Invalid topic ID' });
      }

      const topicCheck = await pool.query('SELECT id, author_id FROM topics WHERE id = $1', [
        topicId,
      ]);
      if (topicCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }
      const topic = topicCheck.rows[0];
      if (topic.author_id !== req.userId && req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Only author or admin can create a poll' });
      }

      const existingPoll = await pool.query('SELECT id FROM polls WHERE topic_id = $1', [
        topicId,
      ]);
      if (existingPoll.rows.length > 0) {
        return res.status(400).json({ error: 'This topic already has a poll' });
      }

      const { question, options, multiple_choice, allow_view_without_vote } = req.body;
      const pollResult = await pool.query(
        `INSERT INTO polls (topic_id, question, multiple_choice, allow_view_without_vote)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          topicId,
          question.trim(),
          !!multiple_choice,
          allow_view_without_vote !== false,
        ]
      );
      const poll = pollResult.rows[0];

      for (let i = 0; i < options.length; i++) {
        await pool.query(
          'INSERT INTO poll_options (poll_id, text, position) VALUES ($1, $2, $3)',
          [poll.id, String(options[i]).trim(), i]
        );
      }

      res.status(201).json(poll);
    } catch (error) {
      console.error('Create poll error:', error);
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
