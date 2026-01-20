import { pool } from '../config/database';
import crypto from 'crypto';

const generateInviteCode = (): string => {
  return crypto.randomBytes(4).toString('hex');
};

const createAdminInvitations = async () => {
  try {
    // Находим админа
    const adminResult = await pool.query(
      "SELECT id, username FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (adminResult.rows.length === 0) {
      console.log('❌ Администратор не найден. Создайте пользователя с ролью admin.');
      process.exit(1);
    }

    const admin = adminResult.rows[0];
    console.log(`✅ Найден администратор: ${admin.username} (ID: ${admin.id})`);

    // Проверяем, есть ли уже приглашения
    const existingResult = await pool.query(
      'SELECT COUNT(*) FROM invitation_codes WHERE owner_id = $1',
      [admin.id]
    );

    const existingCount = parseInt(existingResult.rows[0].count);
    
    if (existingCount > 0) {
      console.log(`ℹ️  У администратора уже есть ${existingCount} приглашений`);
      
      // Показываем существующие
      const codesResult = await pool.query(
        `SELECT code, used_by_id, u.username as used_by_username 
         FROM invitation_codes ic 
         LEFT JOIN users u ON ic.used_by_id = u.id 
         WHERE ic.owner_id = $1`,
        [admin.id]
      );
      
      console.log('\nСуществующие коды:');
      codesResult.rows.forEach((row: any) => {
        const status = row.used_by_id ? `использован (${row.used_by_username})` : 'доступен';
        console.log(`  - ${row.code} [${status}]`);
      });
      
      process.exit(0);
    }

    // Создаём 3 приглашения для админа
    console.log('\nСоздаю 3 приглашения для администратора...\n');
    
    const codes: string[] = [];
    for (let i = 0; i < 3; i++) {
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
          [code, admin.id]
        );
        codes.push(code);
        console.log(`✅ Создан код: ${code}`);
      }
    }

    console.log('\n=== Пригласительные ссылки ===');
    console.log('Используйте эти ссылки для приглашения новых пользователей:\n');
    codes.forEach((code, i) => {
      console.log(`${i + 1}. https://bicommunity.ru/register?invite=${code}`);
    });

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

createAdminInvitations();
