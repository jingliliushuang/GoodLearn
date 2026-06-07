import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarkdownViewer from '../components/MarkdownViewer';
import PaperList from '../components/PaperList';
import LearningResources from '../components/LearningResources';
import CourseRoadmap from '../components/CourseRoadmap';
import MethodDetailPanel from '../components/MethodDetailPanel';
import FeatureMatchingTester from '../components/FeatureMatchingTester';
import ExperimentHistory from '../components/ExperimentHistory';

export default function FeatureMatchingNodePage({ node, domainId, nodeId }) {
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
      <div className="node-mode-badges">
        <span className="badge badge-ready">可运行</span>
        <span className="badge badge-advanced">双图输入</span>
      </div>

      <section className="section section-compact">
        <div className="card card-compact">
          <MarkdownViewer content={node.content_markdown} />
        </div>
      </section>

      {node.learning_path?.length > 0 && (
        <section className="section section-compact">
          <h2 className="section-title">方法导航</h2>
          <CourseRoadmap
            learningPath={node.learning_path}
            selectedMethod={selectedMethod}
            onSelect={setSelectedMethod}
          />
        </section>
      )}

      <section className="section">
        <h2 className="section-title">方法详情</h2>
        <MethodDetailPanel
          detail={detail}
          methodTitle={selectedMeta?.title}
          methodId={selectedMethod}
          papers={node.papers}
        />
      </section>

      <section className="section">
        <h2 className="section-title">双图匹配实验</h2>
        <FeatureMatchingTester
          domainId={domainId}
          nodeId={nodeId}
          methods={methods}
          selectedMethod={selectedMethod}
          onMethodChange={setSelectedMethod}
          onRunComplete={() => setExperimentRefresh((n) => n + 1)}
        />
      </section>

      {node.papers?.length > 0 && (
        <section className="section">
          <h2 className="section-title">相关论文</h2>
          <PaperList papers={node.papers} />
        </section>
      )}

      {node.resources?.length > 0 && (
        <section className="section">
          <h2 className="section-title">学习资料</h2>
          <LearningResources resources={node.resources} />
        </section>
      )}

      <section className="section">
        <h2 className="section-title">实验记录</h2>
        <ExperimentHistory domainId={domainId} nodeId={nodeId} refreshKey={experimentRefresh} />
      </section>
    </div>
  );
}
