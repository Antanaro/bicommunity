import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Topic {
  id: number;
  title: string;
  content: string;
  author_name: string;
  category_name: string;
  post_count: string;
  last_post_at: string;
  created_at: string;
}

const Category = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [category, setCategory] = useState<any>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    if (id) {
      fetchCategory();
      fetchTopics();
    }
  }, [id]);

  const fetchCategory = async () => {
    try {
      const response = await api.get(`/categories/${id}`);
      setCategory(response.data);
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await api.get(`/topics?category_id=${id}`);
      setTopics(response.data);
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await api.post('/topics', {
        title: formData.title,
        content: formData.content,
        category_id: id,
      });
      setFormData({ title: '', content: '' });
      setShowForm(false);
      fetchTopics();
    } catch (error) {
      console.error('Error creating topic:', error);
      alert('Ошибка при создании темы');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Назад к категориям
      </Link>
      {category && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-gray-600">{category.description}</p>
          )}
        </div>
      )}

      {user && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Создать новую тему
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-4">
              <h3 className="text-lg font-semibold mb-4">Новая тема</h3>
              <input
                type="text"
                placeholder="Название темы"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border rounded px-4 py-2 mb-4"
                required
              />
              <textarea
                placeholder="Содержание темы"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full border rounded px-4 py-2 mb-4 h-32"
                required
              />
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
                    setFormData({ title: '', content: '' });
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="space-y-4">
        {topics.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Пока нет тем в этой категории.
          </div>
        ) : (
          topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/topic/${topic.id}`}
              className="block bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold mb-2">{topic.title}</h2>
              <p className="text-gray-600 mb-3 line-clamp-2">{topic.content}</p>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Автор: {topic.author_name}</span>
                <span>Сообщений: {topic.post_count || 0}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Category;
