import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { invitationApi } from '../services/api';

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
  const { user } = useAuth();
  const [invitationsData, setInvitationsData] = useState<InvitationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

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

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Информация о профиле */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6">Профиль</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Имя пользователя
            </label>
            <div className="text-gray-900">{user.username}</div>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <div className="text-gray-900">{user.email}</div>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Роль
            </label>
            <div className="text-gray-900">
              {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </div>
          </div>
        </div>
      </div>

      {/* Приглашения */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Мои приглашения</h2>
        
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
