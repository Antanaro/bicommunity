import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
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
  );
};

export default Profile;
