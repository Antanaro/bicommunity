import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { pool } from '../config/database';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/email';
import { createInitialInvitations } from './invitations';

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
    body('email').isEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('invitationCode').trim().notEmpty().withMessage('Invitation code is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, invitationCode } = req.body;

      // Проверяем пригласительный код
      const inviteResult = await pool.query(
        'SELECT id, owner_id, used_by_id FROM invitation_codes WHERE code = $1',
        [invitationCode]
      );

      if (inviteResult.rows.length === 0) {
        return res.status(400).json({ error: 'Недействительный пригласительный код' });
      }

      const invitation = inviteResult.rows[0];

      if (invitation.used_by_id) {
        return res.status(400).json({ error: 'Этот пригласительный код уже использован' });
      }

      // Check if user exists
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (userCheck.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create user with unverified email and invited_by
      const result = await pool.query(
        'INSERT INTO users (username, email, password_hash, email_verified, email_verification_token, invited_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role',
        [username, email, passwordHash, false, verificationToken, invitation.owner_id]
      );

      const user = result.rows[0];

      // Помечаем приглашение как использованное
      await pool.query(
        'UPDATE invitation_codes SET used_by_id = $1, used_at = NOW() WHERE id = $2',
        [user.id, invitation.id]
      );

      // Создаём 3 приглашения для нового пользователя
      await createInitialInvitations(user.id);

      // Send verification email
      try {
        await sendVerificationEmail(user.email, user.username, verificationToken);
      } catch (emailError: any) {
        console.error('Error sending verification email:', emailError);
        // Удаляем пользователя, если не удалось отправить email
        await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
        return res.status(500).json({ 
          error: 'Не удалось отправить письмо подтверждения. Проверьте настройки SMTP в .env файле.'
        });
      }

      // Не выдаем JWT токен, пользователь должен подтвердить email
      res.status(201).json({
        message: 'Регистрация успешна! Пожалуйста, проверьте вашу почту и подтвердите email адрес.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error: any) {
      console.error('Register error:', error);
      console.error('Error stack:', error.stack);
      
      // Более детальная обработка ошибок
      if (error.code === '23505') {
        // Ошибка уникальности (дубликат)
        return res.status(400).json({ error: 'Пользователь с таким именем или email уже существует' });
      }
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(500).json({ error: 'Ошибка подключения к базе данных. Проверьте настройки в .env' });
      }
      
      // Проверка на отсутствие JWT_SECRET
      if (error.message && error.message.includes('secret')) {
        return res.status(500).json({ error: 'Ошибка конфигурации: JWT_SECRET не установлен в .env' });
      }
      
      res.status(500).json({ 
        error: 'Ошибка сервера',
        message: error.message || 'Неизвестная ошибка',
        code: error.code,
        details: process.env.NODE_ENV !== 'production' ? {
          message: error.message,
          code: error.code,
          stack: error.stack
        } : undefined
      });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err: any) => {
          if (err.param === 'email') {
            return 'Пожалуйста, введите корректный email адрес';
          }
          if (err.param === 'password') {
            return 'Пароль обязателен для ввода';
          }
          return err.msg;
        });
        return res.status(400).json({ 
          error: errorMessages.join(', '),
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;

      // Find user
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return res.status(401).json({ 
          error: 'Пользователь с таким email не найден',
          hint: 'Проверьте правильность email или зарегистрируйтесь, если у вас нет аккаунта'
        });
      }

      const user = result.rows[0];

      // Check if email is verified
      if (!user.email_verified) {
        return res.status(403).json({ 
          error: 'Email не подтвержден',
          hint: 'Пожалуйста, подтвердите ваш email адрес. Проверьте почту для письма с подтверждением или запросите новое письмо.',
          emailNotVerified: true
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({ 
          error: 'Неверный пароль',
          hint: 'Проверьте правильность введенного пароля. Если вы забыли пароль, обратитесь к администратору'
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error stack:', error.stack);
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(500).json({ error: 'Ошибка подключения к базе данных. Проверьте настройки в .env' });
      }
      
      res.status(500).json({ 
        error: 'Ошибка сервера',
        message: error.message || 'Неизвестная ошибка',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }
);

// Forgot Password - запрос на сброс пароля
router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Invalid email'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Пожалуйста, введите корректный email адрес',
          errors: errors.array() 
        });
      }

      const { email } = req.body;

      // Найти пользователя
      const userResult = await pool.query('SELECT id, email, username FROM users WHERE email = $1', [email]);

      // Для безопасности всегда возвращаем успешный ответ, даже если пользователь не найден
      // Это предотвращает перебор email адресов
      if (userResult.rows.length === 0) {
        return res.json({ 
          message: 'Если пользователь с таким email существует, на него будет отправлено письмо с инструкциями по сбросу пароля'
        });
      }

      const user = userResult.rows[0];

      // Генерируем токен сброса пароля
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Токен действителен 1 час

      // Сохраняем токен в базу данных
      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, resetToken, expiresAt]
      );

      // Отправляем email
      try {
        await sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError: any) {
        console.error('Error sending password reset email:', emailError);
        // Удаляем токен, если не удалось отправить email
        await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [resetToken]);
        
        return res.status(500).json({ 
          error: 'Не удалось отправить email. Проверьте настройки SMTP в .env файле.'
        });
      }

      res.json({ 
        message: 'Если пользователь с таким email существует, на него будет отправлено письмо с инструкциями по сбросу пароля'
      });
    } catch (error: any) {
      console.error('Forgot password error:', error);
      res.status(500).json({ 
        error: 'Ошибка сервера',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }
);

// Verify Email - подтверждение email адреса
router.get(
  '/verify-email',
  async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ 
          error: 'Токен подтверждения не предоставлен'
        });
      }

      // Найти пользователя с этим токеном
      const userResult = await pool.query(
        'SELECT id, username, email, email_verified, role FROM users WHERE email_verification_token = $1',
        [token]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Недействительный токен подтверждения'
        });
      }

      const user = userResult.rows[0];

      // Проверяем, не подтвержден ли уже email
      if (user.email_verified) {
        // Если email уже подтвержден, все равно выдаем токен и перенаправляем
        const jwtToken = jwt.sign(
          { userId: user.id, role: user.role || 'user' },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '7d' }
        );
        
        // Проверяем тип запроса
        const acceptHeader = req.headers.accept || '';
        const isApiRequest = acceptHeader.includes('application/json') || req.headers['x-requested-with'] === 'XMLHttpRequest';
        
        if (isApiRequest) {
          return res.json({
            success: true,
            token: jwtToken,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role || 'user',
            },
            alreadyVerified: true,
          });
        } else {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          return res.redirect(`${frontendUrl}/verify-email?success=true&token=${jwtToken}&alreadyVerified=true`);
        }
      }

      // Подтверждаем email
      await pool.query(
        'UPDATE users SET email_verified = TRUE, email_verification_token = NULL WHERE id = $1',
        [user.id]
      );

      // Генерируем JWT токен для автоматического входа
      const jwtToken = jwt.sign(
        { userId: user.id, role: user.role || 'user' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      // Проверяем, откуда пришел запрос (браузер или API клиент)
      const acceptHeader = req.headers.accept || '';
      const isApiRequest = acceptHeader.includes('application/json') || req.headers['x-requested-with'] === 'XMLHttpRequest';

      if (isApiRequest) {
        // Если это API запрос (от frontend), возвращаем JSON
        res.json({
          success: true,
          token: jwtToken,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
          },
        });
      } else {
        // Если это прямой переход по ссылке, делаем редирект
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/verify-email?success=true&token=${jwtToken}`);
      }
    } catch (error: any) {
      console.error('Verify email error:', error);
      
      // Проверяем тип запроса для ошибок тоже
      const acceptHeader = req.headers.accept || '';
      const isApiRequest = acceptHeader.includes('application/json') || req.headers['x-requested-with'] === 'XMLHttpRequest';
      
      if (isApiRequest) {
        res.status(error.message?.includes('Недействительный') ? 400 : 500).json({ 
          error: error.message || 'Ошибка сервера',
          message: error.message || 'Неизвестная ошибка'
        });
      } else {
        // Для прямых переходов редиректим на frontend с ошибкой
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const errorMessage = encodeURIComponent(error.message || 'Ошибка подтверждения email');
        res.redirect(`${frontendUrl}/verify-email?error=${errorMessage}`);
      }
    }
  }
);

// Resend Verification Email - повторная отправка письма подтверждения
router.post(
  '/resend-verification',
  [
    body('email').isEmail().withMessage('Invalid email'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Пожалуйста, введите корректный email адрес',
          errors: errors.array() 
        });
      }

      const { email } = req.body;

      // Найти пользователя
      const userResult = await pool.query(
        'SELECT id, username, email, email_verified FROM users WHERE email = $1',
        [email]
      );

      // Для безопасности всегда возвращаем успешный ответ
      if (userResult.rows.length === 0) {
        return res.json({ 
          message: 'Если пользователь с таким email существует и email не подтвержден, на него будет отправлено письмо с подтверждением'
        });
      }

      const user = userResult.rows[0];

      // Если email уже подтвержден
      if (user.email_verified) {
        return res.json({ 
          message: 'Email уже подтвержден'
        });
      }

      // Генерируем новый токен
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Обновляем токен в базе данных
      await pool.query(
        'UPDATE users SET email_verification_token = $1 WHERE id = $2',
        [verificationToken, user.id]
      );

      // Отправляем email
      try {
        await sendVerificationEmail(user.email, user.username, verificationToken);
      } catch (emailError: any) {
        console.error('Error sending verification email:', emailError);
        return res.status(500).json({ 
          error: 'Не удалось отправить email. Проверьте настройки SMTP в .env файле.'
        });
      }

      res.json({ 
        message: 'Если пользователь с таким email существует и email не подтвержден, на него будет отправлено письмо с подтверждением'
      });
    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({ 
        error: 'Ошибка сервера',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }
);

// Reset Password - сброс пароля с токеном
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err: any) => {
          if (err.param === 'token') {
            return 'Токен обязателен для сброса пароля';
          }
          if (err.param === 'password') {
            return 'Пароль должен содержать минимум 6 символов';
          }
          return err.msg;
        });
        return res.status(400).json({ 
          error: errorMessages.join(', '),
          errors: errors.array() 
        });
      }

      const { token, password } = req.body;

      // Найти токен в базе данных
      const tokenResult = await pool.query(
        `SELECT prt.*, u.id as user_id, u.email 
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token = $1 AND prt.used = FALSE`,
        [token]
      );

      if (tokenResult.rows.length === 0) {
        return res.status(400).json({ 
          error: 'Недействительный или уже использованный токен сброса пароля'
        });
      }

      const resetToken = tokenResult.rows[0];

      // Проверяем, не истек ли токен
      if (new Date() > new Date(resetToken.expires_at)) {
        // Помечаем токен как использованный
        await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);
        return res.status(400).json({ 
          error: 'Токен сброса пароля истек. Пожалуйста, запросите новый.'
        });
      }

      // Хешируем новый пароль
      const passwordHash = await bcrypt.hash(password, 10);

      // Обновляем пароль пользователя
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, resetToken.user_id]
      );

      // Помечаем токен как использованный
      await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

      // Удаляем все другие активные токены для этого пользователя
      await pool.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
        [resetToken.user_id]
      );

      res.json({ 
        message: 'Пароль успешно изменен. Теперь вы можете войти с новым паролем.'
      });
    } catch (error: any) {
      console.error('Reset password error:', error);
      res.status(500).json({ 
        error: 'Ошибка сервера',
        message: error.message || 'Неизвестная ошибка'
      });
    }
  }
);

export default router;
