import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Проверяем наличие ошибки из state (например, из OAuth callback)
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err); // Для отладки
      
      let errorMessage = 'Ошибка входа';
      let hint = '';
      
      // Обработка ошибок сети
      if (!err.response) {
        if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
          errorMessage = 'Не удалось подключиться к серверу';
          hint = 'Проверьте, что backend сервер запущен на порту 5000';
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (err.response?.data) {
        // Обработка ошибок валидации
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          errorMessage = err.response.data.errors.map((e: any) => e.msg || e.message).join(', ');
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
          hint = err.response.data.hint || '';
        }
        
        // Если email не подтвержден, показываем кнопку для повторной отправки
        if (err.response.data.emailNotVerified) {
          // Сохраняем email для повторной отправки
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(hint ? `${errorMessage}\n\n💡 ${hint}` : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Пожалуйста, введите email адрес');
      return;
    }
    
    setResendingEmail(true);
    setResendMessage('');
    setError('');
    
    try {
      const response = await api.post('/auth/resend-verification', { email });
      setResendMessage(response.data.message || 'Письмо с подтверждением отправлено на ваш email');
    } catch (err: any) {
      setResendMessage(err.response?.data?.error || 'Не удалось отправить письмо. Попробуйте позже.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'yandex') => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    window.location.href = `${baseUrl}/auth/${provider}`;
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold mb-6">Вход</h1>
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium whitespace-pre-line">{error}</p>
              {error.includes('Email не подтвержден') && (
                <button
                  onClick={handleResendVerification}
                  disabled={resendingEmail}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                >
                  {resendingEmail ? 'Отправка...' : 'Отправить письмо подтверждения повторно'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {resendMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 px-4 py-3 rounded mb-4">
          <p className="text-sm">{resendMessage}</p>
        </div>
      )}
      <form onSubmit={handleSubmit}>
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
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Или войдите через</span>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleOAuthLogin('google')}
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
            onClick={() => handleOAuthLogin('yandex')}
            className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <span className="mr-2 text-lg font-bold" style={{ color: '#FC3F1D' }}>Я</span>
            Yandex
          </button>
        </div>
      </div>
      
      <div className="mt-4 text-center space-y-2">
        <p className="text-gray-600">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            Зарегистрироваться
          </Link>
        </p>
        <p className="text-sm">
          <Link to="/forgot-password" className="text-blue-600 hover:underline font-medium">
            Забыли пароль?
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
