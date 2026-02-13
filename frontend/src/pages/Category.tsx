import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, uploadImages } from '../services/api';
import SeoHead from '../components/SeoHead';
import { useAuth } from '../contexts/AuthContext';
import LinkifyText from '../components/LinkifyText';

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

interface CategoryOption {
  id: number;
  name: string;
}

const Category = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [category, setCategory] = useState<any>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', category_id: '' });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  useEffect(() => {
    if (id) {
      fetchCategory();
    }
  }, [id]);

  useEffect(() => {
    if (category) {
      fetchTopics();
    }
  }, [category]);

  useEffect(() => {
    // Загружаем список категорий для выбора при создании темы в "Все темы"
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        // Исключаем категорию "Все темы" из списка для выбора
        const categoriesData = response.data.filter((cat: CategoryOption) => cat.name !== 'Все темы');
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const fetchCategory = async () => {
    try {
      // Если это виртуальная категория "Все темы"
      if (id === 'all-topics') {
        setCategory({
          id: 'all-topics',
          name: 'Все темы',
          description: 'Все темы форума'
        });
        return;
      }
      const response = await api.get(`/categories/${id}`);
      const categoryData = response.data;
      // Проверяем, является ли это категорией "Все темы" по названию
      if (categoryData.name === 'Все темы') {
        setCategory(categoryData);
        return;
      }
      setCategory(categoryData);
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      // Если категория "Все темы", получаем все темы без фильтрации
      let currentCategory = category;
      if (!currentCategory && id) {
        if (id === 'all-topics') {
          currentCategory = { name: 'Все темы' };
        } else {
          try {
            currentCategory = (await api.get(`/categories/${id}`)).data;
          } catch (error) {
            console.error('Error fetching category:', error);
          }
        }
      }
      const isAllTopicsCategory = currentCategory?.name === 'Все темы' || id === 'all-topics';
      const url = isAllTopicsCategory ? '/topics' : `/topics?category_id=${id}`;
      const response = await api.get(url);
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

    // Для категории "Все темы" нужна реальная категория
    const isAllTopicsCategory = category?.name === 'Все темы' || id === 'all-topics';
    const categoryId = isAllTopicsCategory ? formData.category_id : id;

    if (!categoryId) {
      alert('Пожалуйста, выберите категорию');
      return;
    }

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
        category_id: categoryId,
        images: imageUrls,
      });
      setFormData({ title: '', content: '', category_id: '' });
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
        <div className="text-gray-600 dark:text-gray-400">Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      {category && (
        <SeoHead
          title={category.name}
          description={category.description || `Темы в категории «${category.name}» на форуме BI Community`}
          canonical={`/category/${id}`}
        />
      )}
      <Link to="/categories" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block py-2 min-h-[44px] flex items-center">
        ← Назад к категориям
      </Link>
      {category && (
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{category.name}</h1>
          {category.description && (
            <p className="text-gray-600 dark:text-gray-400">{category.description}</p>
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
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Новая тема</h3>
              {(category?.name === 'Все темы' || id === 'all-topics') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Категория *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="">Выберите категорию</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <input
                type="text"
                placeholder="Название темы"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-4 py-2 mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <textarea
                placeholder="Содержание темы"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-4 py-2 mb-4 h-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Изображения (до 10 шт.)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-4 py-2 mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                    setFormData({ title: '', content: '', category_id: '' });
                    setSelectedImages([]);
                  }}
                  className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
            {category?.name === 'Все темы' ? 'Пока нет тем на форуме.' : 'Пока нет тем в этой категории.'}
          </div>
        ) : (
          topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 hover:shadow-lg transition relative group border border-gray-200 dark:border-gray-700"
            >
              <Link to={`/topic/${topic.id}`} className="block pr-10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                  {/* Название — всегда первое */}
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition break-words">
                      {topic.title}
                    </span>
                    {category?.name === 'Все темы' && topic.category_name && (
                      <span className="text-blue-600 dark:text-blue-400 text-xs">[{topic.category_name}]</span>
                    )}
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium text-xs">
                      💬 {topic.post_count || 0}
                    </span>
                  </div>
                  {/* Содержание — только на десктопе или укороченно */}
                  <span className="text-gray-600 dark:text-gray-400 truncate sm:max-w-[200px] lg:max-w-xs text-xs sm:text-sm hidden sm:block">
                    <LinkifyText text={topic.content.substring(0, 60) + (topic.content.length > 60 ? '...' : '')} />
                  </span>
                  {/* Мета: автор, даты — в одну строку на мобильном */}
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>{topic.author_name}</span>
                    <span>•</span>
                    <span>
                      {new Date(topic.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {topic.last_post_author && (
                      <>
                        <span>•</span>
                        <span>последний: {topic.last_post_author}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
              
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteTopic(topic.id, topic.title);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1.5 rounded hover:bg-red-600 transition opacity-80 sm:opacity-0 sm:group-hover:opacity-100 text-xs min-h-[36px] min-w-[36px]"
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
