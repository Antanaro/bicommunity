import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const result = await register(username, email, password);
      // Если регистрация успешна, но email не подтвержден, показываем сообщение
      if (result?.message) {
        setSuccessMessage(result.message);
        // Очищаем форму
        setUsername('');
        setEmail('');
        setPassword('');
        return;
      }
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      // Обработка различных типов ошибок
      if (err.response?.data?.errors) {
        // Ошибки валидации от express-validator
        const validationErrors = err.response.data.errors.map((e: any) => e.msg).join(', ');
        setError(validationErrors);
      } else if (err.response?.data?.error) {
        // Обычные ошибки
        setError(err.response.data.error);
      } else if (err.message) {
        // Ошибки сети или другие
        setError(err.message);
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        setError('Не удалось подключиться к серверу. Убедитесь, что backend запущен на http://localhost:5000');
      } else {
        setError('Ошибка регистрации. Проверьте консоль браузера для деталей.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold mb-6">Регистрация</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-medium mb-2">✓ {successMessage}</p>
          <p className="text-sm">Проверьте вашу почту и перейдите по ссылке в письме для подтверждения email адреса.</p>
        </div>
      )}
      {!successMessage && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded px-4 py-2"
              required
              minLength={3}
              maxLength={50}
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-4 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-4 py-2"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
      )}
      <p className="mt-4 text-center text-gray-600">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
};

export default Register;
