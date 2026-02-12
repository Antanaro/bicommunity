import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';

interface PublicUser {
  id: number;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/auth/users/${id}`);
        setUser(response.data);
      } catch (err: any) {
        console.error('Error loading user profile:', err);
        if (err.response?.status === 404) {
          setError('Пользователь не найден');
        } else {
          setError('Не удалось загрузить профиль пользователя');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  const getAvatarUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return (import.meta.env.VITE_API_URL || '') + avatarUrl;
  };

  const formatRegistrationDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Загрузка профиля...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-700 mb-4">{error}</p>
        <Link to="/board" className="text-blue-600 hover:underline">
          ← Вернуться к сообщениям
        </Link>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const avatarUrl = getAvatarUrl(user.avatar_url);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Профиль пользователя</h1>

        <div className="flex items-start gap-6 mb-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-gray-500">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-xl font-semibold break-all">{user.username}</div>
            <div className="text-gray-500 text-sm mt-1">
              Зарегистрирован: {formatRegistrationDate(user.created_at)}
            </div>
          </div>
        </div>

        <div className="border-t pt-4 mt-2">
          <div className="mb-2">
            <span className="block text-gray-700 text-sm font-bold">
              О себе
            </span>
          </div>
          <div className="text-gray-700">
            {user.bio ? (
              <p className="whitespace-pre-wrap">{user.bio}</p>
            ) : (
              <p className="text-gray-400 italic">
                Пользователь пока не рассказал о себе
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

