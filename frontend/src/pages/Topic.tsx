import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, uploadImages } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LinkifyText from '../components/LinkifyText';
import MarkdownRenderer from '../components/MarkdownRenderer';

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
  parent_author_name: string | null;
  parent_author_avatar?: string | null;
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
  onDelete: (postId: number) => void;
  onStartEdit: (postId: number) => void;
  onSaveEdit: (postId: number, content: string) => void;
  onCancelEdit: () => void;
  onEditContentChange: (content: string) => void;
  editingPostId: number | null;
  editContent: string;
  level: number;
  allPosts: Post[];
  getGlobalId: (postId: number) => number;
}

// Avatar component
const Avatar = ({ 
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
    xl: 'w-[84px] h-[84px] text-base',
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

const formatPostDate = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yy} ${hh}:${min}`;
};

const PostComponent = ({
  post,
  user,
  reactions,
  onReact,
  onReply,
  onDelete,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditContentChange,
  editingPostId,
  editContent,
  level,
  allPosts,
  getGlobalId,
}: PostComponentProps) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPost, setTooltipPost] = useState<Post | null>(null);
  const [tooltipAnchorRect, setTooltipAnchorRect] = useState<DOMRect | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parentPost = post.parent_id ? allPosts.find((p) => p.id === post.parent_id) : null;
  const userReaction = reactions.get(post.id) || null;
  
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
    <div className={level > 0 ? 'mt-2' : ''}>
      <div
        className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${
          level > 0 ? 'border-l-4 border-l-blue-400' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-3 sm:p-4">
          {/* Мобильный: верхняя строка — аватар + имя */}
          <div className="flex sm:hidden items-center gap-2 pb-2 border-b border-gray-100">
            <Link to={`/users/${post.author_id}`} className="flex items-center gap-2 min-w-0">
              <Avatar avatarUrl={post.author_avatar} username={post.author_name} size="sm" />
              <span className="font-semibold text-gray-800 text-sm truncate hover:text-blue-600">
                {post.author_name}
              </span>
            </Link>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-auto">
              {formatPostDate(post.created_at)} #{getGlobalId(post.id)}
            </span>
          </div>
          {/* Десктоп: левая колонка */}
          <div className="hidden sm:flex flex-shrink-0 w-28 flex-col items-center text-center">
            <Link to={`/users/${post.author_id}`} className="flex flex-col items-center w-full">
              <Avatar avatarUrl={post.author_avatar} username={post.author_name} size="xl" />
              <div className="mt-2 w-full">
                <span
                  className="font-semibold text-gray-800 text-lg block truncate hover:text-blue-600 transition"
                  title={post.author_name}
                >
                  {post.author_name}
                </span>
              </div>
            </Link>
          </div>

          {/* Центр: мета + кнопки; ниже — сообщение */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="hidden sm:flex items-center justify-between gap-2 mb-2">
              <div className="text-sm text-gray-600 flex items-center gap-2 min-w-0">
                <span className="text-gray-500 flex-shrink-0" title={new Date(post.created_at).toLocaleString('ru-RU')}>
                  {formatPostDate(post.created_at)}
                </span>
                {(post.parent_id && parentPost) && (
                  <>
                    <span
                      id={`post-${post.id}`}
                      className="text-blue-600 font-mono text-sm cursor-pointer hover:underline flex-shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`post-${post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      title="Ссылка на сообщение"
                    >
                      #{getGlobalId(post.id)}
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
                        #{getGlobalId(post.parent_id)}
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
                              <Link
                                to={`/users/${tooltipPost.author_id}`}
                                className="flex items-center gap-2 hover:text-blue-600 transition"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Avatar avatarUrl={tooltipPost.author_avatar} username={tooltipPost.author_name} size="sm" />
                                <div>
                                  <span className="font-semibold text-sm">{tooltipPost.author_name}</span>
                                  <div className="text-xs text-gray-500">
                                    {formatPostDate(tooltipPost.created_at)} #{getGlobalId(tooltipPost.id)}
                                  </div>
                                </div>
                              </Link>
                            </div>
                            <p className="text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                              <LinkifyText text={tooltipPost.content} />
                            </p>
                            {tooltipPost.images && tooltipPost.images.length > 0 && (
                              <div className="mt-2">
                                <img
                                  src={tooltipPost.images[0].startsWith('http') ? tooltipPost.images[0] : (import.meta.env.VITE_API_URL || '') + tooltipPost.images[0]}
                                  alt="Preview"
                                  className="w-20 h-20 object-cover rounded border"
                                />
                              </div>
                            )}
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
                    className="text-blue-600 font-mono text-sm cursor-pointer hover:underline flex-shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(`post-${post.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    title="Ссылка на сообщение"
                  >
                    #{getGlobalId(post.id)}
                  </span>
                )}
              </div>
              {user && (
                <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                  {user.id === post.author_id && (
                    <>
                      <button
                        onClick={() => onStartEdit(post.id)}
                        className="px-2 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-700 text-xs sm:text-sm"
                        title="Редактировать"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Вы уверены, что хотите удалить это сообщение?')) {
                            onDelete(post.id);
                          }
                        }}
                        className="px-2 py-1.5 rounded border border-red-300 text-red-600 text-xs sm:text-sm"
                        title="Удалить"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  <button onClick={() => onReply(post.id)} className="px-2 py-1.5 rounded border border-gray-300 text-xs sm:text-sm">
                    Ответить
                  </button>
                  <button
                    onClick={() => onReact(post.id, 1)}
                    className={`px-2 py-1.5 rounded border flex items-center gap-1 text-xs sm:text-sm min-h-[36px] sm:min-h-0 ${
                      userReaction === 1 ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                    }`}
                  >
                    👍 {post.upvote_count || 0}
                  </button>
                  <button
                    onClick={() => onReact(post.id, -1)}
                    className={`px-2 py-1.5 rounded border flex items-center gap-1 text-xs sm:text-sm min-h-[36px] sm:min-h-0 ${
                      userReaction === -1 ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'
                    }`}
                  >
                    👎 {post.downvote_count || 0}
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 p-3 sm:p-4">
              {editingPostId === post.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => onEditContentChange(e.target.value)}
                    className="w-full min-h-[120px] p-3 rounded border border-slate-300 text-gray-800 text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Текст сообщения..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSaveEdit(post.id, editContent)}
                      className="px-3 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition text-sm"
                    >
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition text-sm"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none text-gray-800">
                  <MarkdownRenderer content={post.content} />
                </div>
              )}
              {post.images && post.images.length > 0 && (
                <div className={`mt-4 ${post.images.length > 1 ? 'grid grid-cols-2 gap-2' : 'flex'}`}>
                  {post.images.map((imageUrl, imgIndex) => {
                    const fullUrl = imageUrl.startsWith('http') ? imageUrl : (import.meta.env.VITE_API_URL || '') + imageUrl;
                    const imagesArray = post.images || [];
                    return (
                      <img
                        key={imgIndex}
                        src={fullUrl}
                        alt={`Image ${imgIndex + 1}`}
                        className={imagesArray.length > 1 ? 'w-full h-auto rounded border border-gray-200 cursor-pointer hover:opacity-90' : 'max-w-[200px] h-auto rounded border border-gray-200 cursor-pointer hover:opacity-90'}
                        onClick={() => window.open(fullUrl, '_blank')}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            {user && (
              <div className="flex sm:hidden flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
                {user.id === post.author_id && (
                  <>
                    <button onClick={() => onStartEdit(post.id)} className="px-2 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-700 text-xs min-h-[36px]">✏️</button>
                    <button
                      onClick={() => { if (window.confirm('Удалить сообщение?')) onDelete(post.id); }}
                      className="px-2 py-1.5 rounded border border-red-300 text-red-600 text-xs min-h-[36px]"
                    >
                      🗑️
                    </button>
                  </>
                )}
                <button onClick={() => onReply(post.id)} className="px-2 py-1.5 rounded border border-gray-300 text-xs min-h-[36px]">Ответить</button>
                <button onClick={() => onReact(post.id, 1)} className={`px-2 py-1.5 rounded border text-xs min-h-[36px] ${userReaction === 1 ? 'bg-green-500 text-white border-green-500' : 'border-gray-300'}`}>👍 {post.upvote_count || 0}</button>
                <button onClick={() => onReact(post.id, -1)} className={`px-2 py-1.5 rounded border text-xs min-h-[36px] ${userReaction === -1 ? 'bg-red-500 text-white border-red-500' : 'border-gray-300'}`}>👎 {post.downvote_count || 0}</button>
              </div>
            )}
          </div>
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
              onDelete={onDelete}
              onStartEdit={onStartEdit}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onEditContentChange={onEditContentChange}
              editingPostId={editingPostId}
              editContent={editContent}
              level={level + 1}
              allPosts={allPosts}
              getGlobalId={getGlobalId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface PollOption {
  id: number;
  text: string;
  position: number;
  vote_count: number;
}

interface Poll {
  id: number;
  question: string;
  multiple_choice: boolean;
  allow_view_without_vote: boolean;
  total_votes: number;
  options: PollOption[];
  user_voted_option_ids: number[];
}

interface Topic {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_name: string;
  author_avatar?: string | null;
  category_name: string;
  category_id: number;
  created_at: string;
  posts: Post[];
  images?: string[];
  poll?: Poll | null;
}

const Topic = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPost, setNewPost] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [reactions, setReactions] = useState<Map<number, number | null>>(new Map());
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [globalIdMap, setGlobalIdMap] = useState<Map<string, number>>(new Map());
  const [globalIdMapLoaded, setGlobalIdMapLoaded] = useState(false);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingTopic, setSavingTopic] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [postEditContent, setPostEditContent] = useState('');
  // Poll: create modal
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);
  const [pollAllowViewWithoutVote, setPollAllowViewWithoutVote] = useState(true);
  const [creatingPoll, setCreatingPoll] = useState(false);
  // Poll: vote
  const [pollVoteSingle, setPollVoteSingle] = useState<number | null>(null);
  const [pollVoteMultiple, setPollVoteMultiple] = useState<number[]>([]);
  const [pollVoting, setPollVoting] = useState(false);
  // Poll: show results without voting
  const [pollShowResultsWithoutVote, setPollShowResultsWithoutVote] = useState(false);
  const [isEditingPollQuestion, setIsEditingPollQuestion] = useState(false);
  const [pollEditQuestion, setPollEditQuestion] = useState('');
  const [savingPollEdit, setSavingPollEdit] = useState(false);
  const [deletingPoll, setDeletingPoll] = useState(false);

  // Load global ID map only once on mount
  useEffect(() => {
    if (!globalIdMapLoaded) {
      fetchGlobalIdMap();
      setGlobalIdMapLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchTopic();
    }
  }, [id]);

  // Fetch all topics and posts to create global ID map
  const fetchGlobalIdMap = async () => {
    try {
      const allTopicsResponse = await api.get('/topics');
      const allTopics = allTopicsResponse.data;
      
      // Fetch all posts for all topics
      const allTopicsWithPosts = await Promise.all(
        allTopics.map(async (topic: any) => {
          try {
            const topicResponse = await api.get(`/topics/${topic.id}`);
            return topicResponse.data;
          } catch (error) {
            return { ...topic, posts: [] };
          }
        })
      );

      // Create array of all items (topics + posts) sorted by creation date
      const allItems: Array<{ type: 'topic' | 'post'; id: number; topicId?: number; created_at: string }> = [];
      
      for (const topic of allTopicsWithPosts) {
        allItems.push({
          type: 'topic',
          id: topic.id,
          created_at: topic.created_at,
        });
        
        if (topic.posts) {
          for (const post of topic.posts) {
            allItems.push({
              type: 'post',
              id: post.id,
              topicId: topic.id,
              created_at: post.created_at,
            });
          }
        }
      }

      // Sort by creation date
      allItems.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Create global ID map
      const idMap = new Map<string, number>();
      let globalId = 1;
      
      for (const item of allItems) {
        if (item.type === 'topic') {
          idMap.set(`topic-${item.id}`, globalId++);
        } else {
          idMap.set(`post-${item.id}`, globalId++);
        }
      }

      setGlobalIdMap(idMap);
    } catch (error) {
      console.error('Error fetching global ID map:', error);
    }
  };

  const fetchTopic = async () => {
    try {
      setError(null);
      console.log('Fetching topic with id:', id);
      const response = await api.get(`/topics/${id}`);
      console.log('Topic response:', response.data);
      // Convert string counts to numbers
      if (response.data.posts) {
        response.data.posts = response.data.posts.map((post: any) => ({
          ...post,
          upvote_count: parseInt(post.upvote_count) || 0,
          downvote_count: parseInt(post.downvote_count) || 0,
        }));
      }
      setTopic(response.data);
      
      // Fetch user reactions for all posts in parallel
      if (user && response.data.posts) {
        const postIds = response.data.posts.map((p: Post) => p.id);
        
        // Fetch all reactions in parallel
        const reactionPromises = postIds.map((postId: number) =>
          api.get(`/posts/${postId}/reaction`)
            .then(res => ({ postId, reactionType: res.data.reaction_type }))
            .catch(() => ({ postId, reactionType: null }))
        );

        const reactionResults = await Promise.all(reactionPromises);
        const reactionsMap = new Map<number, number | null>();
        reactionResults.forEach(({ postId, reactionType }) => {
          reactionsMap.set(postId, reactionType);
        });
        setReactions(reactionsMap);
      }
    } catch (error: any) {
      console.error('Error fetching topic:', error);
      if (error.response?.status === 404) {
        setError('Тема не найдена (404)');
      } else if (error.response?.status) {
        setError(`Ошибка сервера: ${error.response.status}`);
      } else if (error.message) {
        setError(`Ошибка: ${error.message}`);
      } else {
        setError('Не удалось загрузить тему');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPost.trim() || !topic) return;

    const content = newPost;
    const parentId = replyingTo;
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
      parent_author_name: parentId ? topic.posts.find(p => p.id === parentId)?.author_name || null : null,
      parent_author_avatar: parentId ? topic.posts.find(p => p.id === parentId)?.author_avatar || null : null,
      images: [],
    };

    // Update topic optimistically
    setTopic({
      ...topic,
      posts: [...topic.posts, optimisticPost],
    });

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

      // Upload images if any
      if (imagesToUpload.length > 0) {
        imageUrls = await uploadImages(imagesToUpload);
      }

      const response = await api.post('/posts', {
        content: content,
        topic_id: id,
        parent_id: parentId ?? undefined,
        images: imageUrls,
      });

      // Update with real post data
      const realPost: Post = {
        ...response.data,
        author_name: user.username || 'Вы',
        author_avatar: user.avatar_url || null,
        upvote_count: parseInt(response.data.upvote_count) || 0,
        downvote_count: parseInt(response.data.downvote_count) || 0,
      };

      setTopic(prevTopic => {
        if (!prevTopic) return prevTopic;
        return {
          ...prevTopic,
          posts: prevTopic.posts.map(p => p.id === optimisticPost.id ? realPost : p),
        };
      });

      // Update global ID map with new post
      if (globalIdMap.size > 0) {
        const maxId = Math.max(...Array.from(globalIdMap.values()));
        setGlobalIdMap(prev => {
          const newMap = new Map(prev);
          newMap.set(`post-${response.data.id}`, maxId + 1);
          return newMap;
        });
      }

      // Refresh topic to get updated data
      await fetchTopic();
    } catch (error) {
      console.error('Error creating post:', error);
      // Revert optimistic update on error
      setTopic(prevTopic => {
        if (!prevTopic) return prevTopic;
        return {
          ...prevTopic,
          posts: prevTopic.posts.filter(p => p.id !== optimisticPost.id),
        };
      });
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
    if (!user || !topic) {
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
    setTopic(prevTopic => {
      if (!prevTopic) return prevTopic;
      return {
        ...prevTopic,
        posts: prevTopic.posts.map(post => {
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
        }),
      };
    });

    try {
      const response = await api.post(`/posts/${postId}/react`, {
        reaction_type: reactionType,
      });

      // Update with server response
      setReactions((prev) => {
        const newMap = new Map(prev);
        if (response.data.removed) {
          newMap.set(postId, null);
        } else {
          newMap.set(postId, response.data.reaction_type);
        }
        return newMap;
      });

      // Refresh topic to get accurate counts
      await fetchTopic();
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

  const handleDeletePost = async (postId: number) => {
    if (!topic) return;

    try {
      await api.delete(`/posts/${postId}`);
      
      // Optimistically remove post from UI
      setTopic(prevTopic => {
        if (!prevTopic) return prevTopic;
        return {
          ...prevTopic,
          posts: prevTopic.posts.filter(p => p.id !== postId),
        };
      });

      // Remove reaction from reactions map
      setReactions(prev => {
        const newMap = new Map(prev);
        newMap.delete(postId);
        return newMap;
      });

      // Refresh topic to get updated data
      await fetchTopic();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      if (error.response?.status === 403) {
        alert('У вас нет прав для удаления этого сообщения');
      } else if (error.response?.status === 404) {
        alert('Сообщение не найдено');
      } else {
        alert('Ошибка при удалении сообщения');
      }
    }
  };

  const handleStartEditPost = (postId: number) => {
    const post = topic?.posts.find((p) => p.id === postId);
    if (post) {
      setEditingPostId(postId);
      setPostEditContent(post.content);
    }
  };

  const handleSaveEditPost = async (postId: number, content: string) => {
    if (!content.trim()) return;
    try {
      await api.put(`/posts/${postId}`, { content: content.trim() });
      setTopic(prevTopic => {
        if (!prevTopic) return prevTopic;
        return {
          ...prevTopic,
          posts: prevTopic.posts.map(p => p.id === postId ? { ...p, content: content.trim() } : p),
        };
      });
      setEditingPostId(null);
      setPostEditContent('');
    } catch (error: any) {
      console.error('Error updating post:', error);
      alert(error.response?.data?.error || 'Ошибка при сохранении сообщения');
    }
  };

  const handleCancelEditPost = () => {
    setEditingPostId(null);
    setPostEditContent('');
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

  const handleStartEditTopic = () => {
    if (!topic) return;
    setEditTitle(topic.title);
    setEditContent(topic.content);
    setIsEditingTopic(true);
  };

  const handleCancelTopicEdit = () => {
    setIsEditingTopic(false);
  };

  const handleSaveTopicEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || savingTopic) return;
    if (!editTitle.trim() || !editContent.trim()) {
      alert('Название и содержание не могут быть пустыми');
      return;
    }
    setSavingTopic(true);
    try {
      const response = await api.put(`/topics/${topic.id}`, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      setTopic(prev => prev ? { ...prev, title: response.data.title, content: response.data.content } : null);
      setIsEditingTopic(false);
    } catch (error: any) {
      console.error('Error updating topic:', error);
      if (error.response?.status === 403) {
        alert('У вас нет прав для редактирования этой темы');
      } else if (error.response?.data?.errors) {
        const msg = error.response.data.errors.map((e: { msg: string }) => e.msg).join('\n');
        alert(msg);
      } else {
        alert('Ошибка при сохранении темы');
      }
    } finally {
      setSavingTopic(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isTopicAuthor = user && topic && user.id === topic.author_id;
  const canEditTopic = user && topic && (isTopicAuthor || isAdmin);
  const canCreatePoll = user && topic && (isTopicAuthor || isAdmin) && !topic.poll;
  const canEditPoll = user && topic?.poll && (isTopicAuthor || isAdmin);

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || creatingPoll) return;
    const opts = pollOptions.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) {
      alert('Добавьте минимум 2 варианта ответа');
      return;
    }
    if (!pollQuestion.trim()) {
      alert('Введите вопрос голосования');
      return;
    }
    setCreatingPoll(true);
    try {
      await api.post(`/topics/${topic.id}/polls`, {
        question: pollQuestion.trim(),
        options: opts,
        multiple_choice: pollMultipleChoice,
        allow_view_without_vote: pollAllowViewWithoutVote,
      });
      setShowCreatePollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollMultipleChoice(false);
      setPollAllowViewWithoutVote(true);
      await fetchTopic();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Ошибка создания голосования');
    } finally {
      setCreatingPoll(false);
    }
  };

  const addPollOption = () => {
    if (pollOptions.length >= 10) return;
    setPollOptions((prev) => [...prev, '']);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePollVote = async () => {
    if (!topic?.poll || pollVoting) return;
    const poll = topic.poll;
    if (poll.multiple_choice) {
      if (pollVoteMultiple.length === 0) {
        alert('Выберите хотя бы один вариант');
        return;
      }
    } else {
      if (pollVoteSingle == null) {
        alert('Выберите вариант');
        return;
      }
    }
    setPollVoting(true);
    try {
      if (poll.multiple_choice) {
        await api.post(`/polls/${poll.id}/vote`, { option_ids: pollVoteMultiple });
      } else {
        await api.post(`/polls/${poll.id}/vote`, { option_id: pollVoteSingle });
      }
      await fetchTopic();
      setPollVoteSingle(null);
      setPollVoteMultiple([]);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Ошибка при голосовании');
    } finally {
      setPollVoting(false);
    }
  };

  const userHasVoted = topic?.poll && topic.poll.user_voted_option_ids.length > 0;
  const canSeeResults = topic?.poll && (userHasVoted || topic.poll.allow_view_without_vote || pollShowResultsWithoutVote);
  const showVoteForm = topic?.poll && !userHasVoted && !pollShowResultsWithoutVote;

  const handleStartEditPollQuestion = () => {
    if (topic?.poll) {
      setPollEditQuestion(topic.poll.question);
      setIsEditingPollQuestion(true);
    }
  };

  const handleSavePollQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic?.poll || savingPollEdit || !pollEditQuestion.trim()) return;
    setSavingPollEdit(true);
    try {
      await api.put(`/polls/${topic.poll.id}`, { question: pollEditQuestion.trim() });
      setTopic((prev) =>
        prev?.poll
          ? { ...prev, poll: { ...prev.poll, question: pollEditQuestion.trim() } }
          : prev
      );
      setIsEditingPollQuestion(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка при сохранении');
    } finally {
      setSavingPollEdit(false);
    }
  };

  const handleCancelPollEdit = () => {
    setIsEditingPollQuestion(false);
    setPollEditQuestion('');
  };

  const handleDeletePoll = async () => {
    if (!topic?.poll || deletingPoll) return;
    if (!window.confirm('Удалить голосование? Голоса будут потеряны.')) return;
    setDeletingPoll(true);
    try {
      await api.delete(`/polls/${topic.poll.id}`);
      setTopic((prev) => (prev ? { ...prev, poll: null } : prev));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Ошибка при удалении');
    } finally {
      setDeletingPoll(false);
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
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          {error || 'Тема не найдена'}
        </div>
        <div className="text-sm text-gray-400 mb-4">
          ID темы: {id || 'не указан'}
        </div>
        <Link
          to="/"
          className="text-blue-600 hover:underline"
        >
          ← Вернуться на главную
        </Link>
      </div>
    );
  }

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(`/category/${topic.category_id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-4 px-3 sm:px-4">
      <div className="max-w-[84rem] mx-auto">
      <button
        type="button"
        onClick={goBack}
        className="text-blue-600 hover:underline mb-4 inline-block text-left bg-transparent border-none cursor-pointer p-2 -ml-2 min-h-[44px] flex items-center"
      >
        ← Назад
      </button>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 relative">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
            {isEditingTopic ? (
              <span className="text-blue-600 font-mono text-sm sm:text-lg">
                #{globalIdMap.get(`topic-${topic.id}`) || 0}
              </span>
            ) : (
              <>
                <h1 className="text-xl sm:text-3xl font-bold break-words">{topic.title}</h1>
                <span className="text-blue-600 font-mono text-sm sm:text-lg cursor-pointer hover:underline flex-shrink-0"
                      title="Ссылка на тему">
                  #{globalIdMap.get(`topic-${topic.id}`) || 0}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start">
            {canCreatePoll && (
              <button
                type="button"
                onClick={() => setShowCreatePollModal(true)}
                className="bg-blue-500 text-white px-3 py-2 text-xs sm:text-sm rounded hover:bg-blue-600 transition min-h-[40px]"
                title="Создать голосование"
              >
                📊 Голосование
              </button>
            )}
            {canEditTopic && !isEditingTopic && (
              <button
                type="button"
                onClick={handleStartEditTopic}
                className="bg-blue-500 text-white px-3 py-2 text-xs sm:text-sm rounded hover:bg-blue-600 transition min-h-[40px]"
                title="Редактировать тему"
              >
                ✏️ Редакт.
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleDeleteTopic}
                className="bg-red-500 text-white px-3 py-2 text-xs sm:text-sm rounded hover:bg-red-600 transition min-h-[40px]"
                title="Удалить тему"
              >
                🗑️ Удалить
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
          <Link to={`/users/${topic.author_id}`} className="flex items-center gap-3 hover:text-blue-600 transition">
            <Avatar avatarUrl={topic.author_avatar} username={topic.author_name} size="md" />
            <div>
              <span className="font-medium text-gray-700 hover:text-blue-600">
                {topic.author_name}
              </span>
              <div>{new Date(topic.created_at).toLocaleString('ru-RU')}</div>
            </div>
          </Link>
        </div>
        {isEditingTopic ? (
          <form onSubmit={handleSaveTopicEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название темы</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-lg"
                placeholder="Название"
                maxLength={200}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Содержание</label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 min-h-[200px]"
                placeholder="Содержание темы"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingTopic}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
              >
                {savingTopic ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={handleCancelTopicEdit}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition"
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <div className="prose max-w-none">
            <MarkdownRenderer content={topic.content} />
            {topic.images && topic.images.length > 0 && (
              <div className={`mt-4 ${topic.images.length > 1 ? 'grid grid-cols-2 gap-0' : 'flex'}`}>
                {topic.images.map((imageUrl, imgIndex) => {
                  const fullUrl = imageUrl.startsWith('http') ? imageUrl : (import.meta.env.VITE_API_URL || '') + imageUrl;
                  const imagesArray = topic.images || [];
                  return (
                    <img
                      key={imgIndex}
                      src={fullUrl}
                      alt={`Image ${imgIndex + 1}`}
                      className={imagesArray.length > 1 ? 'w-full h-auto rounded border cursor-pointer hover:opacity-90' : 'w-1/4 max-w-[25%] h-auto rounded border cursor-pointer hover:opacity-90'}
                      onClick={() => window.open(fullUrl, '_blank')}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create poll modal */}
      {showCreatePollModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4" onClick={() => !creatingPoll && setShowCreatePollModal(false)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Создать голосование</h3>
            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Вопрос</label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  placeholder="Текст вопроса"
                  maxLength={500}
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Варианты (от 2 до 10)</label>
                  {pollOptions.length < 10 && (
                    <button type="button" onClick={addPollOption} className="text-blue-600 hover:underline text-sm">
                      + Добавить вариант
                    </button>
                  )}
                </div>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => setPollOptions((prev) => prev.map((o, i) => (i === idx ? e.target.value : o)))}
                      className="flex-1 border border-gray-300 rounded px-3 py-2"
                      placeholder={`Вариант ${idx + 1}`}
                      maxLength={200}
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => removePollOption(idx)} className="text-red-600 hover:bg-red-50 px-2 rounded">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="poll-multiple"
                  checked={pollMultipleChoice}
                  onChange={(e) => setPollMultipleChoice(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="poll-multiple" className="text-sm text-gray-700">Множественный выбор (несколько вариантов)</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="poll-view-without-vote"
                  checked={pollAllowViewWithoutVote}
                  onChange={(e) => setPollAllowViewWithoutVote(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="poll-view-without-vote" className="text-sm text-gray-700">Разрешить просмотр результатов без голосования</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={creatingPoll} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50">
                  {creatingPoll ? 'Создание...' : 'Создать голосование'}
                </button>
                <button type="button" onClick={() => !creatingPoll && setShowCreatePollModal(false)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition">
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Poll block: vote form or results — full width as topic card */}
      {topic.poll && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            {isEditingPollQuestion ? (
              <form onSubmit={handleSavePollQuestion} className="flex-1 min-w-0 flex gap-2 items-center">
                <input
                  type="text"
                  value={pollEditQuestion}
                  onChange={(e) => setPollEditQuestion(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-lg"
                  placeholder="Вопрос голосования"
                  maxLength={500}
                  autoFocus
                />
                <button type="submit" disabled={savingPollEdit} className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-sm whitespace-nowrap">
                  {savingPollEdit ? '…' : 'Сохранить'}
                </button>
                <button type="button" onClick={handleCancelPollEdit} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-300 text-sm whitespace-nowrap">
                  Отмена
                </button>
              </form>
            ) : (
              <>
                <h3 className="text-lg font-semibold flex-1">{topic.poll.question}</h3>
                {canEditPoll && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleStartEditPollQuestion}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      ✏️ Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={handleDeletePoll}
                      disabled={deletingPoll}
                      className="text-red-600 hover:underline text-sm disabled:opacity-50"
                    >
                      {deletingPoll ? '…' : '🗑️ Удалить'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          {topic.poll.multiple_choice && (
            <p className="text-sm text-gray-500 mb-3">Можно выбрать несколько вариантов</p>
          )}

          {showVoteForm && (
            <>
              <div className="space-y-2 mb-4">
                {topic.poll.options.map((opt) =>
                  topic.poll!.multiple_choice ? (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pollVoteMultiple.includes(opt.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPollVoteMultiple((prev) => prev.length >= 10 ? prev : [...prev, opt.id]);
                          } else {
                            setPollVoteMultiple((prev) => prev.filter((id) => id !== opt.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span>{opt.text}</span>
                    </label>
                  ) : (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="poll-vote"
                        checked={pollVoteSingle === opt.id}
                        onChange={() => setPollVoteSingle(opt.id)}
                        className="border-gray-300 text-blue-600"
                      />
                      <span>{opt.text}</span>
                    </label>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePollVote}
                  disabled={pollVoting || (topic.poll!.multiple_choice ? pollVoteMultiple.length === 0 : pollVoteSingle == null)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition disabled:opacity-50"
                >
                  {pollVoting ? 'Отправка...' : 'Проголосовать'}
                </button>
                {topic.poll.allow_view_without_vote && (
                  <button
                    type="button"
                    onClick={() => setPollShowResultsWithoutVote(true)}
                    className="text-blue-600 hover:underline"
                  >
                    Посмотреть результаты
                  </button>
                )}
              </div>
            </>
          )}

          {canSeeResults && (
            <>
              <div className="space-y-3 mb-2">
                {topic.poll.options.map((opt) => {
                  const total = topic.poll!.total_votes || 1;
                  const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0;
                  return (
                    <div key={opt.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-800">{opt.text}</span>
                        <span className="text-gray-600">{opt.vote_count} ({pct}%)</span>
                      </div>
                      <div className="h-6 bg-gray-200 rounded overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-gray-500">Всего голосов: {topic.poll.total_votes}</p>
              {topic.poll.allow_view_without_vote && !userHasVoted && pollShowResultsWithoutVote && (
                <button
                  type="button"
                  onClick={() => setPollShowResultsWithoutVote(false)}
                  className="mt-2 text-blue-600 hover:underline text-sm"
                >
                  ← Вернуться к голосованию
                </button>
              )}
            </>
          )}
        </div>
      )}

      <h2 className="text-xl sm:text-2xl font-bold mb-4">Сообщения ({topic.posts.length})</h2>

      <div className="space-y-4 mb-6">
        {topic.posts.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center text-gray-500">
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
              onDelete={handleDeletePost}
              onStartEdit={handleStartEditPost}
              onSaveEdit={handleSaveEditPost}
              onCancelEdit={handleCancelEditPost}
              onEditContentChange={setPostEditContent}
              editingPostId={editingPostId}
              editContent={postEditContent}
              level={0}
              allPosts={topic.posts}
              getGlobalId={(postId: number) => globalIdMap.get(`post-${postId}`) || 0}
            />
          ))
        )}
      </div>

      {user && (
        <form
          id="reply-form"
          onSubmit={handleSubmitPost}
          className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 sm:p-6"
        >
          {replyingTo && (() => {
            const replyingToPost = getReplyingToPost();
            if (!replyingToPost) return null;
            
            const getGlobalIdForPost = (postId: number) => {
              return globalIdMap.get(`post-${postId}`) || 0;
            };
            
            return (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-gray-600">
                    Ответ на{' '}
                    <span className="text-blue-600 font-mono">
                      #{getGlobalIdForPost(replyingToPost.id)}
                    </span>
                    {' '}от {replyingToPost.author_name}
                  </div>
                  <button
                    type="button"
                    onClick={cancelReply}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ✕ Отменить ответ
                  </button>
                </div>
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
    </div>
  );
};

export default Topic;
