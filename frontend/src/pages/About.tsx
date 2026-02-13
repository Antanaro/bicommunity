import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import SeoHead from '../components/SeoHead';

const About = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [content, setContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchAbout = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ content: string }>('/settings/about');
      const text = res.data?.content ?? '';
      setContent(text);
      setEditContent(text);
    } catch (e) {
      console.error('Failed to load about:', e);
      setContent('');
      setEditContent('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbout();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/about', { content: editContent });
      setContent(editContent);
      setEditing(false);
    } catch (e) {
      console.error('Failed to save about:', e);
      alert('Не удалось сохранить изменения.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(content);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-gray-500 dark:text-gray-400">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-1 sm:px-0">
      <SeoHead
        title="О форуме"
        description="О форуме BI Community — площадка для обсуждения Business Intelligence, DWH, ETL и аналитики данных."
        canonical="/about"
      />
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 sm:mb-6">О форуме</h1>

      {editing ? (
        <div className="space-y-4">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[300px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="Текст в формате Markdown..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 border border-gray-200 dark:border-gray-700 prose prose-slate dark:prose-invert max-w-none">
            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Текст ещё не добавлен.</p>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={() => setEditing(true)}
              className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Редактировать
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default About;
