import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendReplyInTopicEmail, sendReplyToPostEmail } from '../services/email';
import { telegramBotService } from '../services/telegram-bot';

const router = express.Router();

// Get posts for a topic (usually called via topics/:id)
router.get('/topic/:topicId', async (req: Request, res: Response) => {
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
            u.avatar_url as author_avatar,
            COALESCE(COUNT(CASE WHEN l.reaction_type = 1 THEN 1 END)::INTEGER, 0) as upvote_count,
            COALESCE(COUNT(CASE WHEN l.reaction_type = -1 THEN 1 END)::INTEGER, 0) as downvote_count
          FROM posts p
          JOIN users u ON p.author_id = u.id
          LEFT JOIN likes l ON p.id = l.post_id
          WHERE p.topic_id = $1
          GROUP BY p.id, u.username, u.avatar_url
          ORDER BY p.created_at ASC
        `
        : `
          SELECT 
            p.*,
            u.username as author_name,
            u.avatar_url as author_avatar,
            COALESCE(COUNT(l.id)::INTEGER, 0) as upvote_count,
            0::INTEGER as downvote_count
          FROM posts p
          JOIN users u ON p.author_id = u.id
          LEFT JOIN likes l ON p.id = l.post_id
          WHERE p.topic_id = $1
          GROUP BY p.id, u.username, u.avatar_url
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
    body('parent_id').optional().isInt().withMessage('Parent ID must be an integer'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { content, topic_id, parent_id, images } = req.body;

      // Verify topic exists
      const topicCheck = await pool.query('SELECT id FROM topics WHERE id = $1', [topic_id]);
      if (topicCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      // If parent_id is provided, verify it exists and belongs to the same topic
      if (parent_id) {
        const parentCheck = await pool.query(
          'SELECT id, topic_id FROM posts WHERE id = $1',
          [parent_id]
        );
        if (parentCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Parent post not found' });
        }
        if (parentCheck.rows[0].topic_id !== parseInt(topic_id)) {
          return res.status(400).json({ error: 'Parent post must belong to the same topic' });
        }
      }

      // Convert images array to PostgreSQL array format
      const imagesArray = images && Array.isArray(images) ? images : [];

      const result = await pool.query(
        'INSERT INTO posts (content, author_id, topic_id, parent_id, images) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [content, req.userId, topic_id, parent_id || null, imagesArray]
      );

      const createdPost = result.rows[0];

      // Уведомления
      try {
        // Данные о теме и авторе поста
        const topicResult = await pool.query(
          `SELECT t.title, t.author_id, u.username as topic_author_username, u.email as topic_author_email,
                  u.telegram_chat_id as topic_author_telegram_chat_id,
                  u.notify_reply_in_my_topic_email,
                  u.notify_reply_in_my_topic_telegram
           FROM topics t
           JOIN users u ON t.author_id = u.id
           WHERE t.id = $1`,
          [topic_id]
        );

        const topicRow = topicResult.rows[0];

        const authorResult = await pool.query(
          'SELECT username FROM users WHERE id = $1',
          [req.userId]
        );
        const replierUsername = authorResult.rows[0]?.username || 'Неизвестно';

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const topicUrl = `${frontendUrl.replace(/\/$/, '')}/topic/${topic_id}`;

        // 1) Ответ на конкретное сообщение (уведомление автору этого сообщения)
        if (parent_id) {
          const parentPostResult = await pool.query(
            `SELECT p.author_id,
                    u.email,
                    u.username,
                    u.telegram_chat_id,
                    u.notify_reply_to_my_post_email,
                    u.notify_reply_to_my_post_telegram
             FROM posts p
             JOIN users u ON p.author_id = u.id
             WHERE p.id = $1`,
            [parent_id]
          );

          if (parentPostResult.rows.length > 0) {
            const parent = parentPostResult.rows[0];

            // Не уведомляем самого себя
            if (parent.author_id !== req.userId) {
              const excerpt =
                typeof content === 'string' && content.length > 200
                  ? `${content.substring(0, 200)}...`
                  : content;

              // Email-уведомление
              if (parent.notify_reply_to_my_post_email && parent.email) {
                await sendReplyToPostEmail(parent.email, {
                  replierUsername,
                  topicTitle: topicRow?.title || '',
                  postExcerpt: excerpt,
                  topicUrl,
                });
              }

              // Telegram-уведомление
              if (parent.notify_reply_to_my_post_telegram && parent.telegram_chat_id) {
                const chatId = parseInt(String(parent.telegram_chat_id), 10);
                if (!Number.isNaN(chatId)) {
                  const message =
                    `💬 <b>Новый ответ на ваше сообщение</b>\n\n` +
                    `👤 От: <code>${replierUsername}</code>\n` +
                    (topicRow?.title ? `📌 Тема: <b>${topicRow.title}</b>\n` : '') +
                    `🔗 Открыть: ${topicUrl}`;
                  await telegramBotService.sendUserNotification(chatId, message);
                }
              }
            }
          }
        }

        // 2) Ответ в теме, если автор темы другой пользователь
        if (topicRow && topicRow.author_id !== req.userId) {
          const excerpt =
            typeof content === 'string' && content.length > 200
              ? `${content.substring(0, 200)}...`
              : content;

          // Email-уведомление
          if (topicRow.notify_reply_in_my_topic_email && topicRow.topic_author_email) {
            await sendReplyInTopicEmail(topicRow.topic_author_email, {
              replierUsername,
              topicTitle: topicRow.title,
              postExcerpt: excerpt,
              topicUrl,
            });
          }

          // Telegram-уведомление
          if (
            topicRow.notify_reply_in_my_topic_telegram &&
            topicRow.topic_author_telegram_chat_id
          ) {
            const chatId = parseInt(String(topicRow.topic_author_telegram_chat_id), 10);
            if (!Number.isNaN(chatId)) {
              const message =
                `💬 <b>Новый ответ в вашей теме</b>\n\n` +
                `📌 Тема: <b>${topicRow.title}</b>\n` +
                `👤 От: <code>${replierUsername}</code>\n` +
                `🔗 Открыть: ${topicUrl}`;
              await telegramBotService.sendUserNotification(chatId, message);
            }
          }
        }
      } catch (notificationError) {
        console.error('❌ Failed to send post notifications:', notificationError);
      }

      res.status(201).json(createdPost);
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
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
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

// React to post (upvote/downvote)
router.post(
  '/:id/react',
  authenticate,
  [
    body('reaction_type')
      .isIn([1, -1])
      .withMessage('Reaction type must be 1 (upvote) or -1 (downvote)'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const postId = req.params.id;
      const reactionType = parseInt(req.body.reaction_type);

      // Check if post exists
      const postCheck = await pool.query('SELECT id FROM posts WHERE id = $1', [postId]);
      if (postCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Check if reaction_type column exists
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='likes' AND column_name='reaction_type'
      `);
      const hasReactionType = columnCheck.rows.length > 0;

      if (!hasReactionType) {
        return res.status(503).json({ 
          error: 'Система реакций недоступна',
          hint: 'Необходимо выполнить миграцию: npm run migrate-reaction-type в папке backend'
        });
      }

      // Check if user already reacted
      const existingReaction = await pool.query(
        'SELECT id, reaction_type FROM likes WHERE user_id = $1 AND post_id = $2',
        [req.userId, postId]
      );

      if (existingReaction.rows.length > 0) {
        const currentReactionType = existingReaction.rows[0].reaction_type;
        if (currentReactionType === reactionType) {
          // Same reaction - remove it (toggle off)
          await pool.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [
            req.userId,
            postId,
          ]);
          res.json({ reaction_type: null, removed: true });
        } else {
          // Different reaction - update it
          await pool.query(
            'UPDATE likes SET reaction_type = $1 WHERE user_id = $2 AND post_id = $3',
            [reactionType, req.userId, postId]
          );
          res.json({ reaction_type: reactionType, changed: true });
        }
      } else {
        // No reaction - add new one
        await pool.query('INSERT INTO likes (user_id, post_id, reaction_type) VALUES ($1, $2, $3)', [
          req.userId,
          postId,
          reactionType,
        ]);
        res.json({ reaction_type: reactionType, added: true });
      }
    } catch (error) {
      console.error('React to post error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get user's reactions for many posts at once (batch, for Board performance)
router.get('/reactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const postIdsParam = req.query.post_ids;
    if (!postIdsParam || typeof postIdsParam !== 'string') {
      return res.status(400).json({ error: 'post_ids query required (comma-separated)' });
    }
    const postIds = postIdsParam.split(',').map((id) => parseInt(id.trim(), 10)).filter((id) => !isNaN(id));
    if (postIds.length === 0) {
      return res.json({});
    }
    if (postIds.length > 500) {
      return res.status(400).json({ error: 'Max 500 post_ids per request' });
    }

    const columnCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='likes' AND column_name='reaction_type'
    `);
    if (columnCheck.rows.length === 0) {
      const empty: Record<string, number | null> = {};
      postIds.forEach((id) => { empty[String(id)] = null; });
      return res.json(empty);
    }

    const placeholders = postIds.map((_, i) => `$${i + 1}`).join(',');
    const result = await pool.query(
      `SELECT post_id, reaction_type FROM likes WHERE user_id = $${postIds.length + 1} AND post_id IN (${placeholders})`,
      [...postIds, req.userId]
    );
    const map: Record<string, number | null> = {};
    postIds.forEach((id) => { map[String(id)] = null; });
    result.rows.forEach((row: { post_id: number; reaction_type: number }) => {
      map[String(row.post_id)] = row.reaction_type;
    });
    res.json(map);
  } catch (error) {
    console.error('Get reactions batch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's reaction to a post (for frontend to show current state)
router.get('/:id/reaction', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;

    // Check if reaction_type column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='likes' AND column_name='reaction_type'
    `);
    const hasReactionType = columnCheck.rows.length > 0;

    if (!hasReactionType) {
      return res.json({ reaction_type: null });
    }

    const result = await pool.query(
      'SELECT reaction_type FROM likes WHERE user_id = $1 AND post_id = $2',
      [req.userId, postId]
    );

    if (result.rows.length > 0) {
      res.json({ reaction_type: result.rows[0].reaction_type });
    } else {
      res.json({ reaction_type: null });
    }
  } catch (error) {
    console.error('Get reaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
