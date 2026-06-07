const TYPE_LABELS = {
  book: '书籍',
  document: '文档',
  tutorial: '教程',
  paper: '论文',
};

export default function ReferenceList({ references }) {
  if (!references || references.length === 0) {
    return null;
  }

  return (
    <ul className="paper-list">
      {references.map((ref, idx) => (
        <li key={ref.title || idx} className="paper-item">
          <div className="paper-header">
            <div className="paper-name">{ref.title}</div>
            {ref.type && (
              <span className={`badge badge-type badge-type-${ref.type === 'paper' ? 'cnn' : 'traditional'}`}>
                {TYPE_LABELS[ref.type] || ref.type}
              </span>
            )}
          </div>
          <div className="paper-summary">{ref.summary}</div>
          {ref.url && (
            <div className="paper-links">
              <a href={ref.url} target="_blank" rel="noopener noreferrer">
                查看资料
              </a>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
