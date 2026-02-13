import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { pool } from '../config/database';
import { authenticate, isAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
        COUNT(DISTINCT t.id) as topic_count, 
        COUNT(p.id)::INTEGER as post_count 
      FROM categories c 
      LEFT JOIN topics t ON c.id = t.category_id 
      LEFT JOIN posts p ON t.id = p.topic_id 
      GROUP BY c.id 
      ORDER BY c.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single category
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category (admin only)
router.post(
  '/',
  authenticate,
  isAdmin,
  [
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name is required'),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;

      const result = await pool.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
        [name, description || null]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update category (admin only)
router.put(
  '/:id',
  authenticate,
  isAdmin,
  [
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`);
        values.push(description);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(req.params.id);
      const result = await pool.query(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete category (admin only)
router.delete('/:id', authenticate, isAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
