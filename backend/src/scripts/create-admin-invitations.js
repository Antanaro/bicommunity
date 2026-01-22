const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'forum_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex');
};

const createAdminInvitations = async () => {
  try {
    // Получаем количество приглашений из аргументов командной строки
    const countArg = process.argv[2];
    const count = countArg ? parseInt(countArg) : 5; // По умолчанию 5

    if (isNaN(count) || count <= 0) {
      console.log('❌ Неверное количество. Используйте: node src/scripts/create-admin-invitations.js [количество]');
      process.exit(1);
    }

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

    // Проверяем существующие приглашения
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
         WHERE ic.owner_id = $1
         ORDER BY ic.created_at DESC`,
        [admin.id]
      );
      
      console.log('\nСуществующие коды:');
      codesResult.rows.forEach((row) => {
        const status = row.used_by_id ? `использован (${row.used_by_username})` : 'доступен';
        console.log(`  - ${row.code} [${status}]`);
      });
    }

    // Создаём новые приглашения
    console.log(`\n📝 Создаю ${count} новых приглашений для администратора...\n`);
    
    const codes = [];
    for (let i = 0; i < count; i++) {
      let code;
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
      } else {
        console.log(`⚠️  Не удалось создать код после ${attempts} попыток`);
      }
    }

    if (codes.length > 0) {
      console.log('\n=== Новые пригласительные ссылки ===');
      console.log('Используйте эти ссылки для приглашения новых пользователей:\n');
      codes.forEach((code, i) => {
        console.log(`${i + 1}. https://bicommunity.ru/register?invite=${code}`);
      });
      console.log(`\n✅ Создано ${codes.length} новых приглашений`);
    } else {
      console.log('\n❌ Не удалось создать ни одного приглашения');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

createAdminInvitations();
