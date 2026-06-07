import { Link } from 'react-router-dom';

export default function NodeCard({ domainId, node }) {
  const isReady = node.status !== 'planned';
  const isPipeline = node.link_type === 'pipeline';
  const entryPath = isPipeline
    ? `/domain/${domainId}/pipeline`
    : `/node/${domainId}/${node.id}`;

  const badges = node.card_badges || (isPipeline ? ['进阶实验'] : [isReady ? '可学习' : '预留']);
  const hint = node.card_hint;

  return (
    <div className={`card ${isReady ? '' : 'disabled'} ${isPipeline ? 'pipeline-entry-card' : ''}`}>
      <div className="card-title">{node.title}</div>
      <div className="card-desc">{node.description}</div>
      {hint && isReady && (
        <p className="card-hint">{hint}</p>
      )}
      <div className="card-badges">
        {badges.map((badge) => (
          <span
            key={badge}
            className={`badge ${
              badge === '可实验' || badge === '进阶实验' || badge === 'Pipeline Builder'
                ? 'badge-advanced'
                : isReady
                  ? 'badge-ready'
                  : 'badge-planned'
            }`}
          >
            {badge}
          </span>
        ))}
      </div>
      {isReady && (
        <div style={{ marginTop: '1rem' }}>
          <Link to={entryPath} className="btn btn-primary">
            {isPipeline ? '开始组合' : '开始学习'}
          </Link>
        </div>
      )}
    </div>
  );
}
