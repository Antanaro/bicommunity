import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Компонент для рендеринга Markdown с поддержкой GitHub Flavored Markdown (memo для меньшего числа ререндеров)
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(({ content, className = '' }) => {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Кастомные стили для элементов Markdown
          p: ({ node, ...props }) => <p className="whitespace-pre-wrap mb-2" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-3 mt-4" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-2 mt-3" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-lg font-semibold mb-2 mt-2" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-base font-semibold mb-1 mt-2" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 ml-4" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 ml-4" {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600" {...props} />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const isInline = !className || !className.includes('language-');
            if (isInline) {
              return (
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-gray-100 p-3 rounded text-sm font-mono overflow-x-auto my-2" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }) => <pre className="bg-gray-100 p-3 rounded overflow-x-auto my-2" {...props} />,
          a: ({ node, ...props }) => (
            <a
              className="text-blue-600 underline hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          img: ({ node, ...props }) => (
            <img className="max-w-full h-auto rounded border my-2" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-gray-300" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-100" {...props} />,
          th: ({ node, ...props }) => (
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-gray-300 px-4 py-2" {...props} />
          ),
          hr: ({ node, ...props }) => <hr className="my-4 border-gray-300" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
