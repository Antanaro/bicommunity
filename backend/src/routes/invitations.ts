import express, { Response } from 'express';
import crypto from 'crypto';
import { pool } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

const MAX_INVITATIONS_PER_USER = 3;

// Генерация короткого кода (8 символов)
const generateInviteCode = (): string => {
  return crypto.randomBytes(4).toString('hex');
};

// Получить свои приглашения
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        ic.id,
        ic.code,
        ic.created_at,
        ic.used_at,
        ic.used_by_id,
        u.username as used_by_username
      FROM invitation_codes ic
      LEFT JOIN users u ON ic.used_by_id = u.id
      WHERE ic.owner_id = $1
      ORDER BY ic.created_at DESC`,
      [userId]
    );

    const invitations = result.rows;
    const availableCount = invitations.filter((inv: any) => !inv.used_by_id).length;
    const usedCount = invitations.filter((inv: any) => inv.used_by_id).length;

    res.json({
      invitations,
      stats: {
        total: invitations.length,
        available: availableCount,
        used: usedCount,
        canCreate: invitations.length < MAX_INVITATIONS_PER_USER
      }
    });
  } catch (error: any) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новое приглашение (если есть лимит)
router.post('/create', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    // Проверяем количество существующих приглашений
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM invitation_codes WHERE owner_id = $1',
      [userId]
    );

    const currentCount = parseInt(countResult.rows[0].count);

    if (currentCount >= MAX_INVITATIONS_PER_USER) {
      return res.status(400).json({ 
        error: `Вы уже создали максимальное количество приглашений (${MAX_INVITATIONS_PER_USER})` 
      });
    }

    // Генерируем уникальный код
    let code: string;
    let attempts = 0;
    do {
      code = generateInviteCode();
      const exists = await pool.query('SELECT id FROM invitation_codes WHERE code = $1', [code]);
      if (exists.rows.length === 0) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({ error: 'Не удалось сгенерировать уникальный код' });
    }

    // Создаём приглашение
    const result = await pool.query(
      'INSERT INTO invitation_codes (code, owner_id) VALUES ($1, $2) RETURNING id, code, created_at',
      [code, userId]
    );

    res.status(201).json({
      invitation: result.rows[0],
      remaining: MAX_INVITATIONS_PER_USER - currentCount - 1
    });
  } catch (error: any) {
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Проверить валидность кода (публичный эндпоинт)
router.get('/validate/:code', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      `SELECT 
        ic.id,
        ic.code,
        ic.used_by_id,
        u.username as owner_username
      FROM invitation_codes ic
      JOIN users u ON ic.owner_id = u.id
      WHERE ic.code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Приглашение не найдено' 
      });
    }

    const invitation = result.rows[0];

    if (invitation.used_by_id) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Это приглашение уже использовано' 
      });
    }

    res.json({
      valid: true,
      invitedBy: invitation.owner_username
    });
  } catch (error: any) {
    console.error('Validate invitation error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать начальные приглашения для пользователя (внутренняя функция)
export const createInitialInvitations = async (userId: number): Promise<void> => {
  try {
    for (let i = 0; i < MAX_INVITATIONS_PER_USER; i++) {
      let code: string;
      let attempts = 0;
      do {
        code = generateInviteCode();
        const exists = await pool.query('SELECT id FROM invitation_codes WHERE code = $1', [code]);
        if (exists.rows.length === 0) break;
        attempts++;
      } while (attempts < 10);

      if (attempts < 10) {
        await pool.query(
          'INSERT INTO invitation_codes (code, owner_id) VALUES ($1, $2)',
          [code, userId]
        );
      }
    }
  } catch (error) {
    console.error('Error creating initial invitations:', error);
  }
};

export default router;
