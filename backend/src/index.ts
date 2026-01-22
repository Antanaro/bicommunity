import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './config/database';
import authRoutes from './routes/auth';
import categoryRoutes from './routes/categories';
import topicRoutes from './routes/topics';
import postRoutes from './routes/posts';
import statsRoutes from './routes/stats';
import uploadRoutes from './routes/upload';
import invitationsRoutes from './routes/invitations';
import { telegramBotService } from './services/telegram-bot';
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

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/invitations', invitationsRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'Database connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ NOT SET!'}`);
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'forum_db'} on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
  
  // Initialize Telegram bot
  await telegramBotService.initialize();
});
