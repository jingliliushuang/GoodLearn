import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarkdownViewer from '../components/MarkdownViewer';
import PaperList from '../components/PaperList';
import MethodSelector from '../components/MethodSelector';
import ModelTester from '../components/ModelTester';
import LearningPath from '../components/LearningPath';
import MethodDetailPanel from '../components/MethodDetailPanel';
import ExperimentHistory from '../components/ExperimentHistory';

export default function SuperResolutionNodePage({ node, domainId, nodeId }) {
  const methods = node.methods || [];
  const [selectedMethod, setSelectedMethod] = useState(() => {
    const first = methods.find((m) => m.available);
    return first ? first.id : methods[0]?.id || null;
  });
  const [experimentRefresh, setExperimentRefresh] = useState(0);

  const detail = selectedMethod ? node.method_details?.[selectedMethod] : null;
  const selectedMeta = methods.find((m) => m.id === selectedMethod);

  return (
    <div>
      <Link to={`/domain/${domainId}`} className="back-link">← 返回领域</Link>
      <h1 className="page-title">{node.title}</h1>
      <p className="page-desc">{node.description}</p>

      <section className="section">
        <h2 className="section-title">课程简介</h2>
        <div className="card">
          <MarkdownViewer content={node.content_markdown} />
        </div>
      </section>

      {node.learning_path?.length > 0 && (
        <section className="section">
          <h2 className="section-title">学习路线</h2>
          <p className="card-desc">按推荐顺序学习，点击「可运行」步骤可快速选中对应方法。</p>
          <LearningPath
            items={node.learning_path}
            methods={methods}
            selectedMethod={selectedMethod}
            onSelect={setSelectedMethod}
          />
        </section>
      )}

      {node.papers?.length > 0 && (
        <section className="section">
          <h2 className="section-title">论文与资料</h2>
          <PaperList papers={node.papers} />
        </section>
      )}

      {methods.length > 0 && (
        <section className="section">
          <h2 className="section-title">方法选择</h2>
          <MethodSelector
            methods={methods}
            selected={selectedMethod}
            onSelect={setSelectedMethod}
          />
        </section>
      )}

      <section className="section">
        <h2 className="section-title">方法详情</h2>
        <MethodDetailPanel
          detail={detail}
          methodTitle={selectedMeta?.title}
        />
      </section>

      <section className="section">
        <h2 className="section-title">模型测试</h2>
        <ModelTester
          domainId={domainId}
          nodeId={nodeId}
          methods={methods}
          selectedMethod={selectedMethod}
          onRunComplete={() => setExperimentRefresh((k) => k + 1)}
        />
      </section>

      <section className="section">
        <h2 className="section-title">最近实验记录</h2>
        <ExperimentHistory
          domainId={domainId}
          nodeId={nodeId}
          refreshKey={experimentRefresh}
        />
      </section>
    </div>
  );
}
