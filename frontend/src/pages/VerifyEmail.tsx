import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import SeoHead from '../components/SeoHead';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmailToken = async () => {
      const tokenParam = searchParams.get('token');
      const successParam = searchParams.get('success');
      const errorParam = searchParams.get('error');

      // Если есть ошибка в URL параметрах (от backend редиректа)
      if (errorParam) {
        setStatus('error');
        setMessage(decodeURIComponent(errorParam));
        return;
      }

      // Если пришли с редиректа от backend с токеном (JWT)
      if (successParam === 'true' && tokenParam) {
        try {
          // Сохраняем токен
          localStorage.setItem('token', tokenParam);
          api.defaults.headers.common['Authorization'] = `Bearer ${tokenParam}`;
          
          // Пытаемся получить информацию о пользователе
          try {
            // Если есть endpoint для получения текущего пользователя
            const userResponse = await api.get('/auth/me');
            if (userResponse.data) {
              localStorage.setItem('user', JSON.stringify(userResponse.data));
            }
          } catch (e) {
            // Если endpoint не существует, просто используем токен
            console.log('No /auth/me endpoint, using token only');
          }
          
          setStatus('success');
          setMessage('Email успешно подтвержден! Вы будете перенаправлены...');
          
          // Перенаправляем на главную через 2 секунды
          setTimeout(() => {
            navigate('/');
            window.location.reload(); // Перезагружаем для обновления контекста
          }, 2000);
        } catch (error) {
          console.error('Error setting up session:', error);
          setStatus('error');
          setMessage('Ошибка при настройке сессии. Попробуйте войти вручную.');
        }
      } else if (tokenParam) {
        // Если есть токен подтверждения email, делаем запрос к backend
        try {
          // Делаем запрос с заголовком для получения JSON ответа
          const response = await api.get(`/auth/verify-email?token=${tokenParam}`, {
            headers: {
              'Accept': 'application/json',
            },
          });
          
          // Если backend вернул JSON, обрабатываем ответ
          if (response.data && response.data.token) {
            localStorage.setItem('token', response.data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            
            if (response.data.user) {
              localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            
            setStatus('success');
            setMessage('Email успешно подтвержден! Вы будете перенаправлены...');
            
            setTimeout(() => {
              navigate('/');
              window.location.reload();
            }, 2000);
          } else {
            // Если ответ не содержит токен, но успешен, возможно это редирект
            setStatus('error');
            setMessage('Неожиданный ответ от сервера. Попробуйте перейти по ссылке еще раз.');
          }
        } catch (error: any) {
          console.error('Verification error:', error);
          
          // Если ошибка 400 или 500, показываем сообщение
          if (error.response?.data?.error) {
            setStatus('error');
            setMessage(error.response.data.error);
          } else if (error.response?.status === 302 || error.response?.status === 301) {
            // Если это редирект, axios может не обработать его автоматически
            // В этом случае пробуем прямой переход
            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            window.location.href = `${backendUrl}/api/auth/verify-email?token=${tokenParam}`;
            return; // Не меняем статус, так как делаем редирект
          } else {
            setStatus('error');
            setMessage(error.message || 'Ошибка подтверждения email. Попробуйте перейти по ссылке еще раз.');
          }
        }
      } else {
        setStatus('error');
        setMessage('Токен подтверждения не найден в ссылке.');
      }
    };

    verifyEmailToken();
  }, [searchParams, navigate]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6">
      <SeoHead title="Подтверждение email" noIndex />
      <h1 className="text-2xl font-bold mb-6">Подтверждение email</h1>
      
      {status === 'loading' && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Проверка токена...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="font-medium">{message}</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{message}</p>
          </div>
          <div className="text-center space-y-2">
            <Link
              to="/login"
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Перейти на страницу входа
            </Link>
            <p className="text-sm text-gray-600">
              Или{' '}
              <Link to="/register" className="text-blue-600 hover:underline">
                зарегистрируйтесь заново
              </Link>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default VerifyEmail;
