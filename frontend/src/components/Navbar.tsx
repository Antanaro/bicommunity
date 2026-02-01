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

const TITLES = ['AI Vibe Forum', 'BI Vibe Forum'] as const;

const Navbar = () => {
  const { user, logout } = useAuth();
  const [titleIndex, setTitleIndex] = useState(() =>
    Math.floor(Math.random() * TITLES.length)
  );

  const currentTitle = TITLES[titleIndex];
  const isAi = currentTitle === 'AI Vibe Forum';

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <button
            type="button"
            onClick={() => setTitleIndex((i) => (i + 1) % TITLES.length)}
            className={`text-xl font-bold cursor-pointer transition-colors bg-transparent border-0 p-0 ${isAi ? 'text-red-500' : 'text-blue-600'}`}
          >
            {currentTitle}
          </button>
          <div className="flex items-center flex-1 justify-end gap-4">
            <div className="flex items-center gap-4 mr-8">
              <Link
                to="/board"
                className="text-gray-700 hover:text-blue-600 transition"
              >
                Всё подряд
              </Link>
              <Link
                to="/categories"
                className="text-gray-700 hover:text-blue-600 transition"
              >
                По категориям
              </Link>
              <Link
                to="/about"
                className="text-gray-700 hover:text-blue-600 transition"
              >
                О форуме
              </Link>
            </div>
            {user ? (
              <div className="flex items-center gap-4">
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
              </div>
            ) : (
              <div className="flex items-center gap-4">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
