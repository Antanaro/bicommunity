import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Post {
  id: number;
  content: string;
  author_name: string;
  like_count: string;
  created_at: string;
  author_id: number;
}

interface Topic {
  id: number;
  title: string;
  content: string;
  author_name: string;
  category_name: string;
  category_id: number;
  created_at: string;
  posts: Post[];
}

const Topic = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (id) {
      fetchTopic();
    }
  }, [id]);

  const fetchTopic = async () => {
    try {
      const response = await api.get(`/topics/${id}`);
      setTopic(response.data);
    } catch (error) {
      console.error('Error fetching topic:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPost.trim()) return;

    try {
      await api.post('/posts', {
        content: newPost,
        topic_id: id,
      });
      setNewPost('');
      fetchTopic();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Ошибка при создании сообщения');
    }
  };

  const handleLike = async (postId: number) => {
    if (!user) {
      alert('Необходимо войти в систему');
      return;
    }

    try {
      const response = await api.post(`/posts/${postId}/like`);
      const isLiked = response.data.liked;

      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(postId);
        } else {
          newSet.delete(postId);
        }
        return newSet;
      });

      fetchTopic();
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="text-center text-gray-500">
        Тема не найдена
      </div>
    );
  }

  return (
    <div>
      <Link
        to={`/category/${topic.category_id}`}
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        ← Назад к категории
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-3xl font-bold mb-2">{topic.title}</h1>
        <div className="text-sm text-gray-500 mb-4">
          Автор: {topic.author_name} • {new Date(topic.created_at).toLocaleString('ru-RU')}
        </div>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">{topic.content}</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Сообщения ({topic.posts.length})</h2>

      {user && (
        <form onSubmit={handleSubmitPost} className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Добавить сообщение</h3>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Ваше сообщение..."
            className="w-full border rounded px-4 py-2 mb-4 h-32"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            Отправить
          </button>
        </form>
      )}

      <div className="space-y-4">
        {topic.posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Пока нет сообщений. Будьте первым!
          </div>
        ) : (
          topic.posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold">{post.author_name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {new Date(post.created_at).toLocaleString('ru-RU')}
                  </span>
                </div>
                {user && (
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`px-3 py-1 rounded transition ${
                      likedPosts.has(post.id)
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    ❤️ {post.like_count || 0}
                  </button>
                )}
              </div>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{post.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Topic;
