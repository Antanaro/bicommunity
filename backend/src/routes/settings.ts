import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticate, isAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// GET /api/settings/about — публично, текст «О форуме»
router.get('/about', async (_, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT value FROM forum_settings WHERE key = 'about'"
    );
    const content = result.rows[0]?.value ?? '';
    res.json({ content });
  } catch (error) {
    console.error('Get about error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/settings/about — только админ, обновить текст
router.put(
  '/about',
  authenticate,
  isAdmin,
  [body('content').isString()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { content } = req.body;
      await pool.query(
        `INSERT INTO forum_settings (key, value, updated_at) VALUES ('about', $1, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP`,
        [String(content)]
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Update about error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
