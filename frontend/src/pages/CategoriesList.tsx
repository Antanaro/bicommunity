import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import SeoHead from '../components/SeoHead';
import { useAuth } from '../contexts/AuthContext';
import PieChart from '../components/PieChart';
import LinkifyText from '../components/LinkifyText';

interface Category {
  id: number;
  name: string;
  description: string;
  topic_count: string;
  post_count?: number;
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

const CategoriesList = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [mostUpvoted, setMostUpvoted] = useState<TopPost | null>(null);
  const [mostDownvoted, setMostDownvoted] = useState<TopPost | null>(null);
  const [topDiscussed, setTopDiscussed] = useState<TopTopic[]>([]);

  const pieChartData = useMemo(() => {
    const generateRandomSegments = () => {
      const values: number[] = [];
      for (let i = 0; i < 3; i++) {
        values.push(Math.floor(Math.random() * 41) + 10);
      }
      const sum = values.reduce((a, b) => a + b, 0);
      const normalized = values.map(v => Math.round((v / sum) * 100));
      const currentSum = normalized.reduce((a, b) => a + b, 0);
      if (currentSum !== 100) {
        normalized[2] += (100 - currentSum);
      }
      const allValid = normalized.every(v => v >= 10 && v <= 50);
      if (!allValid) {
        const segments: number[] = [];
        let remaining = 100;
        for (let i = 0; i < 2; i++) {
          const max = Math.min(50, remaining - 10 * (2 - i));
          const min = 10;
          const value = Math.floor(Math.random() * (max - min + 1)) + min;
          segments.push(value);
          remaining -= value;
        }
        segments.push(Math.max(10, remaining));
        return segments;
      }
      return normalized;
    };
    return generateRandomSegments();
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      let categoriesData = response.data;
      const allTopicsCategory = categoriesData.find((cat: Category) => cat.name === 'Все темы');

      if (allTopicsCategory) {
        try {
          const countResponse = await api.get<{ count: number; posts_count: number }>('/topics/count');
          allTopicsCategory.topic_count = String(countResponse.data.count);
          allTopicsCategory.post_count = countResponse.data.posts_count ?? 0;
        } catch (err) {
          console.error('Error fetching topics count:', err);
        }
        categoriesData = categoriesData.filter((cat: Category) => cat.name !== 'Все темы');
        setCategories([allTopicsCategory, ...categoriesData]);
      } else {
        try {
          const countResponse = await api.get<{ count: number; posts_count: number }>('/topics/count');
          const virtual = {
            id: 'all-topics',
            name: 'Все темы',
            description: 'Все темы форума',
            topic_count: String(countResponse.data.count),
            post_count: countResponse.data.posts_count ?? 0,
            created_at: new Date().toISOString(),
          };
          setCategories([virtual, ...categoriesData]);
        } catch (err) {
          console.error('Error fetching all topics:', err);
          setCategories(categoriesData);
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
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
    } catch (err) {
      console.error('Error fetching stats:', err);
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
    } catch (err: any) {
      console.error('Error creating category:', err);
      if (err.response?.status === 403) {
        setError('Требуются права администратора');
      } else if (err.response?.data?.errors) {
        setError(err.response.data.errors[0].msg || 'Ошибка при создании категории');
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
    } catch (err: any) {
      console.error('Error deleting category:', err);
      if (err.response?.status === 403) {
        alert('Требуются права администратора');
      } else {
        alert('Ошибка при удалении категории');
      }
    }
  };

  const isAdmin = user?.role === 'admin';
  const truncateText = (text: string, maxLength: number) =>
    text.length <= maxLength ? text : text.substring(0, maxLength) + '...';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Загрузка категорий...</div>
      </div>
    );
  }

  return (
    <div style={{ overflow: 'visible' }}>
      <SeoHead
        title="Категории"
        description="Категории форума BI Community: DWH, ETL, визуализация, BI-инструменты и другие разделы."
        canonical="/categories"
      />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="pie-chart-button hidden sm:block flex-shrink-0"
            title="Интерактивная статистика форума"
            style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}
          >
            <PieChart size={40} data={pieChartData} colors={['#3b82f6', '#10b981', '#ef4444']} className="pie-chart" />
          </div>
          <h1 className="text-xl sm:text-3xl font-bold truncate">По категориям</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-500 text-white px-4 py-2.5 rounded hover:bg-blue-600 transition text-sm w-full sm:w-auto min-h-[44px] sm:min-h-0"
          >
            {showForm ? '✕ Отмена' : '+ Создать категорию'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg shadow p-4 border-l-4 border-green-500 dark:border-green-400">
          <h3 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-300 flex items-center gap-2">
            <span>👍</span> Самое залайканное
          </h3>
          {mostUpvoted ? (
            <Link to={`/topic/${mostUpvoted.topic_id}`} className="block hover:opacity-80 transition">
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                <span className="font-semibold">{mostUpvoted.author_name}</span>
                <span className="text-gray-500 ml-2">в теме "{truncateText(mostUpvoted.topic_title, 30)}"</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                <LinkifyText text={truncateText(mostUpvoted.content, 100)} />
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

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-lg shadow p-4 border-l-4 border-red-500 dark:border-red-400">
          <h3 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-300 flex items-center gap-2">
            <span>👎</span> Самое задизлайканное
          </h3>
          {mostDownvoted ? (
            <Link to={`/topic/${mostDownvoted.topic_id}`} className="block hover:opacity-80 transition">
              <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                <span className="font-semibold">{mostDownvoted.author_name}</span>
                <span className="text-gray-500 ml-2">в теме "{truncateText(mostDownvoted.topic_title, 30)}"</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                <LinkifyText text={truncateText(mostDownvoted.content, 100)} />
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

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg shadow p-4 border-l-4 border-blue-500 dark:border-blue-400">
          <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <span>💬</span> Топ-3 обсуждаемых
          </h3>
          {topDiscussed.length > 0 ? (
            <div className="space-y-2">
              {topDiscussed.map((topic, index) => (
                <Link key={topic.id} to={`/topic/${topic.id}`} className="block hover:opacity-80 transition">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold text-sm">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
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
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Новая категория</h2>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
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
            <label className="block text-gray-700 text-sm font-bold mb-2">Описание (необязательно)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Введите описание категории"
              className="w-full border rounded px-4 py-2 h-24"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition">
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          {isAdmin ? (
            <p>Пока нет категорий. Создайте первую категорию, используя форму выше.</p>
          ) : (
            <p>Пока нет категорий.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition relative group border border-gray-200 dark:border-gray-700"
            >
              <Link to={`/category/${category.id}`} className="block">
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{category.name}</h2>
                {category.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-3">{category.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>Тем: {category.topic_count || 0}</span>
                  <span>•</span>
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                    💬 {Number(category.post_count) || 0}
                  </span>
                </div>
              </Link>
              {isAdmin && category.name !== 'Все темы' && (
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

export default CategoriesList;
