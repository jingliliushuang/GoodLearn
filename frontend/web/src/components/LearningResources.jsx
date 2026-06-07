const TYPE_LABELS = {
  documentation: '文档',
  tutorial: '教程',
  course: '课程',
  code: '代码',
  dataset: '数据集',
  book: '书籍',
  benchmark: '基准',
};

export default function LearningResources({ resources }) {
  if (!resources || resources.length === 0) {
    return null;
  }

  return (
    <div className="resource-list">
      {resources.map((item) => (
        <div key={item.id || item.title} className="resource-card card">
          <div className="resource-header">
            <span className="resource-title">{item.title}</span>
            {item.type && (
              <span className="badge badge-resource">{TYPE_LABELS[item.type] || item.type}</span>
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
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="resource-link">
              打开链接 →
            </a>
          ) : (
            <span className="resource-link resource-link-muted">暂无链接</span>
          )}
        </div>
      ))}
    </div>
  );
}
