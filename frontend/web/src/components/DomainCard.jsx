import { Link } from 'react-router-dom';

export default function DomainCard({ domain }) {
  const isReady = domain.status === 'ready';

  return (
    <div className={`card ${isReady ? '' : 'disabled'}`}>
      <div className="card-title">{domain.title}</div>
      <div className="card-desc">{domain.description}</div>
      <span className={`badge ${isReady ? 'badge-ready' : 'badge-planned'}`}>
        {isReady ? '可进入' : '建设中'}
      </span>
      {isReady && (
        <div style={{ marginTop: '1rem' }}>
          <Link to={`/domain/${domain.id}`} className="btn btn-primary">
            进入学习
          </Link>
        </div>
      )}
    </div>
  );
}
