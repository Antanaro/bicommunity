import TelegramBot from 'node-telegram-bot-api';
import { pool } from '../config/database';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

dotenv.config();

class TelegramBotService {
  private bot: TelegramBot | null = null;
  private telegramCategoryId: number | null = null;
  private botUserId: number | null = null;

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

      // Формируем ссылку на исходное сообщение
      let sourceLink = '';
      if (sourceChat && messageId) {
        const chatUsername = sourceChat.username;
        if (chatUsername) {
          // Публичный канал/группа
          sourceLink = `https://t.me/${chatUsername}/${messageId}`;
        } else if (channelId) {
          // Приватный канал/группа
          // Для приватных каналов нужно преобразовать ID
          // Формат: https://t.me/c/CHAT_ID/MESSAGE_ID
          // CHAT_ID для приватных каналов = -100XXXXXXXXXX, нужно убрать -100
          const chatId = Math.abs(channelId as number);
          const privateChatId = chatId.toString().replace(/^-100/, '');
          sourceLink = `https://t.me/c/${privateChatId}/${messageId}`;
        }
      } else if (sourceUser && messageId) {
        // Сообщение от пользователя (редко доступно)
        // Обычно для приватных пересылок ссылка недоступна
      }

      // Формируем заголовок темы
      // Если текст короткий (до 150 символов), используем его как заголовок
      // Иначе используем стандартный заголовок
      let topicTitle: string;
      if (messageText.length <= 150 && messageText.length > 0 && !messageText.startsWith('[')) {
        // Используем текст сообщения как заголовок, обрезая до 200 символов (лимит БД)
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

      // Создаем тему на форуме
      await this.createTopic(topicTitle, topicContent);

      // Отправляем подтверждение пользователю
      if (this.bot && msg.chat.id) {
        await this.bot.sendMessage(
          msg.chat.id,
          `✅ Тема создана на форуме!\n\n📝 Заголовок: ${topicTitle}`
        );
      }
    } catch (error) {
      console.error('❌ Error handling forwarded message:', error);
      
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

  private async createTopic(title: string, content: string) {
    if (!this.telegramCategoryId || !this.botUserId) {
      throw new Error('Telegram category or bot user not initialized');
    }

    try {
      const result = await pool.query(
        'INSERT INTO topics (title, content, author_id, category_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [title, content, this.botUserId, this.telegramCategoryId]
      );

      console.log(`✅ Topic created: ${title} (ID: ${result.rows[0].id})`);
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
