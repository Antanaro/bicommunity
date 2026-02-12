import TelegramBot from 'node-telegram-bot-api';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';
import { pool } from '../config/database';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load .env from project root
// In dev: __dirname = backend/src/services, path = ../../../.env = root/.env
// In prod: __dirname = backend/dist/services, path = ../../../.env = root/.env
dotenv.config({ path: path.join(__dirname, '../../../.env') });

interface MediaGroupMessage {
  msg: TelegramBot.Message;
  imageUrls: string[];
}

interface ParsedMessage {
  id: number;
  text: string;
  date: Date;
  views?: number;
  mediaPath?: string;
}

class TelegramBotService {
  private bot: TelegramBot | null = null;
  private client: TelegramClient | null = null;
  private telegramCategoryId: number | null = null;
  private botUserId: number | null = null;
  private mediaGroupBuffer: Map<string, MediaGroupMessage[]> = new Map();
  private mediaGroupTimers: Map<string, NodeJS.Timeout> = new Map();
  private isClientInitialized: boolean = false;
  private parsingInProgress: Map<number, boolean> = new Map(); // chatId -> isRunning

  async initialize() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('⚠️  TELEGRAM_BOT_TOKEN not set. Telegram bot will not be initialized.');
      return;
    }

    try {
      this.bot = new TelegramBot(token, { polling: true });
      
      // Инициализация категории и пользователя
      await this.ensureTelegramCategory();
      await this.ensureBotUser();

      // Обработка команд
      this.bot.onText(/\/parse\s+(@?\w+)(?:\s+(\d+))?/, async (msg, match) => {
        await this.handleParseCommand(msg, match);
      });

      this.bot.onText(/\/myid/, async (msg) => {
        if (!this.bot) return;
        try {
          await this.bot.sendMessage(
            msg.chat.id,
            `Ваш chat_id: <code>${msg.chat.id}</code>`,
            { parse_mode: 'HTML' }
          );
        } catch (error) {
          console.error('❌ Error sending /myid response:', error);
        }
      });

      this.bot.onText(/\/stop/, async (msg) => {
        await this.handleStopCommand(msg);
      });

      this.bot.onText(/\/help/, async (msg) => {
        await this.handleHelpCommand(msg);
      });

      this.bot.onText(/\/status/, async (msg) => {
        await this.handleStatusCommand(msg);
      });

      this.bot.onText(/\/get_invite/, async (msg) => {
        await this.handleGetInviteCommand(msg);
      });

      // Обработка форвардированных сообщений
      this.bot.on('message', async (msg: TelegramBot.Message) => {
        // Игнорируем команды
        if (msg.text?.startsWith('/')) return;
        await this.handleMessage(msg);
      });

      // Обработка ошибок
      this.bot.on('error', (error: Error) => {
        console.error('❌ Telegram bot error:', error);
      });

      // Получение информации о боте
      const botInfo = await this.bot.getMe();
      console.log(`✅ Telegram bot initialized: @${botInfo.username}`);
      
      // Проверка настроек уведомлений администратору
      const adminId = process.env.TELEGRAM_ADMIN_ID;
      if (adminId) {
        console.log(`✅ TELEGRAM_ADMIN_ID configured: ${adminId}`);
      } else {
        console.warn('⚠️  TELEGRAM_ADMIN_ID not set. Admin notifications will be disabled.');
      }

      // Попытка инициализации MTProto клиента при старте (не блокирует если не настроен)
      try {
        const mtprotoReady = await this.initializeMTProtoClient();
        if (mtprotoReady) {
          console.log('✅ MTProto client initialized successfully at startup');
        } else {
          console.log('ℹ️  MTProto client not configured (optional feature)');
        }
      } catch (error: any) {
        console.warn('⚠️  MTProto client initialization failed at startup:', error?.message || error);
      }
    } catch (error) {
      console.error('❌ Failed to initialize Telegram bot:', error);
    }
  }

  private async ensureTelegramCategory() {
    try {
      // Проверяем, существует ли категория "Telegram"
      const result = await pool.query(
        "SELECT id FROM categories WHERE name = 'Telegram' LIMIT 1"
      );

      if (result.rows.length > 0) {
        this.telegramCategoryId = result.rows[0].id;
        console.log(`✅ Telegram category found (ID: ${this.telegramCategoryId})`);
      } else {
        // Создаем категорию "Telegram"
        const insertResult = await pool.query(
          "INSERT INTO categories (name, description) VALUES ('Telegram', 'Темы, созданные из Telegram-каналов') RETURNING id"
        );
        this.telegramCategoryId = insertResult.rows[0].id;
        console.log(`✅ Telegram category created (ID: ${this.telegramCategoryId})`);
      }
    } catch (error) {
      console.error('❌ Error ensuring Telegram category:', error);
      throw error;
    }
  }

  private async ensureBotUser() {
    try {
      // Проверяем, существует ли системный пользователь для бота
      const result = await pool.query(
        "SELECT id FROM users WHERE username = 'telegram_bot' LIMIT 1"
      );

      if (result.rows.length > 0) {
        this.botUserId = result.rows[0].id;
        console.log(`✅ Telegram bot user found (ID: ${this.botUserId})`);
      } else {
        // Создаем системного пользователя для бота
        // Используем случайный пароль и email, так как они не будут использоваться
        const randomPassword = randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        
        const insertResult = await pool.query(
          `INSERT INTO users (username, email, password_hash, role) 
           VALUES ('telegram_bot', 'telegram_bot@forum.local', $1, 'user') 
           RETURNING id`,
          [passwordHash]
        );
        this.botUserId = insertResult.rows[0].id;
        console.log(`✅ Telegram bot user created (ID: ${this.botUserId})`);
      }
    } catch (error) {
      console.error('❌ Error ensuring bot user:', error);
      throw error;
    }
  }

  private async handleMessage(msg: TelegramBot.Message) {
    // Обрабатываем только форвардированные сообщения
    if (!msg.forward_from_chat && !msg.forward_from) {
      return;
    }

    // Проверяем, является ли сообщение частью медиа-группы
    if (msg.media_group_id) {
      await this.handleMediaGroupMessage(msg);
      return;
    }

    // Обрабатываем одиночное сообщение
    await this.processSingleMessage(msg);
  }

  private async handleMediaGroupMessage(msg: TelegramBot.Message) {
    const mediaGroupId = msg.media_group_id!;
    
    // Скачиваем изображение из текущего сообщения
    let imageUrls: string[] = [];
    if (msg.photo && msg.photo.length > 0) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      try {
        const imageUrl = await this.downloadAndSaveImage(largestPhoto.file_id);
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
      } catch (error) {
        console.error('❌ Error downloading photo from media group:', error);
      }
    }

    // Добавляем сообщение в буфер
    if (!this.mediaGroupBuffer.has(mediaGroupId)) {
      this.mediaGroupBuffer.set(mediaGroupId, []);
    }
    
    const groupMessages = this.mediaGroupBuffer.get(mediaGroupId)!;
    groupMessages.push({
      msg,
      imageUrls,
    });

    // Сбрасываем таймер для этой группы
    if (this.mediaGroupTimers.has(mediaGroupId)) {
      clearTimeout(this.mediaGroupTimers.get(mediaGroupId)!);
    }

    // Устанавливаем новый таймер (2 секунды ожидания для получения всех сообщений группы)
    const timer = setTimeout(async () => {
      await this.processMediaGroup(mediaGroupId);
    }, 2000);

    this.mediaGroupTimers.set(mediaGroupId, timer);
  }

  private async processMediaGroup(mediaGroupId: string) {
    const groupMessages = this.mediaGroupBuffer.get(mediaGroupId);
    if (!groupMessages || groupMessages.length === 0) {
      return;
    }

    // Берем первое сообщение для получения метаданных
    const firstMsg = groupMessages[0].msg;
    
    try {
      // Собираем все изображения из группы
      const allImageUrls: string[] = [];
      let messageText = '';
      
      for (const groupMsg of groupMessages) {
        allImageUrls.push(...groupMsg.imageUrls);
        // Текст обычно только в первом сообщении группы
        if (!messageText) {
          messageText = groupMsg.msg.text || groupMsg.msg.caption || '';
        }
      }

      // Обрабатываем как обычное сообщение, но с несколькими изображениями
      await this.processMessageWithImages(firstMsg, messageText, allImageUrls);
      
      // Очищаем буфер
      this.mediaGroupBuffer.delete(mediaGroupId);
      if (this.mediaGroupTimers.has(mediaGroupId)) {
        clearTimeout(this.mediaGroupTimers.get(mediaGroupId)!);
        this.mediaGroupTimers.delete(mediaGroupId);
      }
    } catch (error) {
      console.error('❌ Error processing media group:', error);
      // Очищаем буфер даже при ошибке
      this.mediaGroupBuffer.delete(mediaGroupId);
      if (this.mediaGroupTimers.has(mediaGroupId)) {
        clearTimeout(this.mediaGroupTimers.get(mediaGroupId)!);
        this.mediaGroupTimers.delete(mediaGroupId);
      }
    }
  }

  private async processSingleMessage(msg: TelegramBot.Message) {
    // Скачиваем изображение, если есть
    let imageUrls: string[] = [];
    if (msg.photo && msg.photo.length > 0) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      try {
        const imageUrl = await this.downloadAndSaveImage(largestPhoto.file_id);
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
      } catch (error) {
        console.error('❌ Error downloading photo:', error);
      }
    }

    // Получаем текст сообщения
    let messageText = msg.text || msg.caption || '';
    
    // Если текст пустой, пытаемся получить информацию о медиа
    if (!messageText && msg.photo) {
      messageText = '[Фото]';
    } else if (!messageText && msg.video) {
      messageText = '[Видео]';
    } else if (!messageText && msg.document) {
      messageText = `[Документ: ${msg.document.file_name || 'файл'}]`;
    } else if (!messageText && msg.audio) {
      messageText = `[Аудио: ${msg.audio.title || 'файл'}]`;
    } else if (!messageText && msg.sticker) {
      messageText = '[Стикер]';
    }

    if (!messageText) {
      messageText = '[Сообщение без текста]';
    }

    await this.processMessageWithImages(msg, messageText, imageUrls);
  }

  private async processMessageWithImages(
    msg: TelegramBot.Message,
    messageText: string,
    imageUrls: string[]
  ) {
    try {
      // Получаем информацию о канале/чате, откуда было переслано сообщение
      const sourceChat = msg.forward_from_chat;
      const sourceUser = msg.forward_from;
      
      let channelName = 'Unknown';
      let channelId: string | number | undefined;
      let messageId: number | undefined;

      if (sourceChat) {
        // Сообщение переслано из канала/группы
        channelName = sourceChat.title || sourceChat.username || 'Unknown Channel';
        channelId = sourceChat.id;
        messageId = msg.forward_from_message_id;
      } else if (sourceUser) {
        // Сообщение переслано от пользователя
        channelName = sourceUser.first_name + (sourceUser.last_name ? ` ${sourceUser.last_name}` : '');
        if (sourceUser.username) {
          channelName += ` (@${sourceUser.username})`;
        }
        channelId = sourceUser.id;
      }

      // Формируем ссылку на исходное сообщение
      let sourceLink = '';
      if (sourceChat && messageId) {
        const chatUsername = sourceChat.username;
        if (chatUsername) {
          // Публичный канал/группа
          sourceLink = `https://t.me/${chatUsername}/${messageId}`;
        } else if (channelId) {
          // Приватный канал/группа
          const chatId = Math.abs(channelId as number);
          const privateChatId = chatId.toString().replace(/^-100/, '');
          sourceLink = `https://t.me/c/${privateChatId}/${messageId}`;
        }
      }

      // Формируем заголовок темы
      let topicTitle: string;
      if (messageText.length <= 150 && messageText.length > 0 && !messageText.startsWith('[')) {
        topicTitle = messageText.substring(0, 200);
      } else {
        topicTitle = `Из ${channelName}`;
      }
      
      // Формируем содержимое темы
      let topicContent = messageText;
      
      // Добавляем информацию об источнике
      topicContent += `\n\n---\n`;
      topicContent += `**Источник:** ${channelName}\n`;
      if (sourceLink) {
        topicContent += `**Ссылка на сообщение:** [Открыть в Telegram](${sourceLink})\n`;
      }
      if (msg.date) {
        const messageDate = new Date(msg.date * 1000);
        topicContent += `**Дата сообщения:** ${messageDate.toLocaleString('ru-RU')}\n`;
      }

      // Создаем тему на форуме с изображениями
      await this.createTopic(topicTitle, topicContent, imageUrls);

      // Отправляем подтверждение пользователю
      if (this.bot && msg.chat.id) {
        const imageCount = imageUrls.length > 0 ? `\n📷 Изображений: ${imageUrls.length}` : '';
        await this.bot.sendMessage(
          msg.chat.id,
          `✅ Тема создана на форуме!\n\n📝 Заголовок: ${topicTitle}${imageCount}`
        );
      }
    } catch (error) {
      console.error('❌ Error processing message with images:', error);
      
      // Отправляем сообщение об ошибке пользователю
      if (this.bot && msg.chat.id) {
        try {
          await this.bot.sendMessage(
            msg.chat.id,
            '❌ Произошла ошибка при создании темы на форуме. Попробуйте позже.'
          );
        } catch (sendError) {
          console.error('❌ Error sending error message:', sendError);
        }
      }
    }
  }

  private async downloadAndSaveImage(fileId: string): Promise<string | null> {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }

    try {
      // Получаем информацию о файле
      const file = await this.bot.getFile(fileId);
      if (!file.file_path) {
        console.error('❌ File path not available');
        return null;
      }

      // Формируем URL для скачивания файла
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      // Определяем расширение файла
      const ext = path.extname(file.file_path) || '.jpg';
      
      // Создаем уникальное имя файла (как в upload.ts)
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `image-${uniqueSuffix}${ext}`;

      // Путь для сохранения
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, filename);

      // Скачиваем файл
      await this.downloadFile(fileUrl, filePath);

      // Возвращаем URL для сохранения в БД
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('❌ Error downloading image:', error);
      return null;
    }
  }

  private downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);
      https.get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        } else {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`Failed to download file: ${response.statusCode}`));
        }
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(dest)) {
          fs.unlinkSync(dest);
        }
        reject(err);
      });
    });
  }

  private async createTopic(title: string, content: string, images: string[] = []) {
    if (!this.telegramCategoryId || !this.botUserId) {
      throw new Error('Telegram category or bot user not initialized');
    }

    try {
      // Преобразуем массив изображений в формат PostgreSQL
      const imagesArray = images && Array.isArray(images) ? images : [];

      const result = await pool.query(
        'INSERT INTO topics (title, content, author_id, category_id, images) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [title, content, this.botUserId, this.telegramCategoryId, imagesArray]
      );

      const imageInfo = imagesArray.length > 0 ? ` (${imagesArray.length} изображений)` : '';
      console.log(`✅ Topic created: ${title}${imageInfo} (ID: ${result.rows[0].id})`);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating topic:', error);
      throw error;
    }
  }

  // ==================== MTProto Client для парсинга каналов ====================

  private async initializeMTProtoClient(): Promise<boolean> {
    if (this.isClientInitialized && this.client) {
      return true;
    }

    const apiId = process.env.TELEGRAM_API_ID;
    const apiHash = process.env.TELEGRAM_API_HASH;
    const sessionString = process.env.TELEGRAM_SESSION_STRING || '';

    // Debug logging
    console.log('🔍 MTProto initialization check:');
    console.log(`  API_ID: ${apiId ? '✅ Set' : '❌ Not set'}`);
    console.log(`  API_HASH: ${apiHash ? '✅ Set' : '❌ Not set'}`);
    console.log(`  SESSION_STRING: ${sessionString ? '✅ Set (' + sessionString.length + ' chars)' : '❌ Not set'}`);

    if (!apiId || !apiHash) {
      console.warn('⚠️  TELEGRAM_API_ID or TELEGRAM_API_HASH not set. Channel parsing will not be available.');
      return false;
    }

    if (!sessionString) {
      console.warn('⚠️  TELEGRAM_SESSION_STRING not set. You need to authenticate first.');
      console.warn('Run the auth script to get your session string.');
      return false;
    }

    try {
      console.log('🔌 Connecting to Telegram MTProto...');
      const session = new StringSession(sessionString);
      this.client = new TelegramClient(session, parseInt(apiId), apiHash, {
        connectionRetries: 5,
      });

      console.log('⏳ Establishing connection...');
      await this.client.connect();
      console.log('✅ Connected to Telegram MTProto');

      this.isClientInitialized = true;
      console.log('✅ MTProto client initialized for channel parsing');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize MTProto client:', error?.message || error);
      if (error?.stack) {
        console.error('Stack trace:', error.stack);
      }
      return false;
    }
  }

  private async handleHelpCommand(msg: TelegramBot.Message) {
    if (!this.bot) return;

    const helpText = `
📖 **Команды бота:**

**/parse @channel_name [количество]**
Парсит посты из публичного канала.
• @channel_name — username канала (без @)
• количество — сколько постов спарсить (по умолчанию 50, макс. 500)

Примеры:
\`/parse durov 10\` — последние 10 постов из @durov
\`/parse telegram\` — последние 50 постов из @telegram

**/stop**
Остановить текущий парсинг

**/status**
Показать статус парсинга

**/help**
Показать эту справку

**/get_invite** _(только для администратора)_
Получить одну инвайт-ссылку для регистрации на форуме.

📤 **Форвард сообщений:**
Просто перешлите сообщение из любого канала — бот создаст тему на форуме.
`;

    await this.bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
  }

  private async handleStatusCommand(msg: TelegramBot.Message) {
    if (!this.bot) return;

    const isRunning = this.parsingInProgress.get(msg.chat.id);
    const clientReady = this.isClientInitialized;

    let status = '📊 **Статус:**\n\n';
    status += `🤖 Bot API: ✅ Работает\n`;
    status += `🔌 MTProto Client: ${clientReady ? '✅ Подключен' : '❌ Не настроен'}\n`;
    status += `⏳ Парсинг: ${isRunning ? '🔄 В процессе' : '⏸️ Не активен'}\n`;

    if (!clientReady) {
      status += `\n⚠️ Для парсинга каналов нужно настроить:\n`;
      status += `• TELEGRAM_API_ID\n`;
      status += `• TELEGRAM_API_HASH\n`;
      status += `• TELEGRAM_SESSION_STRING\n`;
    }

    await this.bot.sendMessage(msg.chat.id, status, { parse_mode: 'Markdown' });
  }

  private async handleStopCommand(msg: TelegramBot.Message) {
    if (!this.bot) return;

    const wasRunning = this.parsingInProgress.get(msg.chat.id);
    this.parsingInProgress.set(msg.chat.id, false);

    if (wasRunning) {
      await this.bot.sendMessage(msg.chat.id, '⏹️ Парсинг остановлен.');
    } else {
      await this.bot.sendMessage(msg.chat.id, 'ℹ️ Парсинг не был запущен.');
    }
  }

  private async handleGetInviteCommand(msg: TelegramBot.Message) {
    if (!this.bot) return;

    const adminId = process.env.TELEGRAM_ADMIN_ID;
    const chatId = msg.chat.id;

    if (!adminId || String(chatId) !== String(adminId)) {
      await this.bot.sendMessage(chatId, '⛔ Эта команда доступна только администратору.');
      return;
    }

    try {
      const adminResult = await pool.query(
        "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
      );

      if (adminResult.rows.length === 0) {
        await this.bot.sendMessage(chatId, '❌ В базе не найден пользователь с ролью admin.');
        return;
      }

      const ownerId = adminResult.rows[0].id;

      let code: string;
      let attempts = 0;
      do {
        code = randomBytes(4).toString('hex');
        const exists = await pool.query('SELECT id FROM invitation_codes WHERE code = $1', [code]);
        if (exists.rows.length === 0) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        await this.bot.sendMessage(chatId, '❌ Не удалось сгенерировать уникальный код. Попробуйте позже.');
        return;
      }

      await pool.query(
        'INSERT INTO invitation_codes (code, owner_id) VALUES ($1, $2)',
        [code, ownerId]
      );

      const baseUrl = (process.env.FRONTEND_URL || 'https://bicommunity.ru').replace(/\/$/, '');
      const inviteLink = `${baseUrl}/register?invite=${code}`;

      await this.bot.sendMessage(chatId, `✅ Одна инвайт-ссылка:\n\n${inviteLink}`);
    } catch (error: any) {
      console.error('❌ get_invite error:', error);
      await this.bot.sendMessage(chatId, '❌ Ошибка при создании приглашения. Попробуйте позже.');
    }
  }

  private async handleParseCommand(msg: TelegramBot.Message, match: RegExpExecArray | null) {
    if (!this.bot || !match) return;

    const chatId = msg.chat.id;
    
    // Проверяем, не запущен ли уже парсинг
    if (this.parsingInProgress.get(chatId)) {
      await this.bot.sendMessage(chatId, '⚠️ Парсинг уже запущен. Используйте /stop чтобы остановить.');
      return;
    }

    // Инициализируем MTProto клиент
    const clientReady = await this.initializeMTProtoClient();
    if (!clientReady) {
      await this.bot.sendMessage(chatId, 
        '❌ MTProto клиент не настроен.\n\n' +
        'Для парсинга каналов нужно добавить в .env:\n' +
        '• TELEGRAM_API_ID\n' +
        '• TELEGRAM_API_HASH\n' +
        '• TELEGRAM_SESSION_STRING\n\n' +
        'Получить API ID/Hash: https://my.telegram.org\n' +
        'Запустите скрипт авторизации для получения session string.'
      );
      return;
    }

    const channelUsername = match[1].replace('@', '');
    const limit = Math.min(parseInt(match[2] || '50'), 500);

    await this.bot.sendMessage(chatId, 
      `🔍 Начинаю парсинг канала @${channelUsername}...\n` +
      `📊 Количество постов: ${limit}\n\n` +
      `Используйте /stop чтобы остановить.`
    );

    // Запускаем парсинг
    this.parsingInProgress.set(chatId, true);
    await this.parseChannel(chatId, channelUsername, limit);
  }

  private async parseChannel(chatId: number, channelUsername: string, limit: number) {
    if (!this.client || !this.bot) return;

    let processed = 0;
    let created = 0;
    let errors = 0;

    try {
      // Получаем информацию о канале
      const entity = await this.client.getEntity(channelUsername);
      const channelTitle = 'title' in entity ? entity.title : channelUsername;

      console.log(`📥 Parsing channel: ${channelTitle} (@${channelUsername}), limit: ${limit}`);

      // Получаем сообщения
      const messages = await this.client.getMessages(channelUsername, {
        limit: limit,
      });

      const totalMessages = messages.length;
      await this.bot.sendMessage(chatId, `📨 Найдено ${totalMessages} сообщений. Обрабатываю...`);

      // Обрабатываем сообщения
      for (const message of messages) {
        // Проверяем, не остановлен ли парсинг
        if (!this.parsingInProgress.get(chatId)) {
          await this.bot.sendMessage(chatId, 
            `⏹️ Парсинг остановлен.\n\n` +
            `📊 Обработано: ${processed}/${totalMessages}\n` +
            `✅ Создано тем: ${created}\n` +
            `❌ Ошибок: ${errors}`
          );
          return;
        }

        processed++;

        // Пропускаем служебные сообщения без текста и медиа
        if (!message.message && !message.media) {
          continue;
        }

        try {
          // Формируем данные для темы
          const messageText = message.message || '';
          const messageDate = message.date ? new Date(message.date * 1000) : new Date();
          const messageId = message.id;
          
          // Скачиваем медиа если есть
          let imageUrls: string[] = [];
          if (message.media) {
            const imageUrl = await this.downloadMediaFromMessage(message);
            if (imageUrl) {
              imageUrls.push(imageUrl);
            }
          }

          // Пропускаем пустые сообщения
          if (!messageText && imageUrls.length === 0) {
            continue;
          }

          // Формируем заголовок
          let topicTitle: string;
          if (messageText.length > 0 && messageText.length <= 150 && !messageText.startsWith('[')) {
            topicTitle = messageText.substring(0, 200);
          } else if (messageText.length > 150) {
            topicTitle = messageText.substring(0, 100) + '...';
          } else {
            topicTitle = `Из @${channelUsername}`;
          }

          // Формируем контент
          let topicContent = messageText || '[Медиа контент]';
          
          // Добавляем ссылку на оригинал
          const sourceLink = `https://t.me/${channelUsername}/${messageId}`;
          topicContent += `\n\n---\n`;
          topicContent += `**Источник:** ${channelTitle} (@${channelUsername})\n`;
          topicContent += `**Ссылка:** [Открыть в Telegram](${sourceLink})\n`;
          topicContent += `**Дата:** ${messageDate.toLocaleString('ru-RU')}\n`;
          if (message.views) {
            topicContent += `**Просмотры:** ${message.views.toLocaleString('ru-RU')}\n`;
          }

          // Создаём тему
          await this.createTopic(topicTitle, topicContent, imageUrls);
          created++;

          // Отправляем прогресс каждые 10 сообщений
          if (processed % 10 === 0) {
            await this.bot.sendMessage(chatId, 
              `⏳ Прогресс: ${processed}/${totalMessages} (${Math.round(processed/totalMessages*100)}%)\n` +
              `✅ Создано тем: ${created}`
            );
          }

          // Небольшая задержка чтобы не перегружать API
          await this.sleep(100);

        } catch (error) {
          console.error(`❌ Error processing message ${message.id}:`, error);
          errors++;
        }
      }

      // Итоговое сообщение
      this.parsingInProgress.set(chatId, false);
      await this.bot.sendMessage(chatId, 
        `✅ Парсинг завершён!\n\n` +
        `📊 Канал: ${channelTitle} (@${channelUsername})\n` +
        `📨 Обработано сообщений: ${processed}\n` +
        `✅ Создано тем: ${created}\n` +
        `❌ Ошибок: ${errors}`
      );

    } catch (error: any) {
      this.parsingInProgress.set(chatId, false);
      console.error('❌ Error parsing channel:', error);
      
      let errorMessage = '❌ Ошибка при парсинге канала.\n\n';
      
      if (error.message?.includes('Could not find the input entity')) {
        errorMessage += `Канал @${channelUsername} не найден.\nПроверьте правильность username.`;
      } else if (error.message?.includes('CHANNEL_PRIVATE')) {
        errorMessage += `Канал @${channelUsername} приватный.\nПарсинг доступен только для публичных каналов.`;
      } else {
        errorMessage += `Ошибка: ${error.message || 'Неизвестная ошибка'}`;
      }

      await this.bot.sendMessage(chatId, errorMessage);
    }
  }

  private async downloadMediaFromMessage(message: Api.Message): Promise<string | null> {
    if (!this.client || !message.media) return null;

    try {
      // Проверяем тип медиа
      if (message.media instanceof Api.MessageMediaPhoto) {
        // Скачиваем фото
        const buffer = await this.client.downloadMedia(message.media, {});
        if (buffer) {
          return await this.saveBufferAsImage(buffer as Buffer);
        }
      } else if (message.media instanceof Api.MessageMediaDocument) {
        // Проверяем, является ли документ изображением
        const doc = message.media.document;
        if (doc instanceof Api.Document) {
          const mimeType = doc.mimeType;
          if (mimeType?.startsWith('image/')) {
            const buffer = await this.client.downloadMedia(message.media, {});
            if (buffer) {
              const ext = mimeType.split('/')[1] || 'jpg';
              return await this.saveBufferAsImage(buffer as Buffer, ext);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error downloading media:', error);
    }

    return null;
  }

  private async saveBufferAsImage(buffer: Buffer, ext: string = 'jpg'): Promise<string> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `image-${uniqueSuffix}.${ext}`;

    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);

    return `/uploads/${filename}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== Уведомления администратору ====================

  /**
   * Отправляет уведомление администратору в Telegram
   * @param message Текст сообщения для отправки
   */
  async sendAdminNotification(message: string): Promise<void> {
    console.log('🔔 sendAdminNotification called');
    
    if (!this.bot) {
      console.warn('⚠️  Telegram bot not initialized. Cannot send admin notification.');
      return;
    }

    const adminId = process.env.TELEGRAM_ADMIN_ID;
    console.log(`🔍 TELEGRAM_ADMIN_ID from env: ${adminId ? `"${adminId}"` : 'NOT SET'}`);
    
    if (!adminId) {
      console.warn('⚠️  TELEGRAM_ADMIN_ID not set. Admin notifications disabled.');
      console.log('💡 Available env vars:', Object.keys(process.env).filter(k => k.includes('TELEGRAM')).join(', '));
      return;
    }

    try {
      const adminChatId = parseInt(adminId.trim(), 10);
      if (isNaN(adminChatId)) {
        console.error(`❌ Invalid TELEGRAM_ADMIN_ID format: "${adminId}". Must be a number.`);
        return;
      }

      console.log(`📤 Sending notification to chat_id: ${adminChatId}`);
      console.log(`📝 Message preview: ${message.substring(0, 50)}...`);
      
      await this.bot.sendMessage(adminChatId, message, { parse_mode: 'HTML' });
      console.log('✅ Admin notification sent successfully to chat_id:', adminChatId);
    } catch (error: any) {
      console.error('❌ Error sending admin notification:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.body
      });
      // Не выбрасываем ошибку, чтобы не нарушать основной функционал
    }
  }

  /**
   * Отправляет личное уведомление пользователю по его chat_id
   * @param chatId chat_id пользователя (из Telegram)
   * @param message Текст сообщения
   */
  async sendUserNotification(chatId: number, message: string): Promise<void> {
    if (!this.bot) {
      console.warn('⚠️  Telegram bot not initialized. Cannot send user notification.');
      return;
    }

    if (!chatId || Number.isNaN(chatId)) {
      console.warn('⚠️  Invalid chatId passed to sendUserNotification:', chatId);
      return;
    }

    try {
      await this.bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
    } catch (error: any) {
      console.error('❌ Error sending user notification:', error);
    }
  }

  // ==================== Завершение работы ====================

  async stop() {
    if (this.bot) {
      await this.bot.stopPolling();
      console.log('✅ Telegram bot stopped');
    }
    if (this.client) {
      await this.client.disconnect();
      console.log('✅ MTProto client disconnected');
    }
  }
}

export const telegramBotService = new TelegramBotService();
