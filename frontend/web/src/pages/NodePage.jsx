import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchNode } from '../api/client';
import MarkdownViewer from '../components/MarkdownViewer';
import PaperList from '../components/PaperList';
import MethodSelector from '../components/MethodSelector';
import ModelTester from '../components/ModelTester';

export default function NodePage() {
  const { domainId, nodeId } = useParams();
  const [node, setNode] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNode(domainId, nodeId)
      .then((data) => {
        setNode(data);
        const firstAvailable = data.methods.find((m) => m.available);
        if (firstAvailable) setSelectedMethod(firstAvailable.id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [domainId, nodeId]);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">加载失败：{error}</div>;
  if (!node) return null;

  return (
    <div>
      <Link to={`/domain/${domainId}`} className="back-link">← 返回领域</Link>
      <h1 className="page-title">{node.title}</h1>
      <p className="page-desc">{node.description}</p>

      <section className="section">
        <h2 className="section-title">教学内容</h2>
        <div className="card">
          <MarkdownViewer content={node.content_markdown} />
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">相关论文</h2>
        <PaperList papers={node.papers} />
      </section>

      <section className="section">
        <h2 className="section-title">方法选择</h2>
        <MethodSelector
          methods={node.methods}
          selected={selectedMethod}
          onSelect={setSelectedMethod}
        />
      </section>

      <section className="section">
        <h2 className="section-title">模型测试</h2>
        <ModelTester
          domainId={domainId}
          nodeId={nodeId}
          selectedMethod={selectedMethod}
        />
      </section>
    </div>
  );
}
