import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, uploadImages } from '../services/api';
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
  images?: string[];
}

const Category = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [category, setCategory] = useState<any>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

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
      setUploadingImages(true);
      let imageUrls: string[] = [];

      // Upload images if any
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages(selectedImages);
      }

      await api.post('/topics', {
        title: formData.title,
        content: formData.content,
        category_id: id,
        images: imageUrls,
      });
      setFormData({ title: '', content: '' });
      setSelectedImages([]);
      setShowForm(false);
      fetchTopics();
    } catch (error) {
      console.error('Error creating topic:', error);
      alert('Ошибка при создании темы');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      // Limit to 10 images
      const limitedFiles = files.slice(0, 10);
      setSelectedImages((prev) => [...prev, ...limitedFiles].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Изображения (до 10 шт.)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="w-full border rounded px-4 py-2 mb-2"
                />
                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
                  disabled={uploadingImages}
                >
                  {uploadingImages ? 'Загрузка...' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ title: '', content: '' });
                    setSelectedImages([]);
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
              className="bg-white rounded-lg shadow p-3 hover:shadow-lg transition relative group"
            >
              <Link to={`/topic/${topic.id}`} className="block pr-10">
                <div className="flex items-center gap-2 text-sm overflow-hidden">
                  {/* Название темы */}
                  <span className="font-semibold text-gray-800 hover:text-blue-600 transition flex-shrink-0">
                    {topic.title}
                  </span>
                  <span className="text-gray-300 flex-shrink-0">•</span>
                  
                  {/* Начало содержания */}
                  <span className="text-gray-600 truncate flex-1 min-w-0">
                    {topic.content.substring(0, 80)}{topic.content.length > 80 ? '...' : ''}
                  </span>
                  <span className="text-gray-300 flex-shrink-0">•</span>
                  
                  {/* Количество сообщений */}
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0 text-xs">
                    {topic.post_count || 0}
                  </span>
                  <span className="text-gray-300 flex-shrink-0">•</span>
                  
                  {/* Автор */}
                  <span className="text-gray-700 flex-shrink-0">
                    {topic.author_name}
                  </span>
                  <span className="text-gray-300 flex-shrink-0">•</span>
                  
                  {/* Дата и время создания */}
                  <span className="text-gray-500 flex-shrink-0 text-xs">
                    {new Date(topic.created_at).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="text-gray-300 flex-shrink-0">•</span>
                  
                  {/* Логин последнего комментатора */}
                  {topic.last_post_author ? (
                    <span className="text-gray-700 flex-shrink-0">
                      {topic.last_post_author}
                    </span>
                  ) : (
                    <span className="text-gray-400 flex-shrink-0 text-xs">—</span>
                  )}
                  <span className="text-gray-300 flex-shrink-0">•</span>
                  
                  {/* Дата и время последнего комментария */}
                  {topic.last_post_at ? (
                    <span className="text-gray-500 flex-shrink-0 text-xs">
                      {new Date(topic.last_post_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  ) : (
                    <span className="text-gray-400 flex-shrink-0 text-xs">—</span>
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
                  className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition opacity-0 group-hover:opacity-100 text-xs"
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
