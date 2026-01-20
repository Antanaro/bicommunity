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
  const [successMessage, setSuccessMessage] = useState('');
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
    setSuccessMessage('');

    if (!codeValid) {
      setError('Пожалуйста, введите действительный пригласительный код');
      return;
    }

    setLoading(true);

    try {
      const result = await register(username, email, password, invitationCode);
      if (result?.message) {
        setSuccessMessage(result.message);
        setUsername('');
        setEmail('');
        setPassword('');
        return;
      }
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
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-medium mb-2">{successMessage}</p>
          <p className="text-sm">Проверьте вашу почту и перейдите по ссылке в письме для подтверждения email адреса.</p>
        </div>
      )}

      {!successMessage && (
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
