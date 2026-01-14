import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, uploadImages } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LinkifyText from '../components/LinkifyText';

interface Post {
  id: number;
  content: string;
  author_name: string;
  upvote_count: number;
  downvote_count: number;
  created_at: string;
  author_id: number;
  parent_id: number | null;
  parent_author_name: string | null;
  images?: string[];
}

interface PostWithReplies extends Post {
  replies: PostWithReplies[];
}

interface PostComponentProps {
  post: PostWithReplies;
  user: any;
  reactions: Map<number, number | null>; // postId -> reaction_type (1, -1, or null)
  onReact: (postId: number, reactionType: number) => void;
  onReply: (postId: number) => void;
  level: number;
  allPosts: Post[];
}

const PostComponent = ({
  post,
  user,
  reactions,
  onReact,
  onReply,
  level,
  allPosts,
}: PostComponentProps) => {
  const [showQuote, setShowQuote] = useState(true);
  const parentPost = post.parent_id ? allPosts.find((p) => p.id === post.parent_id) : null;
  const userReaction = reactions.get(post.id) || null;

  return (
    <div className={level > 0 ? 'mt-2' : ''}>
      <div
        className={`bg-white rounded-lg shadow p-6 ${
          level > 0 ? 'border-l-4 border-blue-300' : ''
        }`}
      >
        {post.parent_id && parentPost && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowQuote(!showQuote)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-2"
            >
              {showQuote ? '▼' : '▶'} Цитата сообщения {parentPost.author_name}
            </button>
            {showQuote && (
              <blockquote className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-r text-sm">
                <div className="text-gray-600 mb-1">
                  <span className="font-semibold">{parentPost.author_name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {new Date(parentPost.created_at).toLocaleString('ru-RU')}
                  </span>
                </div>
                    <p className="whitespace-pre-wrap text-gray-700">
                      <LinkifyText text={parentPost.content} />
                    </p>
                    {parentPost.images && parentPost.images.length > 0 && (
                      <div className={`mt-2 gap-2 ${parentPost.images.length > 1 ? 'grid grid-cols-2' : 'flex'}`}>
                        {parentPost.images.map((imageUrl, index) => {
                          const fullUrl = imageUrl.startsWith('http') ? imageUrl : (import.meta.env.VITE_API_URL || '') + imageUrl;
                          return (
                            <img
                              key={index}
                              src={fullUrl}
                              alt={`Image ${index + 1}`}
                              className={parentPost.images.length > 1 ? 'w-1/2 h-auto rounded border' : 'w-1/4 max-w-[25%] h-auto rounded border'}
                            />
                          );
                        })}
                      </div>
                    )}
              </blockquote>
            )}
          </div>
        )}
        <div className="flex justify-between items-start mb-2">
          <div>
            <span className="font-semibold">{post.author_name}</span>
            <span className="text-sm text-gray-500 ml-2">
              {new Date(post.created_at).toLocaleString('ru-RU')}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            {user && (
              <>
                <button
                  onClick={() => onReply(post.id)}
                  className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm"
                >
                  Ответить
                </button>
                <button
                  onClick={() => onReact(post.id, 1)}
                  className={`px-3 py-1 rounded transition flex items-center gap-1 ${
                    userReaction === 1
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                  }`}
                >
                  👍 {post.upvote_count || 0}
                </button>
                <button
                  onClick={() => onReact(post.id, -1)}
                  className={`px-3 py-1 rounded transition flex items-center gap-1 ${
                    userReaction === -1
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                  }`}
                >
                  👎 {post.downvote_count || 0}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">
            <LinkifyText text={post.content} />
          </p>
          {post.images && post.images.length > 0 && (
            <div className={`mt-4 gap-2 ${post.images.length > 1 ? 'grid grid-cols-2' : 'flex'}`}>
              {post.images.map((imageUrl, index) => {
                const fullUrl = imageUrl.startsWith('http') ? imageUrl : (import.meta.env.VITE_API_URL || '') + imageUrl;
                return (
                  <img
                    key={index}
                    src={fullUrl}
                    alt={`Image ${index + 1}`}
                    className={post.images.length > 1 ? 'w-1/2 h-auto rounded border cursor-pointer hover:opacity-90' : 'w-1/4 max-w-[25%] h-auto rounded border cursor-pointer hover:opacity-90'}
                    onClick={() => window.open(fullUrl, '_blank')}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
      {post.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {post.replies.map((reply) => (
            <PostComponent
              key={reply.id}
              post={reply}
              user={user}
              reactions={reactions}
              onReact={onReact}
              onReply={onReply}
              level={level + 1}
              allPosts={allPosts}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface Topic {
  id: number;
  title: string;
  content: string;
  author_name: string;
  category_name: string;
  category_id: number;
  created_at: string;
  posts: Post[];
  images?: string[];
}

const Topic = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [showQuote, setShowQuote] = useState(true);
  const [reactions, setReactions] = useState<Map<number, number | null>>(new Map());
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTopic();
    }
  }, [id]);

  const fetchTopic = async () => {
    try {
      const response = await api.get(`/topics/${id}`);
      // Convert string counts to numbers
      if (response.data.posts) {
        response.data.posts = response.data.posts.map((post: any) => ({
          ...post,
          upvote_count: parseInt(post.upvote_count) || 0,
          downvote_count: parseInt(post.downvote_count) || 0,
        }));
      }
      setTopic(response.data);
      
      // Fetch user reactions for all posts
      if (user && response.data.posts) {
        const reactionsMap = new Map<number, number | null>();
        for (const post of response.data.posts) {
          try {
            const reactionResponse = await api.get(`/posts/${post.id}/reaction`);
            reactionsMap.set(post.id, reactionResponse.data.reaction_type);
          } catch (error) {
            reactionsMap.set(post.id, null);
          }
        }
        setReactions(reactionsMap);
      }
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
      setUploadingImages(true);
      let imageUrls: string[] = [];

      // Upload images if any
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages(selectedImages);
      }

      await api.post('/posts', {
        content: newPost,
        topic_id: id,
        parent_id: replyingTo || undefined,
        images: imageUrls,
      });
      setNewPost('');
      setSelectedImages([]);
      setReplyingTo(null);
      fetchTopic();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Ошибка при создании сообщения');
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

  const handleReply = (postId: number) => {
    setReplyingTo(postId);
    setShowQuote(true);
    // Scroll to form
    setTimeout(() => {
      const form = document.getElementById('reply-form');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const textarea = form.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }
    }, 100);
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewPost('');
    setSelectedImages([]);
    setShowQuote(true);
  };

  const getReplyingToPost = () => {
    if (!replyingTo || !topic) return null;
    return topic.posts.find((p) => p.id === replyingTo);
  };

  // Organize posts into tree structure
  const organizePosts = (posts: Post[]): PostWithReplies[] => {
    const postMap = new Map<number, PostWithReplies>();
    const rootPosts: PostWithReplies[] = [];

    // Create map of all posts with replies array
    posts.forEach((post) => {
      postMap.set(post.id, { ...post, replies: [] });
    });

    // Organize into tree
    posts.forEach((post) => {
      const postWithReplies = postMap.get(post.id)!;
      if (post.parent_id) {
        const parent = postMap.get(post.parent_id);
        if (parent) {
          parent.replies.push(postWithReplies);
        } else {
          // Parent not found, treat as root
          rootPosts.push(postWithReplies);
        }
      } else {
        rootPosts.push(postWithReplies);
      }
    });

    return rootPosts;
  };

  const handleReact = async (postId: number, reactionType: number) => {
    if (!user) {
      alert('Необходимо войти в систему');
      return;
    }

    try {
      const response = await api.post(`/posts/${postId}/react`, {
        reaction_type: reactionType,
      });

      setReactions((prev) => {
        const newMap = new Map(prev);
        if (response.data.removed) {
          newMap.set(postId, null);
        } else {
          newMap.set(postId, response.data.reaction_type);
        }
        return newMap;
      });

      // Immediately update the topic to refresh counters
      await fetchTopic();
    } catch (error: any) {
      console.error('Error reacting to post:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error + (error.response.data.hint ? '\n\n' + error.response.data.hint : ''));
      } else {
        alert('Ошибка при добавлении реакции');
      }
    }
  };

  const handleDeleteTopic = async () => {
    if (!topic) return;

    if (!window.confirm(`Вы уверены, что хотите удалить тему "${topic.title}"?\n\nЭто действие удалит все сообщения в этой теме и не может быть отменено.`)) {
      return;
    }

    try {
      await api.delete(`/topics/${topic.id}`);
      navigate(`/category/${topic.category_id}`);
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

      <div className="bg-white rounded-lg shadow p-6 mb-6 relative">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold">{topic.title}</h1>
          {isAdmin && (
            <button
              onClick={handleDeleteTopic}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
              title="Удалить тему"
            >
              🗑️ Удалить тему
            </button>
          )}
        </div>
        <div className="text-sm text-gray-500 mb-4">
          Автор: {topic.author_name} • {new Date(topic.created_at).toLocaleString('ru-RU')}
        </div>
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap">
            <LinkifyText text={topic.content} />
          </p>
          {topic.images && topic.images.length > 0 && (
            <div className={`mt-4 gap-2 ${topic.images.length > 1 ? 'grid grid-cols-2' : 'flex'}`}>
              {topic.images.map((imageUrl, index) => {
                const fullUrl = imageUrl.startsWith('http') ? imageUrl : (import.meta.env.VITE_API_URL || '') + imageUrl;
                return (
                  <img
                    key={index}
                    src={fullUrl}
                    alt={`Image ${index + 1}`}
                    className={topic.images.length > 1 ? 'w-1/2 h-auto rounded border cursor-pointer hover:opacity-90' : 'w-1/4 max-w-[25%] h-auto rounded border cursor-pointer hover:opacity-90'}
                    onClick={() => window.open(fullUrl, '_blank')}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Сообщения ({topic.posts.length})</h2>

      <div className="space-y-4 mb-6">
        {topic.posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            Пока нет сообщений. Будьте первым!
          </div>
        ) : (
          organizePosts(topic.posts).map((post) => (
            <PostComponent
              key={post.id}
              post={post}
              user={user}
              reactions={reactions}
              onReact={handleReact}
              onReply={handleReply}
              level={0}
              allPosts={topic.posts}
            />
          ))
        )}
      </div>

      {user && (
        <form
          id="reply-form"
          onSubmit={handleSubmitPost}
          className="bg-white rounded-lg shadow p-6"
        >
          {replyingTo && (() => {
            const replyingToPost = getReplyingToPost();
            if (!replyingToPost) return null;
            
            return (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <button
                    type="button"
                    onClick={() => setShowQuote(!showQuote)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {showQuote ? '▼' : '▶'} Цитата сообщения {replyingToPost.author_name}
                  </button>
                  <button
                    type="button"
                    onClick={cancelReply}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ✕ Отменить ответ
                  </button>
                </div>
                {showQuote && (
                  <blockquote className="border-l-4 border-gray-300 pl-4 py-2 bg-gray-50 rounded-r text-sm">
                    <div className="text-gray-600 mb-1">
                      <span className="font-semibold">{replyingToPost.author_name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {new Date(replyingToPost.created_at).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-gray-700">
                      <LinkifyText text={replyingToPost.content} />
                    </p>
                    {replyingToPost.images && replyingToPost.images.length > 0 && (
                      <div className={`mt-2 gap-2 ${replyingToPost.images.length > 1 ? 'grid grid-cols-2' : 'flex'}`}>
                        {replyingToPost.images.map((imageUrl, index) => {
                          const fullUrl = imageUrl.startsWith('http') ? imageUrl : (import.meta.env.VITE_API_URL || '') + imageUrl;
                          return (
                            <img
                              key={index}
                              src={fullUrl}
                              alt={`Image ${index + 1}`}
                              className={replyingToPost.images.length > 1 ? 'w-1/2 h-auto rounded border' : 'w-1/4 max-w-[25%] h-auto rounded border'}
                            />
                          );
                        })}
                      </div>
                    )}
                  </blockquote>
                )}
              </div>
            );
          })()}
          <h3 className="text-lg font-semibold mb-4">
            {replyingTo ? 'Ответить на сообщение' : 'Добавить сообщение'}
          </h3>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={replyingTo ? 'Ваш ответ...' : 'Ваше сообщение...'}
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
              {uploadingImages ? 'Загрузка...' : replyingTo ? 'Отправить ответ' : 'Отправить'}
            </button>
            {replyingTo && (
              <button
                type="button"
                onClick={cancelReply}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition"
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
};

export default Topic;
