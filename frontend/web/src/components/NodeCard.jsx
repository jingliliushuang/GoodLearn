import { Link } from 'react-router-dom';

export default function NodeCard({ domainId, node }) {
  const isReady = node.status !== 'planned';
  const isPipeline = node.link_type === 'pipeline';
  const entryPath = isPipeline
    ? `/domain/${domainId}/pipeline`
    : `/node/${domainId}/${node.id}`;

  return (
    <div className={`card ${isReady ? '' : 'disabled'} ${isPipeline ? 'pipeline-entry-card' : ''}`}>
      <div className="card-title">{node.title}</div>
      <div className="card-desc">{node.description}</div>
      <div className="card-badges">
        {isPipeline ? (
          <>
            <span className="badge badge-advanced">进阶实验</span>
            <span className="badge badge-ready">Pipeline Builder</span>
          </>
        ) : (
          <span className={`badge ${isReady ? 'badge-ready' : 'badge-planned'}`}>
            {isReady ? '可学习' : '预留'}
          </span>
        )}
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
