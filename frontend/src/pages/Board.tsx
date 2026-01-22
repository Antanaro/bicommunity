import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, uploadImages } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LinkifyText from '../components/LinkifyText';

interface Post {
  id: number;
  content: string;
  author_name: string;
  author_avatar?: string | null;
  upvote_count: number;
  downvote_count: number;
  created_at: string;
  author_id: number;
  parent_id: number | null;
  images?: string[];
}

interface Topic {
  id: number;
  title: string;
  content: string;
  author_name: string;
  author_avatar?: string | null;
  category_name: string;
  category_id: number;
  created_at: string;
  images?: string[];
  posts: Post[];
  last_post_at?: string | null;
}

// Avatar component
const Avatar = ({ 
  avatarUrl, 
  username, 
  size = 'md' 
}: { 
  avatarUrl?: string | null; 
  username: string; 
  size?: 'sm' | 'md' | 'lg';
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  
  const getFullUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return (import.meta.env.VITE_API_URL || '') + url;
  };
  
  const fullUrl = getFullUrl(avatarUrl);
  
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0`}>
      {fullUrl ? (
        <img
          src={fullUrl}
          alt={username}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-gray-500 font-medium">
          {username.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
};

interface PostComponentProps {
  post: Post;
  user: any;
  reactions: Map<number, number | null>;
  onReact: (postId: number, reactionType: number) => void;
  onReply: (postId: number) => void;
  allPosts: Post[];
  globalId: number;
  getGlobalIdForPost: (postId: number) => number;
}

const PostComponent = ({
  post,
  user,
  reactions,
  onReact,
  onReply,
  allPosts,
  globalId,
  getGlobalIdForPost,
}: PostComponentProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPost, setTooltipPost] = useState<Post | null>(null);
  const userReaction = reactions.get(post.id) || null;

  const handleReplyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onReply(post.id);
  };

  const handleIdClick = (e: React.MouseEvent, targetId: number) => {
    e.preventDefault();
    const targetPost = allPosts.find(p => p.id === targetId);
    if (targetPost) {
      setTooltipPost(targetPost);
      setShowTooltip(true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-2">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <Avatar avatarUrl={post.author_avatar} username={post.author_name} size="sm" />
          <div>
            <span className="font-semibold text-sm">{post.author_name}</span>
            <div className="text-xs text-gray-500">
              {new Date(post.created_at).toLocaleString('ru-RU')}
            </div>
          </div>
          <span className="text-blue-600 font-mono text-sm cursor-pointer hover:underline" 
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(`post-${post.id}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                title="Ссылка на сообщение">
            #{globalId}
          </span>
        </div>
        <div className="flex gap-2 items-center">
          {user && (
            <>
              <button
                onClick={handleReplyClick}
                className="px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-xs"
              >
                Ответить
              </button>
              <button
                onClick={() => onReact(post.id, 1)}
                className={`px-2 py-1 rounded transition flex items-center gap-1 text-xs ${
                  userReaction === 1
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                }`}
              >
                👍 {post.upvote_count || 0}
              </button>
              <button
                onClick={() => onReact(post.id, -1)}
                className={`px-2 py-1 rounded transition flex items-center gap-1 text-xs ${
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
      {post.parent_id && (
        <div className="mb-2 text-xs text-gray-600">
          Ответ на{' '}
          <button
            onClick={(e) => handleIdClick(e, post.parent_id!)}
            className="text-blue-600 hover:underline font-mono"
            onMouseEnter={() => {
              const targetPost = allPosts.find(p => p.id === post.parent_id);
              if (targetPost) {
                setTooltipPost(targetPost);
                setShowTooltip(true);
              }
            }}
            onMouseLeave={() => setShowTooltip(false)}
          >
            #{getGlobalIdForPost(post.parent_id)}
          </button>
        </div>
      )}
      <div className="prose max-w-none text-sm">
        <p className="whitespace-pre-wrap">
          <LinkifyText text={post.content} />
        </p>
        {post.images && post.images.length > 0 && (
          <div className={`mt-2 ${post.images.length > 1 ? 'grid grid-cols-2 gap-2' : 'flex'}`}>
            {post.images.map((imageUrl, imgIndex) => {
              const fullUrl = imageUrl.startsWith('http') ? imageUrl : (import.meta.env.VITE_API_URL || '') + imageUrl;
              const imagesArray = post.images || [];
              return (
                <img
                  key={imgIndex}
                  src={fullUrl}
                  alt={`Image ${imgIndex + 1}`}
                  className={imagesArray.length > 1 ? 'w-full h-auto rounded border cursor-pointer hover:opacity-90' : 'w-1/3 max-w-[33%] h-auto rounded border cursor-pointer hover:opacity-90'}
                  onClick={() => window.open(fullUrl, '_blank')}
                />
              );
            })}
          </div>
        )}
      </div>
      {showTooltip && tooltipPost && (
        <div 
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-3 max-w-md z-50"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="flex items-center gap-2 mb-2">
            <Avatar avatarUrl={tooltipPost.author_avatar} username={tooltipPost.author_name} size="sm" />
            <div>
              <span className="font-semibold text-sm">{tooltipPost.author_name}</span>
              <div className="text-xs text-gray-500">
                {new Date(tooltipPost.created_at).toLocaleString('ru-RU')}
              </div>
            </div>
          </div>
          <p className="text-sm whitespace-pre-wrap line-clamp-4">
            <LinkifyText text={tooltipPost.content} />
          </p>
          <button
            onClick={() => setShowTooltip(false)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Закрыть
          </button>
        </div>
      )}
    </div>
  );
};

const Board = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedTopics, setExpandedTopics] = useState<Set<number>>(new Set());
  const [reactions, setReactions] = useState<Map<number, number | null>>(new Map());
  const [replyingTo, setReplyingTo] = useState<{ topicId: number; postId: number | null } | null>(null);
  const [newPost, setNewPost] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const topicsPerPage = 10;
  const postsPerTopic = 10;

  useEffect(() => {
    fetchTopics();
  }, [currentPage]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/topics');
      const allTopics = response.data;
      
      // Sort by last post date or creation date
      const sortedTopics = allTopics.sort((a: Topic, b: Topic) => {
        const aDate = a.last_post_at || a.created_at;
        const bDate = b.last_post_at || b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });

      // Pagination
      const startIndex = (currentPage - 1) * topicsPerPage;
      const endIndex = startIndex + topicsPerPage;
      const paginatedTopics = sortedTopics.slice(startIndex, endIndex);
      
      setTotalPages(Math.ceil(sortedTopics.length / topicsPerPage));

      // Fetch posts for each topic
      const topicsWithPosts = await Promise.all(
        paginatedTopics.map(async (topic: any) => {
          try {
            const topicResponse = await api.get(`/topics/${topic.id}`);
            return topicResponse.data;
          } catch (error) {
            console.error(`Error fetching topic ${topic.id}:`, error);
            return { ...topic, posts: [] };
          }
        })
      );

      setTopics(topicsWithPosts);

      // Fetch reactions for all posts
      if (user) {
        const reactionsMap = new Map<number, number | null>();
        for (const topic of topicsWithPosts) {
          if (topic.posts) {
            for (const post of topic.posts) {
              try {
                const reactionResponse = await api.get(`/posts/${post.id}/reaction`);
                reactionsMap.set(post.id, reactionResponse.data.reaction_type);
              } catch (error) {
                reactionsMap.set(post.id, null);
              }
            }
          }
        }
        setReactions(reactionsMap);
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTopicExpansion = (topicId: number) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  const getVisiblePosts = (topic: Topic) => {
    const allPosts = topic.posts || [];
    const isExpanded = expandedTopics.has(topic.id);
    
    if (isExpanded || allPosts.length <= postsPerTopic) {
      return allPosts;
    }
    
    return allPosts.slice(-postsPerTopic);
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

      await fetchTopics();
    } catch (error: any) {
      console.error('Error reacting to post:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error + (error.response.data.hint ? '\n\n' + error.response.data.hint : ''));
      } else {
        alert('Ошибка при добавлении реакции');
      }
    }
  };

  const handleReply = (topicId: number, postId: number | null) => {
    setReplyingTo({ topicId, postId: postId || null });
    setNewPost('');
    setSelectedImages([]);
    // Scroll to reply form
    setTimeout(() => {
      const form = document.querySelector(`[data-topic-id="${topicId}"] form`);
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const textarea = form.querySelector('textarea');
        if (textarea) {
          textarea.focus();
        }
      }
    }, 100);
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPost.trim() || !replyingTo) return;

    try {
      setUploadingImages(true);
      let imageUrls: string[] = [];

      if (selectedImages.length > 0) {
        imageUrls = await uploadImages(selectedImages);
      }

      await api.post('/posts', {
        content: newPost,
        topic_id: replyingTo.topicId,
        parent_id: replyingTo.postId ? replyingTo.postId : undefined,
        images: imageUrls,
      });
      
      setNewPost('');
      setSelectedImages([]);
      setReplyingTo(null);
      await fetchTopics();
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
      const limitedFiles = files.slice(0, 10);
      setSelectedImages((prev) => [...prev, ...limitedFiles].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewPost('');
    setSelectedImages([]);
  };

  // Calculate global IDs (sequential across all topics and posts on current page)
  // This creates a continuous numbering: Topic #1, Post #2, Post #3, Topic #4, etc.
  const getGlobalId = (topicId: number, postId: number | null, isTopic: boolean) => {
    let globalId = 1;
    
    for (const topic of topics) {
      if (isTopic && topic.id === topicId) {
        return globalId;
      }
      globalId++;
      
      // Count all posts in topic, not just visible ones
      if (topic.posts && topic.posts.length > 0) {
        for (const post of topic.posts) {
          if (!isTopic && post.id === postId) {
            return globalId;
          }
          globalId++;
        }
      }
    }
    
    return globalId;
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
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Форум (Борд)</h1>
      </div>

      {topics.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Пока нет тем на форуме.
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {topics.map((topic) => {
              const visiblePosts = getVisiblePosts(topic);
              const allPosts = topic.posts || [];
              const hasMorePosts = allPosts.length > postsPerTopic;
              const isExpanded = expandedTopics.has(topic.id);
              const topicGlobalId = getGlobalId(topic.id, null, true);
              
              return (
                <div key={topic.id} className="bg-white rounded-lg shadow p-6">
                  {/* Topic Header */}
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <Avatar avatarUrl={topic.author_avatar} username={topic.author_name} size="md" />
                        <div>
                          <h2 className="text-xl font-bold">
                            <Link to={`/topic/${topic.id}`} className="hover:text-blue-600">
                              {topic.title}
                            </Link>
                          </h2>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">{topic.author_name}</span>
                            {' • '}
                            <span>{topic.category_name}</span>
                            {' • '}
                            <span>{new Date(topic.created_at).toLocaleString('ru-RU')}</span>
                          </div>
                        </div>
                        <span className="text-blue-600 font-mono text-sm cursor-pointer hover:underline"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/topic/${topic.id}`);
                              }}
                              title="Ссылка на тему">
                          #{topicGlobalId}
                        </span>
                      </div>
                    </div>
                    <div className="prose max-w-none mt-2">
                      <p className="whitespace-pre-wrap text-sm">
                        <LinkifyText text={topic.content} />
                      </p>
                      {topic.images && topic.images.length > 0 && (
                        <div className={`mt-2 ${topic.images.length > 1 ? 'grid grid-cols-2 gap-2' : 'flex'}`}>
                          {topic.images.map((imageUrl, imgIndex) => {
                            const fullUrl = imageUrl.startsWith('http') ? imageUrl : (import.meta.env.VITE_API_URL || '') + imageUrl;
                            const imagesArray = topic.images || [];
                            return (
                              <img
                                key={imgIndex}
                                src={fullUrl}
                                alt={`Image ${imgIndex + 1}`}
                                className={imagesArray.length > 1 ? 'w-full h-auto rounded border cursor-pointer hover:opacity-90' : 'w-1/3 max-w-[33%] h-auto rounded border cursor-pointer hover:opacity-90'}
                                onClick={() => window.open(fullUrl, '_blank')}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Posts */}
                  <div className="space-y-2">
                    {visiblePosts.map((post) => {
                      const postGlobalId = getGlobalId(topic.id, post.id, false);
                      const getGlobalIdForPost = (postId: number) => {
                        return getGlobalId(topic.id, postId, false);
                      };
                      return (
                        <div key={post.id} id={`post-${post.id}`}>
                          <PostComponent
                            post={post}
                            user={user}
                            reactions={reactions}
                            onReact={handleReact}
                            onReply={(postId) => handleReply(topic.id, postId)}
                            allPosts={allPosts}
                            globalId={postGlobalId}
                            getGlobalIdForPost={getGlobalIdForPost}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Expand/Collapse button */}
                  {hasMorePosts && (
                    <button
                      onClick={() => toggleTopicExpansion(topic.id)}
                      className="mt-4 text-blue-600 hover:underline text-sm"
                    >
                      {isExpanded 
                        ? `Свернуть (показано ${allPosts.length} из ${allPosts.length})`
                        : `Развернуть (показано ${visiblePosts.length} из ${allPosts.length}, скрыто ${allPosts.length - visiblePosts.length})`
                      }
                    </button>
                  )}

                  {/* Reply Form */}
                  {user && replyingTo?.topicId === topic.id && (
                    <form
                      data-topic-id={topic.id}
                      onSubmit={handleSubmitPost}
                      className="mt-4 bg-gray-50 rounded-lg p-4 border"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold">
                          {replyingTo.postId 
                            ? `Ответ на #${getGlobalId(topic.id, replyingTo.postId, false)}`
                            : 'Ответить в теме'
                          }
                        </h3>
                        <button
                          type="button"
                          onClick={cancelReply}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          ✕ Отменить
                        </button>
                      </div>
                      <textarea
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        placeholder="Ваш ответ..."
                        className="w-full border rounded px-4 py-2 mb-2 h-24 text-sm"
                        required
                      />
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Изображения (до 10 шт.)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className="w-full border rounded px-4 py-2 text-sm"
                        />
                        {selectedImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {selectedImages.map((file, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={`Preview ${index + 1}`}
                                  className="w-16 h-16 object-cover rounded border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
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
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition disabled:opacity-50 text-sm"
                          disabled={uploadingImages}
                        >
                          {uploadingImages ? 'Загрузка...' : 'Отправить'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reply button if not replying */}
                  {user && replyingTo?.topicId !== topic.id && (
                    <button
                      onClick={() => handleReply(topic.id, null)}
                      className="mt-4 text-blue-600 hover:underline text-sm"
                    >
                      Ответить в теме
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <span className="text-gray-600">
                Страница {currentPage} из {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперед
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Board;
