import { useMemo } from 'react';
import { marked } from 'marked';

export default function MarkdownViewer({ content }) {
  const html = useMemo(() => {
    if (!content) return '';
    return marked.parse(content);
  }, [content]);

  return (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
