import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import SeoHead from '../components/SeoHead';

interface PublicUser {
  id: number;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  topics_count?: number;
  posts_count?: number;
  likes_received?: number;
}

interface TopicItem {
  id: number;
  title: string;
  created_at: string;
  category_name: string;
  post_count: number;
  last_post_at: string | null;
  author_name?: string;
}

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [myTopics, setMyTopics] = useState<TopicItem[]>([]);
  const [participatedTopics, setParticipatedTopics] = useState<TopicItem[]>([]);
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

  useEffect(() => {
    const loadTopics = async () => {
      if (!id) return;
      try {
        const [myRes, participatedRes] = await Promise.all([
          api.get(`/auth/users/${id}/topics`),
          api.get(`/auth/users/${id}/participated-topics`),
        ]);
        setMyTopics(myRes.data);
        setParticipatedTopics(participatedRes.data);
      } catch (err) {
        console.error('Error loading user topics:', err);
      }
    };

    loadTopics();
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

  const formatTopicDate = (iso: string) => {
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
        <div className="text-gray-600 dark:text-gray-400">Загрузка профиля...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center border border-gray-200 dark:border-gray-700">
        <p className="text-gray-700 dark:text-gray-200 mb-4">{error}</p>
        <Link to="/board" className="text-blue-600 dark:text-blue-400 hover:underline">
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
      <SeoHead
        title={`Профиль: ${user.username}`}
        description={user.bio || `Профиль участника форума BI Community: ${user.username}. Темы и сообщения.`}
        canonical={`/users/${id}`}
      />
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Профиль пользователя</h1>

        <div className="flex items-start gap-6 mb-4">
          <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden border-2 border-gray-300 dark:border-gray-600">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-gray-500 dark:text-gray-400">
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-xl font-semibold break-all text-gray-900 dark:text-gray-100">{user.username}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Зарегистрирован: {formatRegistrationDate(user.created_at)}
            </div>
            {/* Статистика */}
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{user.topics_count ?? 0}</span> тем
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{user.posts_count ?? 0}</span> сообщений
              </span>
              {(user.likes_received ?? 0) > 0 && (
<span className="text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{user.likes_received}</span> 👍
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
          <div className="mb-2">
            <span className="block text-gray-700 dark:text-gray-300 text-sm font-bold">
              О себе
            </span>
          </div>
          <div className="text-gray-700 dark:text-gray-300">
            {user.bio ? (
              <p className="whitespace-pre-wrap">{user.bio}</p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 italic">
                Пользователь пока не рассказал о себе
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Мои темы */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Мои темы</h2>
        {myTopics.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Нет созданных тем</p>
        ) : (
          <ul className="space-y-3">
            {myTopics.map((topic) => (
              <li key={topic.id} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                <Link
                  to={`/topic/${topic.id}`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium hover:underline block"
                >
                  {topic.title}
                </Link>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {topic.category_name} • {topic.post_count} сообщ. • {formatTopicDate(topic.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Темы, где участвовал */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Темы, где участвовал</h2>
        {participatedTopics.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Пока не участвовал в чужих темах</p>
        ) : (
          <ul className="space-y-3">
            {participatedTopics.map((topic) => (
              <li key={topic.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <Link
                  to={`/topic/${topic.id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium hover:underline block"
                >
                  {topic.title}
                </Link>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {topic.category_name}
                  {topic.author_name && ` • автор: ${topic.author_name}`}
                  {' • '}{topic.post_count} сообщ. • {formatTopicDate(topic.created_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
