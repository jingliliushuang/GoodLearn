export default function PaperList({ papers }) {
  if (!papers || papers.length === 0) {
    return <p className="card-desc">暂无论文列表</p>;
  }

  return (
    <ul className="paper-list">
      {papers.map((paper) => (
        <li key={paper.name} className="paper-item">
          <div className="paper-name">{paper.name}</div>
          <div className="paper-title">{paper.title}</div>
          {paper.url && (
            <div style={{ marginBottom: '0.5rem' }}>
              <a href={paper.url} target="_blank" rel="noopener noreferrer">
                查看论文
              </a>
            </div>
          )}
          <div className="paper-summary">{paper.summary}</div>
        </li>
      ))}
    </ul>
  );
}
