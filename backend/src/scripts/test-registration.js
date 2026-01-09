// Скрипт для тестирования регистрации напрямую
const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function testRegistration() {
  try {
    console.log('Тестирование регистрации...');
    console.log('API URL:', API_URL);
    console.log('');

    const testUser = {
      username: 'testuser' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      password: 'password123'
    };

    console.log('Данные для регистрации:');
    console.log('- Username:', testUser.username);
    console.log('- Email:', testUser.email);
    console.log('- Password: ***');
    console.log('');

    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    
    console.log('✅ Регистрация успешна!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Ошибка регистрации:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Не удалось отправить запрос');
      console.error('Убедитесь, что backend запущен на http://localhost:5000');
    } else {
      console.error('Error:', error.message);
    }
    
    process.exit(1);
  }
}

testRegistration();
