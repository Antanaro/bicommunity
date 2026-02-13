import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const NavbarAvatar = ({ avatarUrl, username }: { avatarUrl?: string | null; username: string }) => {
  const getFullUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return (import.meta.env.VITE_API_URL || '') + url;
  };
  
  const fullUrl = getFullUrl(avatarUrl);
  
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
      {fullUrl ? (
        <img
          src={fullUrl}
          alt={username}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-gray-500 dark:text-gray-300 font-medium text-sm">
          {username.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};

const TITLES = ['AI Vibe Forum', 'BI Vibe Forum', 'AB Vibe Forum'] as const;

// BI 60%, AI 30%, AB 10%
const getInitialTitleIndex = () => {
  const r = Math.random();
  if (r < 0.6) return 1;   // BI 60%
  if (r < 0.9) return 0;  // AI 30%
  return 2;               // AB 10%
};

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [titleIndex, setTitleIndex] = useState(getInitialTitleIndex);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTitle = TITLES[titleIndex];
  const isAi = currentTitle === 'AI Vibe Forum';
  const isAb = currentTitle === 'AB Vibe Forum';

  // Закрывать меню при навигации и клике снаружи
  useEffect(() => {
    const handleResize = () => setMobileMenuOpen(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 transition-colors">
      <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTitleIndex((i) => (i + 1) % TITLES.length)}
              className={`text-base sm:text-xl font-bold cursor-pointer transition-colors bg-transparent border-0 p-0 min-w-0 truncate max-w-[50vw] sm:max-w-none ${isAb ? 'text-green-600 dark:text-green-400' : isAi ? 'text-red-500 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}
            >
              {currentTitle}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
              className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-colors duration-200"
            >
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>

          {/* Десктоп: видимая навигация */}
          <div className="hidden md:flex items-center flex-1 justify-end gap-4">
            <div className="flex items-center gap-4 mr-6">
              <Link to="/board" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition py-2">
                Всё подряд
              </Link>
              <Link to="/categories" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition py-2">
                По категориям
              </Link>
              <Link to="/about" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition py-2">
                О форуме
              </Link>
            </div>
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  <NavbarAvatar avatarUrl={user.avatar_url} username={user.username} />
                  <span className="max-w-[120px] truncate">{user.username}</span>
                </Link>
                <button onClick={logout} className="bg-red-500 dark:bg-red-600 text-white px-4 py-2 rounded hover:bg-red-600 dark:hover:bg-red-700 transition text-sm">
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition py-2">
                  Вход
                </Link>
                <Link to="/register" className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition text-sm">
                  Регистрация
                </Link>
              </div>
            )}
          </div>

          {/* Мобильный: кнопка гамбургера */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link
                to="/profile"
                onClick={closeMenu}
                className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 p-2 -mr-1 min-h-[44px] min-w-[44px] justify-center"
              >
                <NavbarAvatar avatarUrl={user.avatar_url} username={user.username} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2 -mr-1 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Меню"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Мобильное выдвижное меню */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute left-0 right-0 top-full bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700 py-3 px-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex flex-col gap-1">
              <Link
                to="/board"
                onClick={closeMenu}
                className="py-3 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg hover:text-blue-600 dark:hover:text-blue-400"
              >
                Всё подряд
              </Link>
              <Link
                to="/categories"
                onClick={closeMenu}
                className="py-3 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg hover:text-blue-600 dark:hover:text-blue-400"
              >
                По категориям
              </Link>
              <Link
                to="/about"
                onClick={closeMenu}
                className="py-3 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg hover:text-blue-600 dark:hover:text-blue-400"
              >
                О форуме
              </Link>
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={closeMenu}
                    className="py-3 px-2 flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <NavbarAvatar avatarUrl={user.avatar_url} username={user.username} />
                    <span>{user.username}</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="py-3 px-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg font-medium"
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="py-3 px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Вход
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="py-3 px-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 text-center font-medium"
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
