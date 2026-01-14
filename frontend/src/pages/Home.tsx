import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PieChart from '../components/PieChart';

interface Category {
  id: number;
  name: string;
  description: string;
  topic_count: string;
  created_at: string;
}

interface TopPost {
  id: number;
  content: string;
  author_name: string;
  topic_id: number;
  topic_title: string;
  upvote_count?: number;
  downvote_count?: number;
  created_at: string;
}

interface TopTopic {
  id: number;
  title: string;
  content: string;
  author_name: string;
  category_name: string;
  post_count: number;
  created_at: string;
}

const Home = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [mostUpvoted, setMostUpvoted] = useState<TopPost | null>(null);
  const [mostDownvoted, setMostDownvoted] = useState<TopPost | null>(null);
  const [topDiscussed, setTopDiscussed] = useState<TopTopic[]>([]);

  // Генерируем случайные размеры сегментов от 10 до 50 процентов
  const pieChartData = useMemo(() => {
    const generateRandomSegments = () => {
      // Генерируем три случайных значения от 10 до 50
      const values: number[] = [];
      for (let i = 0; i < 3; i++) {
        values.push(Math.floor(Math.random() * 41) + 10); // От 10 до 50
      }
      
      // Нормализуем, чтобы сумма была 100
      const sum = values.reduce((a, b) => a + b, 0);
      const normalized = values.map(v => Math.round((v / sum) * 100));
      
      // Проверяем, что сумма точно 100 (может быть погрешность из-за округления)
      const currentSum = normalized.reduce((a, b) => a + b, 0);
      if (currentSum !== 100) {
        normalized[2] += (100 - currentSum); // Корректируем последний сегмент
      }
      
      // Проверяем, что все значения в диапазоне 10-50
      // Если нет, перегенерируем
      const allValid = normalized.every(v => v >= 10 && v <= 50);
      if (!allValid) {
        // Если значения вышли за пределы, используем более простой алгоритм
        const segments: number[] = [];
        let remaining = 100;
        
        for (let i = 0; i < 2; i++) {
          const max = Math.min(50, remaining - 10 * (2 - i));
          const min = 10;
          const value = Math.floor(Math.random() * (max - min + 1)) + min;
          segments.push(value);
          remaining -= value;
        }
        segments.push(Math.max(10, remaining)); // Гарантируем минимум 10
        return segments;
      }
      
      return normalized;
    };
    
    return generateRandomSegments();
  }, []); // Генерируется один раз при монтировании компонента

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [upvotedRes, downvotedRes, discussedRes] = await Promise.all([
        api.get('/stats/most-upvoted').catch(() => ({ data: null })),
        api.get('/stats/most-downvoted').catch(() => ({ data: null })),
        api.get('/stats/top-discussed').catch(() => ({ data: [] })),
      ]);

      setMostUpvoted(upvotedRes.data);
      setMostDownvoted(downvotedRes.data);
      setTopDiscussed(discussedRes.data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Название категории обязательно');
      return;
    }

    try {
      await api.post('/categories', {
        name: formData.name,
        description: formData.description || undefined,
      });
      setFormData({ name: '', description: '' });
      setShowForm(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      if (error.response?.status === 403) {
        setError('Требуются права администратора');
      } else if (error.response?.data?.errors) {
        setError(error.response.data.errors[0].msg || 'Ошибка при создании категории');
      } else {
        setError('Ошибка при создании категории');
      }
    }
  };

  const handleDeleteCategory = async (categoryId: number, categoryName: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить категорию "${categoryName}"?\n\nЭто действие удалит все темы и сообщения в этой категории и не может быть отменено.`)) {
      return;
    }

    try {
      await api.delete(`/categories/${categoryId}`);
      fetchCategories();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      if (error.response?.status === 403) {
        alert('Требуются права администратора');
      } else {
        alert('Ошибка при удалении категории');
      }
    }
  };

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Загрузка категорий...</div>
      </div>
    );
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div style={{ overflow: 'visible' }}>
      <div className="flex justify-between items-center mb-6" style={{ overflow: 'visible', position: 'relative' }}>
        <div className="flex items-center gap-3" style={{ position: 'relative' }}>
          <div 
            className="pie-chart-button" 
            title="Интерактивная статистика форума"
            style={{
              position: 'absolute',
              left: '-70px',
              top: '50%',
              transform: 'translateY(-50%)',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
            }}
          >
            <PieChart 
              size={50} 
              data={pieChartData} // Случайные пропорции от 10 до 50 процентов
              colors={['#3b82f6', '#10b981', '#ef4444']} // Синий, зеленый, красный - цвета форума
              className="pie-chart"
            />
          </div>
          <h1 className="text-3xl font-bold">Категории форума</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            {showForm ? '✕ Отмена' : '+ Создать категорию'}
          </button>
        )}
      </div>

      {/* Statistics Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Most Upvoted Post */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-4 border-l-4 border-green-500">
          <h3 className="text-lg font-semibold mb-2 text-green-800 flex items-center gap-2">
            <span>👍</span> Самое залайканное
          </h3>
          {mostUpvoted ? (
            <Link
              to={`/topic/${mostUpvoted.topic_id}`}
              className="block hover:opacity-80 transition"
            >
              <div className="text-sm text-gray-700 mb-1">
                <span className="font-semibold">{mostUpvoted.author_name}</span>
                <span className="text-gray-500 ml-2">
                  в теме "{truncateText(mostUpvoted.topic_title, 30)}"
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {truncateText(mostUpvoted.content, 100)}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-green-500 text-white px-2 py-1 rounded font-semibold">
                  👍 {mostUpvoted.upvote_count || 0}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(mostUpvoted.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-gray-500">Пока нет залайканных сообщений</p>
          )}
        </div>

        {/* Most Downvoted Post */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow p-4 border-l-4 border-red-500">
          <h3 className="text-lg font-semibold mb-2 text-red-800 flex items-center gap-2">
            <span>👎</span> Самое задизлайканное
          </h3>
          {mostDownvoted ? (
            <Link
              to={`/topic/${mostDownvoted.topic_id}`}
              className="block hover:opacity-80 transition"
            >
              <div className="text-sm text-gray-700 mb-1">
                <span className="font-semibold">{mostDownvoted.author_name}</span>
                <span className="text-gray-500 ml-2">
                  в теме "{truncateText(mostDownvoted.topic_title, 30)}"
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {truncateText(mostDownvoted.content, 100)}
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-red-500 text-white px-2 py-1 rounded font-semibold">
                  👎 {mostDownvoted.downvote_count || 0}
                </span>
                <span className="text-gray-500 text-xs">
                  {new Date(mostDownvoted.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-gray-500">Пока нет задизлайканных сообщений</p>
          )}
        </div>

        {/* Top 3 Most Discussed Topics */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-4 border-l-4 border-blue-500">
          <h3 className="text-lg font-semibold mb-2 text-blue-800 flex items-center gap-2">
            <span>💬</span> Топ-3 обсуждаемых
          </h3>
          {topDiscussed.length > 0 ? (
            <div className="space-y-2">
              {topDiscussed.map((topic, index) => (
                <Link
                  key={topic.id}
                  to={`/topic/${topic.id}`}
                  className="block hover:opacity-80 transition"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-sm">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {truncateText(topic.title, 40)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>💬 {topic.post_count}</span>
                        <span>•</span>
                        <span>{topic.category_name}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Пока нет обсуждаемых тем</p>
          )}
        </div>
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Новая категория</h2>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Название категории <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название категории"
              className="w-full border rounded px-4 py-2"
              required
              maxLength={100}
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Описание (необязательно)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Введите описание категории"
              className="w-full border rounded px-4 py-2 h-24"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Создать
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ name: '', description: '' });
                setError(null);
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {categories.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          {isAdmin ? (
            <p>Пока нет категорий. Создайте первую категорию, используя форму выше.</p>
          ) : (
            <p>Пока нет категорий.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition relative group"
            >
              <Link to={`/category/${category.id}`} className="block">
                <h2 className="text-xl font-semibold mb-2">{category.name}</h2>
                {category.description && (
                  <p className="text-gray-600 mb-3">{category.description}</p>
                )}
                <div className="text-sm text-gray-500">
                  Тем: {category.topic_count || 0}
                </div>
              </Link>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteCategory(category.id, category.name);
                  }}
                  className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                  title="Удалить категорию"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
