import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Vote in a poll (single: option_id, multiple: option_ids array)
router.post(
  '/:id/vote',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const pollId = parseInt(req.params.id, 10);
      if (isNaN(pollId)) {
        return res.status(400).json({ error: 'Invalid poll ID' });
      }

      const pollRow = await pool.query(
        'SELECT id, multiple_choice FROM polls WHERE id = $1',
        [pollId]
      );
      if (pollRow.rows.length === 0) {
        return res.status(404).json({ error: 'Poll not found' });
      }

      const poll = pollRow.rows[0];
      const optionId = req.body.option_id != null ? parseInt(req.body.option_id, 10) : null;
      const optionIds = Array.isArray(req.body.option_ids)
        ? req.body.option_ids.map((x: any) => parseInt(String(x), 10)).filter((n: number) => !isNaN(n))
        : null;

      if (poll.multiple_choice) {
        if (!optionIds || optionIds.length === 0) {
          return res.status(400).json({ error: 'Выберите хотя бы один вариант' });
        }
        // Check options belong to this poll
        const opts = await pool.query(
          'SELECT id FROM poll_options WHERE poll_id = $1 AND id = ANY($2::int[])',
          [pollId, optionIds]
        );
        if (opts.rows.length !== optionIds.length) {
          return res.status(400).json({ error: 'Invalid option(s)' });
        }
        await pool.query('DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2', [
          pollId,
          req.userId,
        ]);
        for (const oid of optionIds) {
          await pool.query(
            'INSERT INTO poll_votes (poll_id, user_id, option_id) VALUES ($1, $2, $3)',
            [pollId, req.userId, oid]
          );
        }
      } else {
        if (optionId == null || isNaN(optionId)) {
          return res.status(400).json({ error: 'Выберите вариант' });
        }
        const opt = await pool.query(
          'SELECT id FROM poll_options WHERE poll_id = $1 AND id = $2',
          [pollId, optionId]
        );
        if (opt.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid option' });
        }
        await pool.query('DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2', [
          pollId,
          req.userId,
        ]);
        await pool.query(
          'INSERT INTO poll_votes (poll_id, user_id, option_id) VALUES ($1, $2, $3)',
          [pollId, req.userId, optionId]
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Vote error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
