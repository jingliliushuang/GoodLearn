import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchDomain } from '../api/client';
import NodeCard from '../components/NodeCard';

const SECTION_ORDER = ['basic', 'intermediate', 'advanced', 'planned'];

const SECTION_LABELS = {
  basic: '基础学习',
  intermediate: '进阶学习',
  advanced: '进阶实验',
  planned: '预留方向',
};

function inferSection(node) {
  if (node.section) return node.section;
  return node.status === 'planned' ? 'planned' : 'basic';
}

function groupNodesBySection(nodes) {
  const sorted = [...nodes].sort((a, b) => {
    const sectionA = SECTION_ORDER.indexOf(inferSection(a));
    const sectionB = SECTION_ORDER.indexOf(inferSection(b));
    if (sectionA !== sectionB) return sectionA - sectionB;
    return (a.order ?? 999) - (b.order ?? 999);
  });

  return SECTION_ORDER.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    nodes: sorted.filter((node) => inferSection(node) === section),
  })).filter((group) => group.nodes.length > 0);
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

  const sections = useMemo(
    () => (domain?.nodes ? groupNodesBySection(domain.nodes) : []),
    [domain],
  );

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
        sections.map((group) => (
          <section key={group.section} className="domain-section">
            <h2 className="domain-section-title">{group.label}</h2>
            <div className="card-grid">
              {group.nodes.map((node) => (
                <NodeCard key={node.id} domainId={domainId} node={node} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
