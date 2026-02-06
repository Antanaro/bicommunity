import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MarkdownRenderer from '../components/MarkdownRenderer';

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
        <p className="text-gray-500">Загрузка...</p>
      </div>
    );
  }

  const markdownHelp = `## Справка по Markdown

Форум поддерживает форматирование текста с помощью **Markdown**.

### Основные возможности:

**Заголовки:**
\`\`\`
# Заголовок 1
## Заголовок 2
### Заголовок 3
\`\`\`

**Выделение текста:**
- \`**жирный**\` → **жирный**
- \`*курсив*\` → *курсив*
- \`\`код\`\` → \`код\`

**Списки:**
- Маркированный: \`- пункт\`
- Нумерованный: \`1. пункт\`

**Ссылки и изображения:**
- \`[текст](url)\` → ссылка
- \`![alt](url)\` → изображение

**Код:**
- Инлайн: \`код\`
- Блок: \`\`\`язык\\nкод\`\`\`

**Другое:**
- \`> цитата\` → цитата
- \`---\` → горизонтальная линия
- Таблицы (GitHub Flavored Markdown)`;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">О форуме</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Основная информация о форуме */}
        <div>
          {editing ? (
            <div className="space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[300px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                {content ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <p className="text-gray-500">Текст ещё не добавлен.</p>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Редактировать
                </button>
              )}
            </>
          )}
        </div>

        {/* Справка по Markdown */}
        <div>
          <div className="bg-white rounded-lg shadow p-6">
            <MarkdownRenderer content={markdownHelp} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
