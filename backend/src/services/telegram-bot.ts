import TelegramBot from 'node-telegram-bot-api';
import { pool } from '../config/database';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import https from 'https';

dotenv.config();

interface MediaGroupMessage {
  msg: TelegramBot.Message;
  imageUrls: string[];
}

class TelegramBotService {
  private bot: TelegramBot | null = null;
  private telegramCategoryId: number | null = null;
  private botUserId: number | null = null;
  private mediaGroupBuffer: Map<string, MediaGroupMessage[]> = new Map();
  private mediaGroupTimers: Map<string, NodeJS.Timeout> = new Map();

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

      // Обработка форвардированных сообщений
      this.bot.on('message', async (msg: TelegramBot.Message) => {
        await this.handleMessage(msg);
      });

      // Обработка ошибок
      this.bot.on('error', (error: Error) => {
        console.error('❌ Telegram bot error:', error);
      });

      // Получение информации о боте
      const botInfo = await this.bot.getMe();
      console.log(`✅ Telegram bot initialized: @${botInfo.username}`);
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

  async stop() {
    if (this.bot) {
      await this.bot.stopPolling();
      console.log('✅ Telegram bot stopped');
    }
  }
}

export const telegramBotService = new TelegramBotService();
