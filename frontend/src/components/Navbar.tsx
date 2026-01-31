import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NavbarAvatar = ({ avatarUrl, username }: { avatarUrl?: string | null; username: string }) => {
  const getFullUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return (import.meta.env.VITE_API_URL || '') + url;
  };
  
  const fullUrl = getFullUrl(avatarUrl);
  
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
      {fullUrl ? (
        <img
          src={fullUrl}
          alt={username}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-gray-500 font-medium text-sm">
          {username.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isAiTitle, setIsAiTitle] = useState(false);

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/"
            onClick={() => {
              setIsAiTitle((prev) => !prev);
            }}
            className={`text-xl font-bold cursor-pointer transition-colors ${isAiTitle ? 'text-red-500' : 'text-blue-600'}`}
          >
            {isAiTitle ? 'AI Vibe Forum' : 'BI Vibe Forum'}
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
                >
                  <NavbarAvatar avatarUrl={user.avatar_url} username={user.username} />
                  <span>{user.username}</span>
                </Link>
                <button
                  onClick={logout}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 transition"
                >
                  Вход
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
