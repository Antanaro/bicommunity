import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invitationApi } from '../services/api';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Получаем код из URL при загрузке
  useEffect(() => {
    const codeFromUrl = searchParams.get('invite');
    if (codeFromUrl) {
      setInvitationCode(codeFromUrl);
      validateCode(codeFromUrl);
    }
  }, [searchParams]);

  // Валидация кода приглашения
  const validateCode = async (code: string) => {
    if (!code || code.length < 8) {
      setCodeValid(null);
      setInvitedBy(null);
      return;
    }

    setValidatingCode(true);
    try {
      const response = await invitationApi.validate(code);
      setCodeValid(response.data.valid);
      setInvitedBy(response.data.invitedBy || null);
      setError('');
    } catch (err: any) {
      setCodeValid(false);
      setInvitedBy(null);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      }
    } finally {
      setValidatingCode(false);
    }
  };

  // Дебаунс для валидации кода
  useEffect(() => {
    const timer = setTimeout(() => {
      if (invitationCode) {
        validateCode(invitationCode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [invitationCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!codeValid) {
      setError('Пожалуйста, введите действительный пригласительный код');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password, invitationCode);
      // После успешной регистрации сразу переходим на главную
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.response?.data?.errors) {
        const validationErrors = err.response.data.errors.map((e: any) => e.msg).join(', ');
        setError(validationErrors);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
        setError('Не удалось подключиться к серверу. Убедитесь, что backend запущен.');
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
      
      <form onSubmit={handleSubmit}>
          {/* Пригласительный код */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Пригласительный код
            </label>
            <div className="relative">
              <input
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value.trim())}
                className={`w-full border rounded px-4 py-2 pr-10 ${
                  codeValid === true ? 'border-green-500' : 
                  codeValid === false ? 'border-red-500' : ''
                }`}
                placeholder="Введите код приглашения"
                required
              />
              {validatingCode && (
                <span className="absolute right-3 top-2.5 text-gray-400">...</span>
              )}
              {!validatingCode && codeValid === true && (
                <span className="absolute right-3 top-2.5 text-green-500">✓</span>
              )}
              {!validatingCode && codeValid === false && (
                <span className="absolute right-3 top-2.5 text-red-500">✗</span>
              )}
            </div>
            {invitedBy && (
              <p className="text-sm text-green-600 mt-1">
                Вас пригласил: <strong>{invitedBy}</strong>
              </p>
            )}
          </div>

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
            disabled={loading || !codeValid}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
      
      {/* OAuth кнопки временно скрыты */}
      {false && (
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Или зарегистрируйтесь через</span>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                const baseUrl = import.meta.env.VITE_API_URL || '/api';
                window.location.href = `${baseUrl}/auth/google`;
              }}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => {
                const baseUrl = import.meta.env.VITE_API_URL || '/api';
                window.location.href = `${baseUrl}/auth/yandex`;
              }}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <span className="mr-2 text-lg font-bold" style={{ color: '#FC3F1D' }}>Я</span>
              Yandex
            </button>
          </div>
        </div>
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
