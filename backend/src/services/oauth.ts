import { pool } from '../config/database';
import { createInitialInvitations } from '../routes/invitations';
import jwt from 'jsonwebtoken';

// Generate JWT token for user
export const generateToken = (user: any) => {
  return jwt.sign(
    { userId: user.id, role: user.role || 'user' },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
};

// Handle Google OAuth user
export const handleGoogleUser = async (profile: any) => {
  // Google OAuth v2 API возвращает данные в разных форматах
  // Проверяем несколько вариантов получения email
  const id = profile.id || profile.sub;
  const email = profile.email || 
                (Array.isArray(profile.emails) && profile.emails.length > 0 ? profile.emails[0].value : null) ||
                (profile.emails && profile.emails[0]?.value);
  const displayName = profile.name || profile.displayName || profile.given_name || email?.split('@')[0];
  const avatarUrl = profile.picture || 
                   (Array.isArray(profile.photos) && profile.photos.length > 0 ? profile.photos[0].value : null) ||
                   (profile.photos && profile.photos[0]?.value);

  console.log('🔍 Processing Google user:', {
    id,
    email,
    displayName,
    hasEmail: !!email,
    profileKeys: Object.keys(profile)
  });

  if (!email) {
    console.error('❌ Email не найден в профиле Google:', JSON.stringify(profile, null, 2));
    throw new Error('Email не предоставлен Google. Убедитесь, что вы дали разрешение на доступ к email адресу.');
  }
  
  if (!id) {
    throw new Error('ID пользователя не предоставлен Google');
  }

  // Проверяем, существует ли пользователь с таким google_id или email
  // Используем COALESCE для случая, когда колонка google_id еще не существует
  let user = await pool.query(
    'SELECT * FROM users WHERE (google_id = $1 OR google_id IS NULL) AND email = $2',
    [id, email]
  ).catch(async () => {
    // Если колонка google_id не существует, ищем только по email
    return await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  });

  if (user.rows.length > 0) {
    const existingUser = user.rows[0];
    
    // Если пользователь существует, но у него нет google_id, обновляем
    // Проверяем наличие колонки перед обновлением
    if (!existingUser.google_id) {
      try {
        await pool.query(
          'UPDATE users SET google_id = $1, oauth_provider = $2, avatar_url = COALESCE(avatar_url, $3) WHERE id = $4',
          [id, 'google', avatarUrl, existingUser.id]
        );
        existingUser.google_id = id;
        existingUser.oauth_provider = 'google';
      } catch (error: any) {
        // Если колонка не существует, просто возвращаем пользователя
        if (error.code === '42703') {
          console.error('⚠️ OAuth поля не добавлены в БД. Запустите миграцию: npm run migrate-oauth');
        } else {
          throw error;
        }
      }
    }
    
    return existingUser;
  }

  // Создаем нового пользователя
  // Генерируем уникальное имя пользователя из email или displayName
  let username = displayName || email.split('@')[0];
  let usernameExists = true;
  let counter = 1;
  
  while (usernameExists) {
    const check = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (check.rows.length === 0) {
      usernameExists = false;
    } else {
      username = `${displayName || email.split('@')[0]}${counter}`;
      counter++;
    }
  }

  // Создаем пользователя без пригласительного кода (OAuth пользователи не требуют приглашения)
  let result;
  try {
    result = await pool.query(
      `INSERT INTO users (username, email, google_id, oauth_provider, email_verified, avatar_url, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, NULL)
       RETURNING id, username, email, role, avatar_url, bio`,
      [username, email, id, 'google', true, avatarUrl]
    );
  } catch (error: any) {
    if (error.code === '42703') {
      // Колонка не существует - нужно запустить миграцию
      throw new Error('OAuth поля не добавлены в БД. Запустите миграцию: npm run migrate-oauth');
    }
    throw error;
  }

  const newUser = result.rows[0];

  // Создаём 3 приглашения для нового пользователя
  await createInitialInvitations(newUser.id);

  return newUser;
};

// Handle Yandex OAuth user
export const handleYandexUser = async (yandexUser: any) => {
  const { id, display_name, default_email, real_name, default_avatar_id } = yandexUser;
  const email = default_email;
  const avatarUrl = default_avatar_id 
    ? `https://avatars.yandex.net/get-yapic/${default_avatar_id}/islands-200`
    : null;
  const displayName = real_name || display_name || email.split('@')[0];

  if (!email) {
    throw new Error('Email не предоставлен Yandex');
  }

  // Проверяем, существует ли пользователь с таким yandex_id или email
  // Используем COALESCE для случая, когда колонка yandex_id еще не существует
  let user = await pool.query(
    'SELECT * FROM users WHERE (yandex_id = $1 OR yandex_id IS NULL) AND email = $2',
    [id, email]
  ).catch(async () => {
    // Если колонка yandex_id не существует, ищем только по email
    return await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  });

  if (user.rows.length > 0) {
    const existingUser = user.rows[0];
    
    // Если пользователь существует, но у него нет yandex_id, обновляем
    // Проверяем наличие колонки перед обновлением
    if (!existingUser.yandex_id) {
      try {
        await pool.query(
          'UPDATE users SET yandex_id = $1, oauth_provider = $2, avatar_url = COALESCE(avatar_url, $3) WHERE id = $4',
          [id, 'yandex', avatarUrl, existingUser.id]
        );
        existingUser.yandex_id = id;
        existingUser.oauth_provider = 'yandex';
      } catch (error: any) {
        // Если колонка не существует, просто возвращаем пользователя
        if (error.code === '42703') {
          console.error('⚠️ OAuth поля не добавлены в БД. Запустите миграцию: npm run migrate-oauth');
        } else {
          throw error;
        }
      }
    }
    
    return existingUser;
  }

  // Создаем нового пользователя
  // Генерируем уникальное имя пользователя
  let username = displayName;
  let usernameExists = true;
  let counter = 1;
  
  while (usernameExists) {
    const check = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (check.rows.length === 0) {
      usernameExists = false;
    } else {
      username = `${displayName}${counter}`;
      counter++;
    }
  }

  // Создаем пользователя без пригласительного кода
  let result;
  try {
    result = await pool.query(
      `INSERT INTO users (username, email, yandex_id, oauth_provider, email_verified, avatar_url, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, NULL)
       RETURNING id, username, email, role, avatar_url, bio`,
      [username, email, id, 'yandex', true, avatarUrl]
    );
  } catch (error: any) {
    if (error.code === '42703') {
      // Колонка не существует - нужно запустить миграцию
      throw new Error('OAuth поля не добавлены в БД. Запустите миграцию: npm run migrate-oauth');
    }
    throw error;
  }

  const newUser = result.rows[0];

  // Создаём 3 приглашения для нового пользователя
  await createInitialInvitations(newUser.id);

  return newUser;
};
