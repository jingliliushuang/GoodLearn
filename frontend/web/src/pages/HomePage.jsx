import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDomains } from '../api/client';
import DomainCard from '../components/DomainCard';

export default function HomePage() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDomains()
      .then(setDomains)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">加载失败：{error}。请确认后端已启动。</div>;

  return (
    <div>
      <h1 className="page-title">选择计算机领域</h1>
      <p className="page-desc">
        从知识树中选择一个领域，深入细化知识点，学习理论并本地测试算法模型。
      </p>
      <p className="page-desc">
        <Link to="/node-manager">节点管理</Link>
        {' — 生成模板、导出 / 导入节点 zip'}
      </p>
      <div className="card-grid">
        {domains.map((domain) => (
          <DomainCard key={domain.id} domain={domain} />
        ))}
      </div>
    </div>
  );
}
