import nodemailer from 'nodemailer';

// Создание транспорта для отправки email
const createTransporter = () => {
  // Проверяем наличие обязательных настроек SMTP
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error(
      'SMTP настройки не найдены. Пожалуйста, настройте SMTP_HOST, SMTP_USER и SMTP_PASSWORD в .env файле. ' +
      'Подробнее см. backend/PASSWORD-RESET-SETUP.md'
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true для 465, false для других портов
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export const sendVerificationEmail = async (email: string, username: string, verificationToken: string) => {
  try {
    const transporter = createTransporter();
    
    // URL для подтверждения email - ведет на backend, который делает редирект
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const verificationUrl = `${backendUrl}/api/auth/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@forum.com',
      to: email,
      subject: 'Подтверждение email - Форум',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #2196F3;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #2196F3;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #1976D2;
            }
            .token {
              background-color: #e8e8e8;
              padding: 10px;
              border-radius: 5px;
              font-family: monospace;
              word-break: break-all;
              margin: 10px 0;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Подтверждение email</h1>
            </div>
            <div class="content">
              <p>Здравствуйте, ${username}!</p>
              <p>Спасибо за регистрацию на нашем форуме!</p>
              <p>Для завершения регистрации и активации вашего аккаунта, пожалуйста, подтвердите ваш email адрес, нажав на кнопку ниже:</p>
              <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Подтвердить email</a>
              </p>
              <p>Или скопируйте и вставьте следующую ссылку в браузер:</p>
              <div class="token">${verificationUrl}</div>
              <p><strong>Важно:</strong> Эта ссылка действительна в течение 24 часов.</p>
              <p>Если вы не регистрировались на нашем форуме, просто проигнорируйте это письмо.</p>
              <div class="footer">
                <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Подтверждение email - Форум

Здравствуйте, ${username}!

Спасибо за регистрацию на нашем форуме!

Для завершения регистрации и активации вашего аккаунта, пожалуйста, подтвердите ваш email адрес, перейдя по следующей ссылке:
${verificationUrl}

Важно: Эта ссылка действительна в течение 24 часов.

Если вы не регистрировались на нашем форуме, просто проигнорируйте это письмо.

Это автоматическое письмо, пожалуйста, не отвечайте на него.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Verification email sent to:', email);
    
    return info;
  } catch (error: any) {
    console.error('Error sending verification email:', error);
    throw new Error('Не удалось отправить email. Проверьте настройки SMTP.');
  }
};

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  try {
    const transporter = createTransporter();
    
    // URL для сброса пароля (настройте под ваш frontend)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@forum.com',
      to: email,
      subject: 'Сброс пароля - Форум',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #45a049;
            }
            .token {
              background-color: #e8e8e8;
              padding: 10px;
              border-radius: 5px;
              font-family: monospace;
              word-break: break-all;
              margin: 10px 0;
            }
            .footer {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Сброс пароля</h1>
            </div>
            <div class="content">
              <p>Здравствуйте!</p>
              <p>Вы запросили сброс пароля для вашего аккаунта на форуме.</p>
              <p>Для сброса пароля нажмите на кнопку ниже:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Сбросить пароль</a>
              </p>
              <p>Или скопируйте и вставьте следующую ссылку в браузер:</p>
              <div class="token">${resetUrl}</div>
              <p><strong>Важно:</strong> Эта ссылка действительна в течение 1 часа.</p>
              <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
              <div class="footer">
                <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Сброс пароля - Форум

Здравствуйте!

Вы запросили сброс пароля для вашего аккаунта на форуме.

Для сброса пароля перейдите по следующей ссылке:
${resetUrl}

Важно: Эта ссылка действительна в течение 1 часа.

Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.

Это автоматическое письмо, пожалуйста, не отвечайте на него.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Password reset email sent to:', email);
    
    return info;
  } catch (error: any) {
    console.error('Error sending email:', error);
    throw new Error('Не удалось отправить email. Проверьте настройки SMTP.');
  }
};

// ============ Форумные уведомления ============

export const sendReplyToPostEmail = async (
  email: string,
  data: { replierUsername: string; topicTitle: string; postExcerpt: string; topicUrl: string }
) => {
  try {
    const transporter = createTransporter();

    const subject = 'Новый ответ на ваше сообщение — Форум';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <h2>Новый ответ на ваше сообщение</h2>
          <p>Пользователь <strong>${data.replierUsername}</strong> ответил на ваше сообщение в теме <strong>"${data.topicTitle}"</strong>.</p>
          <p><em>${data.postExcerpt}</em></p>
          <p>
            <a href="${data.topicUrl}" style="display:inline-block;padding:10px 20px;background:#2196F3;color:#fff;text-decoration:none;border-radius:4px;">
              Перейти к обсуждению
            </a>
          </p>
          <p style="font-size:12px;color:#777;">Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Новый ответ на ваше сообщение — Форум

Пользователь ${data.replierUsername} ответил на ваше сообщение в теме "${data.topicTitle}".

${data.postExcerpt}

Перейти к обсуждению: ${data.topicUrl}
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@forum.com',
      to: email,
      subject,
      html,
      text,
    });
  } catch (error: any) {
    console.error('Error sending reply-to-post email:', error);
  }
};

export const sendReplyInTopicEmail = async (
  email: string,
  data: { replierUsername: string; topicTitle: string; postExcerpt: string; topicUrl: string }
) => {
  try {
    const transporter = createTransporter();

    const subject = 'Новый ответ в вашей теме — Форум';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <h2>Новый ответ в вашей теме</h2>
          <p>В вашей теме <strong>"${data.topicTitle}"</strong> оставлен новый ответ от пользователя <strong>${data.replierUsername}</strong>.</p>
          <p><em>${data.postExcerpt}</em></p>
          <p>
            <a href="${data.topicUrl}" style="display:inline-block;padding:10px 20px;background:#2196F3;color:#fff;text-decoration:none;border-radius:4px;">
              Перейти к теме
            </a>
          </p>
          <p style="font-size:12px;color:#777;">Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Новый ответ в вашей теме — Форум

В вашей теме "${data.topicTitle}" оставлен новый ответ от пользователя ${data.replierUsername}.

${data.postExcerpt}

Перейти к теме: ${data.topicUrl}
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@forum.com',
      to: email,
      subject,
      html,
      text,
    });
  } catch (error: any) {
    console.error('Error sending reply-in-topic email:', error);
  }
};

export const sendNewTopicEmail = async (
  email: string,
  data: { authorUsername: string; topicTitle: string; topicUrl: string }
) => {
  try {
    const transporter = createTransporter();

    const subject = 'Новая тема на форуме';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width:600px;margin:0 auto;padding:20px;">
          <h2>Новая тема на форуме</h2>
          <p>Пользователь <strong>${data.authorUsername}</strong> создал новую тему <strong>"${data.topicTitle}"</strong>.</p>
          <p>
            <a href="${data.topicUrl}" style="display:inline-block;padding:10px 20px;background:#2196F3;color:#fff;text-decoration:none;border-radius:4px;">
              Открыть тему
            </a>
          </p>
          <p style="font-size:12px;color:#777;">Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
Новая тема на форуме

Пользователь ${data.authorUsername} создал новую тему "${data.topicTitle}".

Открыть тему: ${data.topicUrl}
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@forum.com',
      to: email,
      subject,
      html,
      text,
    });
  } catch (error: any) {
    console.error('Error sending new-topic email:', error);
  }
};

