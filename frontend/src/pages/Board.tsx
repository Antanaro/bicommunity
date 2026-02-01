import { useEffect, useState, useMemo, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { api, uploadImages } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LinkifyText from '../components/LinkifyText';
import MarkdownRenderer from '../components/MarkdownRenderer';
import PieChart from '../components/PieChart';

const POPUP_Z_INDEX = 99999;

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

// Avatar component (memoized to avoid re-renders on parent updates)
const Avatar = memo(({ 
  avatarUrl, 
  username, 
  size = 'md' 
}: { 
  avatarUrl?: string | null; 
  username: string; 
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-14 h-14 text-base',
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
});

const formatPostDate = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yy} ${hh}:${min}`;
};

interface PostComponentProps {
  post: Post;
  user: any;
  userReaction: number | null;
  onReact: (postId: number, reactionType: number) => void;
  onReply: (topicId: number, postId: number) => void;
  topicId: number;
  allPosts: Post[];
  globalIdMap: Map<string, number>;
}

const PostComponent = memo(({
  post,
  user,
  userReaction,
  onReact,
  onReply,
  topicId,
  allPosts,
  globalIdMap,
}: PostComponentProps) => {
  const globalId = globalIdMap.get(`post-${post.id}`) ?? 0;
  const getGlobalIdForPost = useCallback((postId: number) => globalIdMap.get(`post-${postId}`) ?? 0, [globalIdMap]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPost, setTooltipPost] = useState<Post | null>(null);
  const [tooltipAnchorRect, setTooltipAnchorRect] = useState<DOMRect | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReplyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onReply(topicId, post.id);
  };

  const handleIdClick = (e: React.MouseEvent, targetId: number) => {
    e.preventDefault();
    const targetPost = allPosts.find(p => p.id === targetId);
    if (targetPost) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setTooltipAnchorRect(rect);
      setTooltipPost(targetPost);
      setShowTooltip(true);
    }
  };

  const openTooltipOnHover = () => {
    const targetPost = allPosts.find(p => p.id === post.parent_id);
    if (targetPost && anchorRef.current) {
      setTooltipAnchorRect(anchorRef.current.getBoundingClientRect());
      setTooltipPost(targetPost);
      setShowTooltip(true);
    }
  };

  const closeTooltip = () => {
    setShowTooltip(false);
    setTooltipAnchorRect(null);
  };

  const scheduleClose = () => {
    leaveTimeoutRef.current = setTimeout(closeTooltip, 150);
  };

  const cancelClose = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  useEffect(() => () => {
    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
  }, []);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-2">
      <div className="flex gap-3 p-3">
        {/* Левая колонка: аватар, логин */}
        <div className="flex-shrink-0 w-24 flex flex-col items-center text-center">
          <Avatar avatarUrl={post.author_avatar} username={post.author_name} size="md" />
          <div className="mt-1.5 w-full">
            <span className="font-semibold text-gray-800 text-sm block truncate" title={post.author_name}>
              {post.author_name}
            </span>
          </div>
        </div>

        {/* Центр: верхняя строка (дата, #id, ответ на #X) + кнопки справа; ниже — окошко с сообщением */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="text-xs text-gray-600 flex items-center gap-2 min-w-0">
              <span className="text-gray-500 flex-shrink-0" title={new Date(post.created_at).toLocaleString('ru-RU')}>
                {formatPostDate(post.created_at)}
              </span>
              {post.parent_id && (
                <>
                  <span
                    id={`post-${post.id}`}
                    className="text-blue-600 font-mono text-xs cursor-pointer hover:underline flex-shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(`post-${post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    title="Ссылка на сообщение"
                  >
                    #{globalId}
                  </span>
                  <span>Ответ на{' '}</span>
                  <span className="relative inline-block">
                    <button
                      ref={anchorRef}
                      onClick={(e) => handleIdClick(e, post.parent_id!)}
                      className="text-blue-600 hover:underline font-mono"
                      onMouseEnter={openTooltipOnHover}
                      onMouseLeave={scheduleClose}
                    >
                      #{getGlobalIdForPost(post.parent_id)}
                    </button>
                    {showTooltip && tooltipPost && tooltipPost.id === post.parent_id && tooltipAnchorRect &&
                      createPortal(
                        <div
                          className="bg-white border border-gray-300 rounded-lg shadow-xl p-3"
                          style={{
                            position: 'fixed',
                            left: tooltipAnchorRect.left,
                            bottom: window.innerHeight - tooltipAnchorRect.top + 8,
                            minWidth: 200,
                            maxWidth: Math.min(400, window.innerWidth - 40),
                            width: 'max-content',
                            zIndex: POPUP_Z_INDEX,
                          }}
                          onMouseEnter={cancelClose}
                          onMouseLeave={closeTooltip}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar avatarUrl={tooltipPost.author_avatar} username={tooltipPost.author_name} size="sm" />
                            <div>
                              <span className="font-semibold text-sm">{tooltipPost.author_name}</span>
                              <div className="text-xs text-gray-500">
                                {formatPostDate(tooltipPost.created_at)} #{getGlobalIdForPost(tooltipPost.id)}
                              </div>
                            </div>
                          </div>
                          <p className="text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                            <LinkifyText text={tooltipPost.content} />
                          </p>
                          <button
                            onClick={closeTooltip}
                            className="mt-2 text-xs text-blue-600 hover:underline"
                          >
                            Закрыть
                          </button>
                        </div>,
                        document.body
                      )}
                  </span>
                </>
              )}
              {!post.parent_id && (
                <span
                  id={`post-${post.id}`}
                  className="text-blue-600 font-mono text-xs cursor-pointer hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(`post-${post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  title="Ссылка на сообщение"
                >
                  #{globalId}
                </span>
              )}
            </div>
            {user && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleReplyClick}
                  className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition text-xs"
                >
                  Ответить
                </button>
                <button
                  onClick={() => onReact(post.id, 1)}
                  className={`px-2 py-1 rounded border transition flex items-center gap-1 text-xs ${
                    userReaction === 1
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-green-50'
                  }`}
                >
                  👍 {post.upvote_count || 0}
                </button>
                <button
                  onClick={() => onReact(post.id, -1)}
                  className={`px-2 py-1 rounded border transition flex items-center gap-1 text-xs ${
                    userReaction === -1
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-red-50'
                  }`}
                >
                  👎 {post.downvote_count || 0}
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 p-3">
            <div className="prose prose-slate max-w-none text-sm text-gray-800">
              <MarkdownRenderer content={post.content} />
            </div>
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
                      className={imagesArray.length > 1 ? 'w-full h-auto rounded border border-gray-200 cursor-pointer hover:opacity-90' : 'max-w-[160px] h-auto rounded border border-gray-200 cursor-pointer hover:opacity-90'}
                      onClick={() => window.open(fullUrl, '_blank')}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

