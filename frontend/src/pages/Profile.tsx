import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invitationApi, api, uploadImage } from '../services/api';

interface TopicItem {
  id: number;
  title: string;
  created_at: string;
  category_name: string;
  post_count: number;
  last_post_at: string | null;
  author_name?: string;
}

interface Invitation {
  id: number;
  code: string;
  created_at: string;
  used_at: string | null;
  used_by_id: number | null;
  used_by_username: string | null;
}

interface InvitationsData {
  invitations: Invitation[];
  stats: {
    total: number;
    available: number;
    used: number;
    canCreate: boolean;
  };
}

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [invitationsData, setInvitationsData] = useState<InvitationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Profile editing state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [savingBio, setSavingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification settings state
  const [telegramChatId, setTelegramChatId] = useState<string>(user?.telegram_chat_id || '');
  const [notifyReplyToMyPostEmail, setNotifyReplyToMyPostEmail] = useState<boolean>(
    user?.notify_reply_to_my_post_email ?? true
  );
  const [notifyReplyToMyPostTelegram, setNotifyReplyToMyPostTelegram] = useState<boolean>(
    user?.notify_reply_to_my_post_telegram ?? false
  );
  const [notifyReplyInMyTopicEmail, setNotifyReplyInMyTopicEmail] = useState<boolean>(
    user?.notify_reply_in_my_topic_email ?? true
  );
  const [notifyReplyInMyTopicTelegram, setNotifyReplyInMyTopicTelegram] = useState<boolean>(
    user?.notify_reply_in_my_topic_telegram ?? false
  );
  const [notifyNewTopicEmail, setNotifyNewTopicEmail] = useState<boolean>(
    user?.notify_new_topic_email ?? true
  );
  const [notifyNewTopicTelegram, setNotifyNewTopicTelegram] = useState<boolean>(
    user?.notify_new_topic_telegram ?? false
  );
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [myTopics, setMyTopics] = useState<TopicItem[]>([]);
  const [participatedTopics, setParticipatedTopics] = useState<TopicItem[]>([]);

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    const loadTopics = async () => {
      if (!user?.id) return;
      try {
        const [myRes, participatedRes] = await Promise.all([
          api.get(`/auth/users/${user.id}/topics`),
          api.get(`/auth/users/${user.id}/participated-topics`),
        ]);
        setMyTopics(myRes.data);
        setParticipatedTopics(participatedRes.data);
      } catch (err) {
        console.error('Error loading topics:', err);
      }
    };
    loadTopics();
  }, [user?.id]);

  useEffect(() => {
    if (user?.bio) {
      setBio(user.bio);
    }
  }, [user?.bio]);

  useEffect(() => {
    setTelegramChatId(user?.telegram_chat_id || '');
    setNotifyReplyToMyPostEmail(user?.notify_reply_to_my_post_email ?? true);
    setNotifyReplyToMyPostTelegram(user?.notify_reply_to_my_post_telegram ?? false);
    setNotifyReplyInMyTopicEmail(user?.notify_reply_in_my_topic_email ?? true);
    setNotifyReplyInMyTopicTelegram(user?.notify_reply_in_my_topic_telegram ?? false);
    setNotifyNewTopicEmail(user?.notify_new_topic_email ?? true);
    setNotifyNewTopicTelegram(user?.notify_new_topic_telegram ?? false);
  }, [
    user?.telegram_chat_id,
    user?.notify_reply_to_my_post_email,
    user?.notify_reply_to_my_post_telegram,
    user?.notify_reply_in_my_topic_email,
    user?.notify_reply_in_my_topic_telegram,
    user?.notify_new_topic_email,
    user?.notify_new_topic_telegram,
  ]);

  const loadInvitations = async () => {
    try {
      const response = await invitationApi.getMy();
      setInvitationsData(response.data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/register?invite=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5 МБ');
      return;
    }

    setError(null);
    setUploadingAvatar(true);

    try {
      // Upload the image
      const imageUrl = await uploadImage(file);
      
      // Update profile with new avatar URL
      const response = await api.put('/auth/profile', { avatar_url: imageUrl });
      updateUser(response.data);
      setSuccess('Аватар успешно обновлён');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setError('Ошибка при загрузке аватара');
    } finally {
      setUploadingAvatar(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveBio = async () => {
    setError(null);
    setSavingBio(true);

    try {
      const response = await api.put('/auth/profile', { bio: bio.trim() });
      updateUser(response.data);
      setIsEditingBio(false);
      setSuccess('Описание профиля сохранено');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving bio:', err);
      setError(err.response?.data?.error || 'Ошибка при сохранении');
    } finally {
      setSavingBio(false);
    }
  };

  const cancelEditBio = () => {
    setBio(user?.bio || '');
    setIsEditingBio(false);
  };

  const getAvatarUrl = () => {
    if (!user?.avatar_url) return null;
    if (user.avatar_url.startsWith('http')) return user.avatar_url;
    return (import.meta.env.VITE_API_URL || '') + user.avatar_url;
  };

  if (!user) {
    return null;
  }

  const handleSaveNotifications = async () => {
    setError(null);
    setSuccess(null);
    setSavingNotifications(true);

    try {
      const payload = {
        telegram_chat_id: telegramChatId.trim() || null,
        notify_reply_to_my_post_email: notifyReplyToMyPostEmail,
        notify_reply_to_my_post_telegram: notifyReplyToMyPostTelegram,
        notify_reply_in_my_topic_email: notifyReplyInMyTopicEmail,
        notify_reply_in_my_topic_telegram: notifyReplyInMyTopicTelegram,
        notify_new_topic_email: notifyNewTopicEmail,
        notify_new_topic_telegram: notifyNewTopicTelegram,
      };

      const response = await api.put('/auth/profile', payload);
      updateUser(response.data);
      setSuccess('Настройки уведомлений сохранены');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving notification settings:', err);
      const data = err.response?.data;
      let msg = data?.error || data?.message;
      if (data?.errors?.length) {
        msg = data.errors.map((e: { msg?: string }) => e.msg).filter(Boolean).join('. ') || msg;
      }
      if (!msg && err.response?.status === 503) {
        msg = 'Сервис временно недоступен. Возможно, не применена миграция БД.';
      }
      if (!msg && !err.response) {
        msg = 'Нет ответа от сервера. Проверьте, что backend запущен.';
      }
      setError(msg || 'Ошибка при сохранении настроек уведомлений');
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-1 sm:px-0">
      {/* Уведомления */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Информация о профиле */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Профиль</h1>
        
        {/* Аватар */}
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={handleAvatarClick}
              className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer overflow-hidden hover:opacity-80 transition border-2 border-gray-300 hover:border-blue-400"
              title="Нажмите, чтобы изменить аватар"
            >
              {uploadingAvatar ? (
                <div className="text-gray-500 text-sm">Загрузка...</div>
              ) : getAvatarUrl() ? (
                <img
                  src={getAvatarUrl()!}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-gray-500">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs cursor-pointer hover:bg-blue-600" onClick={handleAvatarClick}>
              ✎
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xl font-semibold">{user.username}</div>
            <div className="text-gray-500 text-sm">{user.email}</div>
            <div className="text-gray-500 text-sm">
              {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </div>
          </div>
        </div>

        {/* О себе */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-gray-700 text-sm font-bold">
              О себе
            </label>
            {!isEditingBio && (
              <button
                onClick={() => setIsEditingBio(true)}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                Редактировать
              </button>
            )}
          </div>
          
          {isEditingBio ? (
            <div className="space-y-2">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажите немного о себе..."
                className="w-full border rounded px-3 py-2 h-24 resize-none focus:outline-none focus:border-blue-500"
                maxLength={500}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">{bio.length}/500</span>
                <div className="flex gap-2">
                  <button
                    onClick={cancelEditBio}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    disabled={savingBio}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveBio}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    disabled={savingBio}
                  >
                    {savingBio ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-700">
              {user.bio ? (
                <p className="whitespace-pre-wrap">{user.bio}</p>
              ) : (
                <p className="text-gray-400 italic">Информация о себе не указана</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Мои темы / Темы, где участвовал */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-bold mb-4">Мои темы</h2>
          {myTopics.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет созданных тем</p>
          ) : (
            <ul className="space-y-2">
              {myTopics.slice(0, 5).map((topic) => (
                <li key={topic.id}>
                  <Link
                    to={`/topic/${topic.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline block truncate"
                  >
                    {topic.title}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {topic.category_name} • {topic.post_count} сообщ.
                  </div>
                </li>
              ))}
            </ul>
          )}
          {myTopics.length > 5 && (
            <Link to={`/users/${user.id}`} className="text-blue-600 hover:underline text-sm mt-2 inline-block">
              Все мои темы →
            </Link>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-bold mb-4">Темы, где участвовал</h2>
          {participatedTopics.length === 0 ? (
            <p className="text-gray-500 text-sm">Пока не участвовал в чужих темах</p>
          ) : (
            <ul className="space-y-2">
              {participatedTopics.slice(0, 5).map((topic) => (
                <li key={topic.id}>
                  <Link
                    to={`/topic/${topic.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline block truncate"
                  >
                    {topic.title}
                  </Link>
                  <div className="text-xs text-gray-500">
                    {topic.category_name}
                    {topic.author_name && ` • ${topic.author_name}`}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {participatedTopics.length > 5 && (
            <Link to={`/users/${user.id}`} className="text-blue-600 hover:underline text-sm mt-2 inline-block">
              Все темы →
            </Link>
          )}
        </div>
      </div>

      {/* Настройки уведомлений */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Уведомления</h2>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-1">
            Telegram chat_id
          </label>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            placeholder="Например: 123456789"
          />
          <p className="text-xs text-gray-500 mt-1">
            Получите ваш chat_id, отправив команду <code>/myid</code>{' '}
            <a href="https://t.me/bicommunity_bot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">нашему Telegram‑боту</a>, и
            вставьте значение сюда.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-gray-800 mb-1">
              Ответ на моё сообщение
            </div>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={notifyReplyToMyPostEmail}
                  onChange={(e) => setNotifyReplyToMyPostEmail(e.target.checked)}
                  className="rounded"
                />
                <span>Email</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={notifyReplyToMyPostTelegram}
                  onChange={(e) => setNotifyReplyToMyPostTelegram(e.target.checked)}
                  className="rounded"
                />
                <span>Telegram</span>
              </label>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-1">
              Ответ в теме, которую я создал
            </div>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={notifyReplyInMyTopicEmail}
                  onChange={(e) => setNotifyReplyInMyTopicEmail(e.target.checked)}
                  className="rounded"
                />
                <span>Email</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={notifyReplyInMyTopicTelegram}
                  onChange={(e) => setNotifyReplyInMyTopicTelegram(e.target.checked)}
                  className="rounded"
                />
                <span>Telegram</span>
              </label>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-800 mb-1">
              Новые темы на форуме
            </div>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={notifyNewTopicEmail}
                  onChange={(e) => setNotifyNewTopicEmail(e.target.checked)}
                  className="rounded"
                />
                <span>Email</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={notifyNewTopicTelegram}
                  onChange={(e) => setNotifyNewTopicTelegram(e.target.checked)}
                  className="rounded"
                />
                <span>Telegram</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleSaveNotifications}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={savingNotifications}
          >
            {savingNotifications ? 'Сохранение...' : 'Сохранить настройки уведомлений'}
          </button>
        </div>
      </div>

      {/* Приглашения */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4">Мои приглашения</h2>
        
        {loading ? (
          <p className="text-gray-500">Загрузка...</p>
        ) : invitationsData ? (
          <>
            {/* Статистика */}
            <div className="flex gap-4 mb-4 text-sm">
              <span className="text-green-600">
                Доступно: {invitationsData.stats.available}
              </span>
              <span className="text-gray-500">
                Использовано: {invitationsData.stats.used}
              </span>
            </div>

            {/* Список приглашений */}
            <div className="space-y-3">
              {invitationsData.invitations.map((inv) => (
                <div
                  key={inv.id}
                  className={`p-3 rounded border ${
                    inv.used_by_id 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded">
                        {inv.code}
                      </code>
                      {inv.used_by_id ? (
                        <span className="ml-3 text-sm text-gray-500">
                          Использован: <strong>{inv.used_by_username}</strong>
                        </span>
                      ) : (
                        <span className="ml-3 text-sm text-green-600">
                          Доступен
                        </span>
                      )}
                    </div>
                    {!inv.used_by_id && (
                      <button
                        onClick={() => copyInviteLink(inv.code)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                      >
                        {copiedCode === inv.code ? 'Скопировано!' : 'Копировать ссылку'}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {invitationsData.invitations.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  У вас пока нет приглашений
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="text-red-500">Ошибка загрузки приглашений</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
