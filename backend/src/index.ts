import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { pool } from './config/database';
import { getJwtSecret } from './config/env';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import topicRoutes from './routes/topics';
import postRoutes from './routes/posts';
import pollsRoutes from './routes/polls';
import statsRoutes from './routes/stats';
import uploadRoutes from './routes/upload';
import invitationsRoutes from './routes/invitations';
import settingsRoutes from './routes/settings';
import { telegramBotService } from './services/telegram-bot';
import { addForumSettings } from './migrations/add-forum-settings';
import { initSchemaCache } from './config/schema-cache';
import path from 'path';

// Load .env from project root
// In dev: __dirname = backend/src, path = ../../.env = root/.env
// In prod: __dirname = backend/dist, path = ../../.env = root/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : process.env.NODE_ENV === 'production'
    ? ['https://bicommunity.ru', 'https://www.bicommunity.ru']
    : true, // В development разрешаем все источники
  credentials: true,
  optionsSuccessStatus: 200
};

// Rate limiting: общий лимит и строгий для auth
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 300, // 300 запросов с одного IP
  message: { error: 'Слишком много запросов, попробуйте позже' },
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // login, register, forgot-password — ограниченно
  message: { error: 'Слишком много попыток авторизации, попробуйте через 15 минут' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/polls', pollsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/settings', settingsRoutes);

// Sitemap для SEO
app.get('/api/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = (process.env.FRONTEND_URL || 'https://bicommunity.ru').replace(/\/$/, '');
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const urls: string[] = [];
    urls.push(`  <url><loc>${baseUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);
    urls.push(`  <url><loc>${baseUrl}/board</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>`);
    urls.push(`  <url><loc>${baseUrl}/categories</loc><changefreq>daily</changefreq><priority>0.9</priority></url>`);
    urls.push(`  <url><loc>${baseUrl}/about</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`);

    urls.push(`  <url><loc>${baseUrl}/category/all-topics</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);
    const catResult = await pool.query('SELECT id, name FROM categories WHERE name != \'Все темы\' ORDER BY id');
    for (const row of catResult.rows) {
      urls.push(`  <url><loc>${baseUrl}/category/${row.id}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);
    }

    const topicsResult = await pool.query(
      'SELECT id, created_at FROM topics ORDER BY created_at DESC LIMIT 5000'
    );
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    for (const row of topicsResult.rows) {
      const lastmod = row.created_at ? formatDate(new Date(row.created_at)) : formatDate(new Date());
      const changefreq = new Date(row.created_at) > weekAgo ? 'daily' : 'weekly';
      urls.push(`  <url><loc>${baseUrl}/topic/${row.id}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>0.7</priority></url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('<?xml version="1.0"?><error>Sitemap generation failed</error>');
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'Database connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Test admin notification endpoint — только в development, только для авторизованных админов
// В production эндпоинт не регистрируется

// Чтобы падение Telegram-бота не ронило весь процесс
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason instanceof Error ? reason.message : reason);
});

// Run forum_settings migration then start server
(async () => {
  try {
    getJwtSecret(); // Fail immediately if JWT_SECRET not set
  } catch (e) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', (e as Error).message);
    process.exit(1);
  }
  try {
    await addForumSettings();
  } catch (e) {
    console.warn('Forum settings migration:', (e as Error).message);
  }
  try {
    await initSchemaCache();
  } catch (e) {
    console.warn('Schema cache init:', (e as Error).message);
  }
  app.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 JWT Secret: ✅ Set`);
    console.log(`🗄️  Database: ${process.env.DB_NAME || 'forum_db'} on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
    try {
      await telegramBotService.initialize();
    } catch (e) {
      console.error('Telegram bot failed to start:', (e as Error).message);
    }
  });
})();
