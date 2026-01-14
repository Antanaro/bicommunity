import React from 'react';

interface LinkifyTextProps {
  text: string;
  className?: string;
}

/**
 * Компонент для автоматического преобразования ссылок в тексте в кликабельные элементы
 */
const LinkifyText: React.FC<LinkifyTextProps> = ({ text, className = '' }) => {
  const linkify = (text: string): React.ReactNode[] => {
    // Регулярное выражение для поиска URL-адресов
    // Находит http://, https://, www., и обычные домены
    // Более точное выражение для доменов: должен содержать точку и доменное расширение
    const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/gi;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let keyCounter = 0;

    // Создаем массив всех совпадений
    const matches: Array<{ index: number; url: string; fullUrl: string }> = [];
    
    while ((match = urlRegex.exec(text)) !== null) {
      let url = match[0];
      let fullUrl = url;

      // Убираем знаки препинания в конце URL (кроме /)
      url = url.replace(/[.,;:!?]+$/, '');
      
      // Добавляем протокол, если его нет
      if (!url.match(/^https?:\/\//i)) {
        if (url.toLowerCase().startsWith('www.')) {
          fullUrl = 'https://' + url;
        } else {
          fullUrl = 'https://' + url;
        }
      } else {
        fullUrl = url;
      }

      matches.push({
        index: match.index,
        url: url,
        fullUrl: fullUrl,
      });
    }

    // Если совпадений нет, возвращаем текст как есть
    if (matches.length === 0) {
      return [text];
    }

    // Разбиваем текст на части и создаем элементы
    matches.forEach((match) => {
      // Добавляем текст до ссылки
      if (match.index > lastIndex) {
        const textBefore = text.substring(lastIndex, match.index);
        if (textBefore) {
          parts.push(
            <React.Fragment key={`text-${keyCounter++}`}>
              {textBefore}
            </React.Fragment>
          );
        }
      }

      // Добавляем ссылку
      parts.push(
        <a
          key={`link-${keyCounter++}`}
          href={match.fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {match.url}
        </a>
      );

      lastIndex = match.index + match.url.length;
    });

    // Добавляем оставшийся текст после последней ссылки
    if (lastIndex < text.length) {
      const textAfter = text.substring(lastIndex);
      if (textAfter) {
        parts.push(
          <React.Fragment key={`text-${keyCounter++}`}>
            {textAfter}
          </React.Fragment>
        );
      }
    }

    return parts;
  };

  return (
    <span className={className}>
      {linkify(text)}
    </span>
  );
};

export default LinkifyText;
