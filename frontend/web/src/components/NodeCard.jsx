import { Link } from 'react-router-dom';

export default function NodeCard({ domainId, node }) {
  const isReady = node.status !== 'planned';

  return (
    <div className={`card ${isReady ? '' : 'disabled'}`}>
      <div className="card-title">{node.title}</div>
      <div className="card-desc">{node.description}</div>
      <span className={`badge ${isReady ? 'badge-ready' : 'badge-planned'}`}>
        {isReady ? '可学习' : '预留'}
      </span>
      {isReady && (
        <div style={{ marginTop: '1rem' }}>
          <Link to={`/node/${domainId}/${node.id}`} className="btn btn-primary">
            开始学习
          </Link>
        </div>
      )}
    </div>
  );
}