PostComponent.displayName = 'PostComponent';

interface CategoryOption {
  id: number;
  name: string;
}

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
  const [globalIdMap, setGlobalIdMap] = useState<Map<string, number>>(new Map()); // 'topic-{id}' or 'post-{id}' -> globalId
  const [globalIdMapLoaded, setGlobalIdMapLoaded] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [topicFormData, setTopicFormData] = useState({ title: '', content: '', category_id: '' });
  const [topicImages, setTopicImages] = useState<File[]>([]);
  const [uploadingTopicImages, setUploadingTopicImages] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const topicsPerPage = 10;
  const postsPerTopic = 10;

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

  // Случайный выбор начального графика при каждом рефреше
  const initialChartType = useMemo(() => {
    const types: Array<'pie' | 'bar' | 'line' | 'horizontalBar' | 'donut' | 'area' | 'sankey'> = ['pie', 'bar', 'line', 'horizontalBar', 'donut', 'area', 'sankey'];
    return types[Math.floor(Math.random() * types.length)];
  }, []);

  // Load global ID map only once on mount
  useEffect(() => {
    if (!globalIdMapLoaded) {
      fetchGlobalIdMap();
      setGlobalIdMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [currentPage]);

  useEffect(() => {
    // Загружаем список категорий для создания темы
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

  // One request for global ID map (was 1 + N topic requests)
  const fetchGlobalIdMap = async () => {
    try {
      const response = await api.get<Record<string, number>>('/topics/global-id-map');
      const idMap = new Map<string, number>();
      Object.entries(response.data).forEach(([key, val]) => idMap.set(key, val));
      setGlobalIdMap(idMap);
    } catch (error) {
      console.error('Error fetching global ID map:', error);
    }
  };

  // Update global ID map when new post is created
  const updateGlobalIdMapForNewPost = (postId: number) => {
    if (globalIdMap.size > 0) {
      const maxId = Math.max(...Array.from(globalIdMap.values()));
      setGlobalIdMap(prev => {
        const newMap = new Map(prev);
        newMap.set(`post-${postId}`, maxId + 1);
        return newMap;
      });
    }
  };

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

      // One batch request for reactions (was N requests)
      if (user) {
        const allPostIds: number[] = [];
        for (const topic of topicsWithPosts) {
          if (topic.posts) {
            allPostIds.push(...topic.posts.map((p: Post) => p.id));
          }
        }
        if (allPostIds.length > 0) {
          try {
            const res = await api.get<Record<string, number | null>>('/posts/reactions', {
              params: { post_ids: allPostIds.join(',') },
            });
            const reactionsMap = new Map<number, number | null>();
            Object.entries(res.data).forEach(([id, reactionType]) => {
              reactionsMap.set(parseInt(id, 10), reactionType);
            });
            setReactions(reactionsMap);
          } catch (err) {
            console.error('Error fetching reactions:', err);
          }
        }
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

    const currentReaction = reactions.get(postId);
    const isRemoving = currentReaction === reactionType;

    // Optimistic update
    setReactions((prev) => {
      const newMap = new Map(prev);
      if (isRemoving) {
        newMap.set(postId, null);
      } else {
        newMap.set(postId, reactionType);
      }
      return newMap;
    });

    // Update post counts optimistically
    setTopics(prevTopics => prevTopics.map(topic => ({
      ...topic,
      posts: topic.posts?.map(post => {
        if (post.id === postId) {
          if (isRemoving) {
            // Removing reaction
            if (currentReaction === 1) {
              return { ...post, upvote_count: Math.max(0, post.upvote_count - 1) };
            } else if (currentReaction === -1) {
              return { ...post, downvote_count: Math.max(0, post.downvote_count - 1) };
            }
          } else {
            // Adding/changing reaction
            if (currentReaction === 1) {
              return { ...post, upvote_count: Math.max(0, post.upvote_count - 1), downvote_count: reactionType === -1 ? post.downvote_count + 1 : post.downvote_count };
            } else if (currentReaction === -1) {
              return { ...post, upvote_count: reactionType === 1 ? post.upvote_count + 1 : post.upvote_count, downvote_count: Math.max(0, post.downvote_count - 1) };
            } else {
              // No previous reaction
              if (reactionType === 1) {
                return { ...post, upvote_count: post.upvote_count + 1 };
              } else {
                return { ...post, downvote_count: post.downvote_count + 1 };
              }
            }
          }
        }
        return post;
      }) || [],
    })));

    try {
      const response = await api.post(`/posts/${postId}/react`, {
        reaction_type: reactionType,
      });

      // Update with server response (no extra topic refresh — optimistic update is enough)
      setReactions((prev) => {
        const newMap = new Map(prev);
        if (response.data.removed) {
          newMap.set(postId, null);
        } else {
          newMap.set(postId, response.data.reaction_type);
        }
        return newMap;
      });
    } catch (error: any) {
      // Revert optimistic update on error
      setReactions((prev) => {
        const newMap = new Map(prev);
        newMap.set(postId, currentReaction ?? null);
        return newMap;
      });
      console.error('Error reacting to post:', error);
      if (error.response?.data?.error) {
        alert(error.response.data.error + (error.response.data.hint ? '\n\n' + error.response.data.hint : ''));
      } else {
        alert('Ошибка при добавлении реакции');
      }
    }
  };

  const handleReply = useCallback((topicId: number, postId: number | null) => {
    setReplyingTo({ topicId, postId: postId ?? null });
    setNewPost('');
    setSelectedImages([]);
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
  }, []);

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPost.trim() || !replyingTo) return;

    const topicId = replyingTo.topicId;
    const content = newPost;
    const parentId = replyingTo.postId;
    const imagesToUpload = [...selectedImages];

    // Optimistic update - immediately add post to UI
    const optimisticPost: Post = {
      id: Date.now(), // Temporary ID
      content: content,
      author_name: user.username || 'Вы',
      author_avatar: user.avatar_url || null,
      upvote_count: 0,
      downvote_count: 0,
      created_at: new Date().toISOString(),
      author_id: user.id,
      parent_id: parentId,
      images: [],
    };

    // Update topics optimistically
    setTopics(prevTopics => prevTopics.map(topic => {
      if (topic.id === topicId) {
        return {
          ...topic,
          posts: [...(topic.posts || []), optimisticPost],
        };
      }
      return topic;
    }));

    // Clear form immediately
    setNewPost('');
    setReplyingTo(null);
    setSelectedImages([]);
    
    // Set uploading state only if there are images to upload
    if (imagesToUpload.length > 0) {
      setUploadingImages(true);
    }

    try {
      let imageUrls: string[] = [];

      if (imagesToUpload.length > 0) {
        imageUrls = await uploadImages(imagesToUpload);
      }

      const response = await api.post('/posts', {
        content: content,
        topic_id: topicId,
        parent_id: parentId ?? undefined,
        images: imageUrls,
      });

      // Update with real post data
      setTopics(prevTopics => prevTopics.map(topic => {
        if (topic.id === topicId) {
          const realPost: Post = {
            ...response.data,
            author_name: user.username || 'Вы',
            author_avatar: user.avatar_url || null,
            upvote_count: 0,
            downvote_count: 0,
          };
          return {
            ...topic,
            posts: topic.posts?.map(p => p.id === optimisticPost.id ? realPost : p) || [realPost],
          };
        }
        return topic;
      }));

      // Update global ID map with new post (no extra topic refresh — we already have the post)
      updateGlobalIdMapForNewPost(response.data.id);
    } catch (error) {
      console.error('Error creating post:', error);
      // Revert optimistic update on error
      setTopics(prevTopics => prevTopics.map(topic => {
        if (topic.id === topicId) {
          return {
            ...topic,
            posts: topic.posts?.filter(p => p.id !== optimisticPost.id) || [],
          };
        }
        return topic;
      }));
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

  const removeTopicImage = (index: number) => {
    setTopicImages((prev) => prev.filter((_, i) => i !== index));
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewPost('');
    setSelectedImages([]);
  };

  const handleTopicImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const limitedFiles = files.slice(0, 10);
      setTopicImages((prev) => [...prev, ...limitedFiles].slice(0, 10));
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!topicFormData.category_id) {
      alert('Пожалуйста, выберите категорию');
      return;
    }

    try {
      setUploadingTopicImages(true);
      let imageUrls: string[] = [];

      if (topicImages.length > 0) {
        imageUrls = await uploadImages(topicImages);
      }

      await api.post('/topics', {
        title: topicFormData.title,
        content: topicFormData.content,
        category_id: topicFormData.category_id,
        images: imageUrls,
      });

      setTopicFormData({ title: '', content: '', category_id: '' });
      setTopicImages([]);
      setShowTopicForm(false);
      fetchTopics();
    } catch (error) {
      console.error('Error creating topic:', error);
      alert('Ошибка при создании темы');
    } finally {
      setUploadingTopicImages(false);
    }
  };

  // Get global ID from map (sequential across entire forum)
  const getGlobalId = (topicId: number, postId: number | null, isTopic: boolean) => {
    if (isTopic) {
      return globalIdMap.get(`topic-${topicId}`) || 0;
    } else if (postId) {
      return globalIdMap.get(`post-${postId}`) || 0;
    }
    return 0;
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
      <div className="mb-6 flex justify-between items-center" style={{ overflow: 'visible', position: 'relative' }}>
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
              initialChartType={initialChartType}
            />
          </div>
          <h1 className="text-3xl font-bold">Board</h1>
        </div>
        {user && (
          <button
            onClick={() => setShowTopicForm(!showTopicForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          >
            {showTopicForm ? '✕ Отмена' : '+ Создать тему'}
          </button>
        )}
      </div>

      {user && showTopicForm && (
        <form onSubmit={handleCreateTopic} className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Новая тема</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Категория *
            </label>
            <select
              value={topicFormData.category_id}
              onChange={(e) => setTopicFormData({ ...topicFormData, category_id: e.target.value })}
              className="w-full border rounded px-4 py-2"
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
          <input
            type="text"
            placeholder="Название темы"
            value={topicFormData.title}
            onChange={(e) => setTopicFormData({ ...topicFormData, title: e.target.value })}
            className="w-full border rounded px-4 py-2 mb-4"
            required
          />
          <textarea
            placeholder="Содержание темы"
            value={topicFormData.content}
            onChange={(e) => setTopicFormData({ ...topicFormData, content: e.target.value })}
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
              onChange={handleTopicImageSelect}
              className="w-full border rounded px-4 py-2 mb-2"
            />
            {topicImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {topicImages.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removeTopicImage(index)}
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
              disabled={uploadingTopicImages}
            >
              {uploadingTopicImages ? 'Загрузка...' : 'Создать'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTopicForm(false);
                setTopicFormData({ title: '', content: '', category_id: '' });
                setTopicImages([]);
              }}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {topics.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center text-gray-500">
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
                      <MarkdownRenderer content={topic.content} />
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

                  {/* Expand/Collapse button - moved under topic */}
                  {hasMorePosts && (
                    <div className="mb-4">
                      <button
                        onClick={() => toggleTopicExpansion(topic.id)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {isExpanded 
                          ? `Свернуть (показано ${allPosts.length} из ${allPosts.length})`
                          : `Развернуть (показано ${visiblePosts.length} из ${allPosts.length}, скрыто ${allPosts.length - visiblePosts.length})`
                        }
                      </button>
                    </div>
                  )}

                  {/* Posts */}
                  <div className="space-y-2">
                    {visiblePosts.map((post) => (
                        <div key={post.id} id={`post-${post.id}`}>
                          <PostComponent
                            post={post}
                            user={user}
                            userReaction={reactions.get(post.id) ?? null}
                            onReact={handleReact}
                            onReply={handleReply}
                            topicId={topic.id}
                            allPosts={allPosts}
                            globalIdMap={globalIdMap}
                          />
                        </div>
                      ))}
                  </div>

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
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Первая страница"
              >
                ««
              </button>
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
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Последняя страница"
              >
                »»
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Board;
