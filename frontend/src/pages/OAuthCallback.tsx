import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { api } from '../services/api';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    if (error) {
      // Показываем ошибку и редиректим на страницу входа
      setTimeout(() => {
        navigate('/login', { state: { error: decodeURIComponent(error) } });
      }, 2000);
      return;
    }

    if (token && success === 'true') {
      // Сохраняем токен и получаем информацию о пользователе
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Получаем информацию о пользователе
      api
        .get('/auth/profile')
        .then((response) => {
          const user = response.data;
          localStorage.setItem('user', JSON.stringify(user));
          updateUser(user);
          // Обновляем заголовок авторизации
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          navigate('/');
        })
        .catch((err) => {
          console.error('Error fetching user profile:', err);
          navigate('/login', { state: { error: 'Ошибка получения данных пользователя' } });
        });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, updateUser]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">Обработка авторизации...</p>
    </div>
  );
};

export default OAuthCallback;
