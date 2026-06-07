import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchNode } from '../api/client';
import MarkdownViewer from '../components/MarkdownViewer';
import PaperList from '../components/PaperList';
import ReferenceList from '../components/ReferenceList';
import MethodSelector from '../components/MethodSelector';
import ModelTester from '../components/ModelTester';
import TimerCalculator from '../components/demos/TimerCalculator';
import RoundRobinDemo from '../components/demos/RoundRobinDemo';
import SuperResolutionNodePage from './SuperResolutionNodePage';

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
        const methods = data.methods || [];
        const firstAvailable = methods.find((m) => m.available);
        if (firstAvailable) {
          setSelectedMethod(firstAvailable.id);
        } else if (methods.length > 0) {
          setSelectedMethod(methods[0].id);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [domainId, nodeId]);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">加载失败：{error}</div>;
  if (!node) return null;

  const isSuperResolution = domainId === 'cv' && nodeId === 'super_resolution';

  if (isSuperResolution) {
    return <SuperResolutionNodePage node={node} domainId={domainId} nodeId={nodeId} />;
  }

  const methods = node.methods || [];
  const hasPapers = node.papers && node.papers.length > 0;
  const hasReferences = node.references && node.references.length > 0;
  const hasMethods = methods.length > 0;
  const showTimerDemo = domainId === 'embedded' && nodeId === 'timer';
  const showRoundRobinDemo = domainId === 'operating_system' && nodeId === 'process_scheduling';

  return (
    <div>
      <Link to={`/domain/${domainId}`} className="back-link">← 返回领域</Link>
      <h1 className="page-title">{node.title}</h1>
      <p className="page-desc">{node.description}</p>
      {node.difficulty && (
        <span className={`badge badge-diff badge-diff-${node.difficulty}`}>{node.difficulty}</span>
      )}

      <section className="section">
        <h2 className="section-title">教学内容</h2>
        <div className="card">
          <MarkdownViewer content={node.content_markdown} />
        </div>
      </section>

      {hasPapers && (
        <section className="section">
          <h2 className="section-title">相关论文与方法</h2>
          <PaperList papers={node.papers} />
        </section>
      )}

      {hasReferences && (
        <section className="section">
          <h2 className="section-title">参考资料</h2>
          <ReferenceList references={node.references} />
        </section>
      )}

      {showTimerDemo && (
        <section className="section">
          <h2 className="section-title">交互 Demo</h2>
          <TimerCalculator />
        </section>
      )}

      {showRoundRobinDemo && (
        <section className="section">
          <h2 className="section-title">交互 Demo</h2>
          <RoundRobinDemo />
        </section>
      )}

      {hasMethods && (
        <section className="section">
          <h2 className="section-title">模型选择</h2>
          <MethodSelector
            methods={methods}
            selected={selectedMethod}
            onSelect={setSelectedMethod}
          />
        </section>
      )}

      {hasMethods && (
        <section className="section">
          <h2 className="section-title">模型测试</h2>
          <ModelTester
            domainId={domainId}
            nodeId={nodeId}
            methods={methods}
            selectedMethod={selectedMethod}
          />
        </section>
      )}

      {!hasMethods && !showTimerDemo && !showRoundRobinDemo && (
        <section className="section">
          <div className="warn-box">该节点暂无可运行实验，请阅读教学内容与参考资料。</div>
        </section>
      )}
    </div>
  );
}
