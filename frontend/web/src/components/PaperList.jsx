import { useMemo, useState } from 'react';

const TYPE_LABELS = {
  all: '全部',
  traditional: 'Traditional',
  cnn: 'CNN',
  gan: 'GAN',
  transformer: 'Transformer',
};

const DIFFICULTY_LABELS = {
  easy: '入门',
  medium: '中等',
  hard: '进阶',
};

export default function PaperList({ papers }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (!papers) return [];
    if (filter === 'all') return papers;
    return papers.filter((p) => p.type === filter);
  }, [papers, filter]);

  if (!papers || papers.length === 0) {
    return <p className="card-desc">暂无论文列表</p>;
  }

  const types = ['all', ...new Set(papers.map((p) => p.type).filter(Boolean))];

  return (
    <div>
      <div className="paper-filters">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            className={`filter-chip ${filter === type ? 'selected' : ''}`}
            onClick={() => setFilter(type)}
          >
            {TYPE_LABELS[type] || type}
          </button>
        ))}
        <span className="paper-count">共 {filtered.length} 篇</span>
      </div>

      <ul className="paper-list">
        {filtered.map((paper) => (
          <li key={paper.id || paper.method} className="paper-item">
            <div className="paper-header">
              <div className="paper-name">{paper.method}</div>
              <div className="paper-badges">
                {paper.year && <span className="badge badge-year">{paper.year}</span>}
                {paper.type && (
                  <span className={`badge badge-type badge-type-${paper.type}`}>
                    {TYPE_LABELS[paper.type] || paper.type}
                  </span>
                )}
                {paper.difficulty && (
                  <span className={`badge badge-diff badge-diff-${paper.difficulty}`}>
                    {DIFFICULTY_LABELS[paper.difficulty] || paper.difficulty}
                  </span>
                )}
              </div>
            </div>
            <div className="paper-title">{paper.title}</div>
            <div className="paper-summary">{paper.summary}</div>
            {paper.core_idea && paper.core_idea.length > 0 && (
              <ul className="paper-ideas">
                {paper.core_idea.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            )}
            <div className="paper-links">
              {paper.paper_url && (
                <a href={paper.paper_url} target="_blank" rel="noopener noreferrer">
                  论文链接
                </a>
              )}
              {paper.code_url && (
                <a href={paper.code_url} target="_blank" rel="noopener noreferrer">
                  代码链接
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
