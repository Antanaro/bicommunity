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
  last_post_at: string | null;
  last_post_author: string | null;
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

  const handleDeleteTopic = async (topicId: number, topicTitle: string) => {
    if (!window.confirm(`Вы уверены, что хотите удалить тему "${topicTitle}"?\n\nЭто действие удалит все сообщения в этой теме и не может быть отменено.`)) {
      return;
    }

    try {
      await api.delete(`/topics/${topicId}`);
      fetchTopics();
    } catch (error: any) {
      console.error('Error deleting topic:', error);
      if (error.response?.status === 403) {
        alert('Требуются права администратора');
      } else {
        alert('Ошибка при удалении темы');
      }
    }
  };

  const isAdmin = user?.role === 'admin';

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
            <div
              key={topic.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition relative group"
            >
              <Link to={`/topic/${topic.id}`} className="block pr-10">
                <h2 className="text-xl font-semibold mb-2 text-gray-800 hover:text-blue-600 transition">
                  {topic.title}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-2">{topic.content}</p>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 border-t pt-3">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">Автор темы:</span>
                    <span>{topic.author_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">Сообщений:</span>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold">
                      {topic.post_count || 0}
                    </span>
                  </div>
                  
                  {topic.last_post_author && topic.last_post_at && (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-gray-400">Последнее сообщение:</span>
                      <span className="font-medium text-gray-700">{topic.last_post_author}</span>
                      <span className="text-gray-400">
                        {new Date(topic.last_post_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteTopic(topic.id, topic.title);
                  }}
                  className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition opacity-0 group-hover:opacity-100"
                  title="Удалить тему"
                >
                  🗑️
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Category;
