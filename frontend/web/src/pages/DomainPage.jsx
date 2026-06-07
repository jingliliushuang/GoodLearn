import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchDomain } from '../api/client';
import NodeCard from '../components/NodeCard';

function PipelineEntryCard({ domainId }) {
  return (
    <Link to={`/domain/${domainId}/pipeline`} className="card pipeline-entry-card">
      <div className="card-title">组合实验流水线</div>
      <div className="card-desc">
        自由拖拽去噪 / 超分节点，组成顺序流水线。按 Step 1 → Step 4 依次执行 cascade 组合实验。
      </div>
      <span className="badge badge-ready">Pipeline Builder</span>
    </Link>
  );
}

export default function DomainPage() {
  const { domainId } = useParams();
  const [domain, setDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDomain(domainId)
      .then(setDomain)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [domainId]);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">加载失败：{error}</div>;
  if (!domain) return null;

  return (
    <div>
      <Link to="/" className="back-link">← 返回首页</Link>
      <h1 className="page-title">{domain.title}</h1>
      <p className="page-desc">{domain.description}</p>

      {domain.status === 'planned' ? (
        <div className="card">
          <div className="card-title">该领域正在建设中</div>
          <div className="card-desc">敬请期待后续版本更新。</div>
        </div>
      ) : (
        <>
          {domainId === 'cv' && (
            <div className="card-grid pipeline-entry-grid">
              <PipelineEntryCard domainId={domainId} />
            </div>
          )}
          <div className="card-grid">
            {domain.nodes.map((node) => (
              <NodeCard key={node.id} domainId={domainId} node={node} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
