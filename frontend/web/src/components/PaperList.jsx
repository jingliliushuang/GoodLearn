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

function PaperItem({ paper }) {
  return (
    <li className="paper-item paper-item-compact">
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
      {!paper.compact && paper.core_idea && paper.core_idea.length > 0 && (
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
  );
}

export default function PaperList({
  papers,
  featuredIds = [],
  defaultCollapsed = false,
  compactWhenCollapsed = true,
}) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  const filtered = useMemo(() => {
    if (!papers) return [];
    if (filter === 'all') return papers;
    return papers.filter((p) => p.type === filter);
  }, [papers, filter]);

  const displayList = useMemo(() => {
    if (expanded || featuredIds.length === 0) return filtered;
    const featured = featuredIds
      .map((id) => papers.find((p) => p.id === id))
      .filter(Boolean);
    return featured;
  }, [expanded, featuredIds, filtered, papers]);

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
        <span className="paper-count">共 {papers.length} 篇</span>
        {featuredIds.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-sm paper-toggle"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '收起' : '展开全部'}
          </button>
        )}
      </div>

      {!expanded && featuredIds.length > 0 && (
        <p className="card-desc paper-hint">精选 {displayList.length} 篇，点击「展开全部」查看完整列表</p>
      )}

      <ul className="paper-list">
        {displayList.map((paper) => (
          <PaperItem
            key={paper.id || paper.method}
            paper={{ ...paper, compact: !expanded && compactWhenCollapsed }}
          />
        ))}
      </ul>
    </div>
  );
}
