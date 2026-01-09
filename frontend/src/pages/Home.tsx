import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface Category {
  id: number;
  name: string;
  description: string;
  topic_count: string;
  created_at: string;
}

const Home = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Загрузка категорий...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Категории форума</h1>
      {categories.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Пока нет категорий. Создайте первую категорию через API (требуются права администратора).
        </div>
      ) : (
        <div className="grid gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold mb-2">{category.name}</h2>
              {category.description && (
                <p className="text-gray-600 mb-3">{category.description}</p>
              )}
              <div className="text-sm text-gray-500">
                Тем: {category.topic_count || 0}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
