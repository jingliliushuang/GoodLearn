import { useMemo, useState } from 'react';

const TYPE_LABELS = {
  documentation: '文档',
  tutorial: '教程',
  course: '课程',
  code: '代码',
  dataset: '数据集',
  book: '书籍',
  benchmark: '基准',
  tool: '工具',
};

const FILTER_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'documentation', label: '文档' },
  { id: 'tutorial', label: '教程' },
  { id: 'course', label: '课程' },
  { id: 'code', label: '代码' },
  { id: 'dataset', label: '数据集' },
  { id: 'benchmark', label: '基准' },
  { id: 'book', label: '书籍' },
  { id: 'tool', label: '工具' },
];

const DEFAULT_VISIBLE = 6;

export default function LearningResources({ resources }) {
  const safeResources = Array.isArray(resources) ? resources : [];
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!safeResources.length) return [];
    if (filter === 'all') return safeResources;
    return safeResources.filter((item) => item.type === filter);
  }, [safeResources, filter]);

  if (!safeResources.length) {
    return null;
  }

  const visible = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE);
  const hasMore = filtered.length > DEFAULT_VISIBLE;

  return (
    <div className="learning-resources">
      <div className="resource-filters">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`resource-filter-chip ${filter === opt.id ? 'active' : ''}`}
            onClick={() => {
              setFilter(opt.id);
              setExpanded(false);
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="resource-empty">该类型暂无学习资料。</p>
      ) : (
        <>
          <div className="resource-list">
            {visible.map((item) => {
              const hasUrl = Boolean(item.url);
              return (
                <div key={item.id || item.title} className="resource-card card">
                  <div className="resource-header">
                    <span className="resource-title">{item.title}</span>
                    {item.type && (
                      <span className="badge badge-resource">
                        {TYPE_LABELS[item.type] || item.type}
                      </span>
                    )}
                  </div>
                  {item.summary && <p className="resource-summary">{item.summary}</p>}
                  {item.tags && item.tags.length > 0 && (
                    <div className="resource-tags">
                      {item.tags.map((tag) => (
                        <span key={tag} className="resource-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  {hasUrl ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary resource-link-btn"
                    >
                      打开链接 →
                    </a>
                  ) : (
                    <button type="button" className="btn btn-secondary resource-link-btn" disabled>
                      暂无链接
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="resource-expand-row">
              <button
                type="button"
                className="btn btn-secondary resource-expand-btn"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? '收起' : `展开全部（${filtered.length} 条）`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
