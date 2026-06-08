import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarkdownViewer from '../components/MarkdownViewer';
import PaperList from '../components/PaperList';
import LearningResources from '../components/LearningResources';
import StandardExperimentPanel from '../components/StandardExperimentPanel';
import CourseRoadmap from '../components/CourseRoadmap';
import MethodDetailPanel from '../components/MethodDetailPanel';
import MethodCompareTable from '../components/MethodCompareTable';
import ModelTester from '../components/ModelTester';
import ModelComparisonLab from '../components/ModelComparisonLab';
import ExperimentHistory from '../components/ExperimentHistory';

const FEATURED_PAPERS = ['srcnn', 'espcn', 'edsr'];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function SuperResolutionNodePage({ node, domainId, nodeId }) {
  const methods = asArray(node?.methods);
  const papers = asArray(node?.papers);
  const resources = asArray(node?.resources);
  const learningPath = asArray(node?.learning_path);
  const experimentConfig = node?.experiment_config || null;
  const methodDetails = node?.method_details && typeof node.method_details === 'object'
    ? node.method_details
    : {};

  const [selectedMethod, setSelectedMethod] = useState(() => {
    const first = methods.find((m) => m?.available);
    return first ? first.id : methods[0]?.id || null;
  });
  const [experimentRefresh, setExperimentRefresh] = useState(0);

  const hasExperiment = Boolean(experimentConfig);

  const detail = selectedMethod ? methodDetails[selectedMethod] : null;
  const selectedMeta = methods.find((m) => m?.id === selectedMethod);
  const pathItem = learningPath.find((p) => p?.id === selectedMethod);

  const detailOrFallback = detail || (pathItem ? {
    title: pathItem.title,
    problem: pathItem.description,
    teaching_notes: pathItem.status === 'theory'
      ? '该方法当前仅提供理论介绍，暂无可运行实验。'
      : pathItem.status === 'future'
        ? '该方法计划在后续版本接入。'
        : '',
  } : null);

  const panelNodeData = {
    ...node,
    methods,
    papers,
    resources,
    experiment_config: experimentConfig,
  };

  return (
    <div>
      <Link to={`/domain/${domainId}`} className="back-link">← 返回领域</Link>
      <h1 className="page-title">{node?.title || nodeId}</h1>
      <p className="page-desc">{node?.description || ''}</p>

      <section className="section section-compact learning-section">
        <h2 className="section-title">学习板块</h2>
        <div className="card card-compact">
          <MarkdownViewer content={node?.content_markdown || ''} />
        </div>
      </section>

      <section className="section section-compact learning-section">
        <h2 className="section-title">课程导航</h2>
        <CourseRoadmap
          learningPath={learningPath}
          selectedMethod={selectedMethod}
          onSelect={setSelectedMethod}
        />
        {selectedMethod && (
          <p className="current-method-line">
            当前方法：
            <strong>{selectedMeta?.title || pathItem?.title || selectedMethod}</strong>
            {selectedMeta?.available && (
              <span className="method-status status-ready">可运行</span>
            )}
            {selectedMeta && !selectedMeta.available && (
              <span className="method-status status-disabled">{selectedMeta.reason || '不可运行'}</span>
            )}
          </p>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">方法详情</h2>
        <MethodDetailPanel
          detail={detailOrFallback}
          methodTitle={selectedMeta?.title || pathItem?.title}
          methodId={selectedMethod}
          papers={papers}
        />
      </section>

      {papers.length > 0 && (
        <section className="section learning-section">
          <h2 className="section-title">论文与资料</h2>
          <PaperList
            papers={papers}
            featuredIds={FEATURED_PAPERS}
            defaultCollapsed
          />
        </section>
      )}

      {resources.length > 0 && (
        <section className="section learning-section">
          <h2 className="section-title">学习资料</h2>
          <LearningResources resources={resources} />
        </section>
      )}

      <section className="section experiment-section">
        <h2 className="section-title">实验板块</h2>

        {hasExperiment && (
          <StandardExperimentPanel
            domain={domainId}
            node={nodeId}
            nodeData={panelNodeData}
            onRunComplete={() => setExperimentRefresh((k) => k + 1)}
          />
        )}

        <section className="section">
          <h3 className="subsection-title">单模型测试</h3>
          <ModelTester
            domainId={domainId}
            nodeId={nodeId}
            methods={methods}
            selectedMethod={selectedMethod}
            onRunComplete={() => setExperimentRefresh((k) => k + 1)}
          />
        </section>

        <section className="section section-compact">
          <h3 className="subsection-title">模型对比实验</h3>
          <ModelComparisonLab
            domainId={domainId}
            nodeId={nodeId}
            methods={methods}
            onRunComplete={() => setExperimentRefresh((k) => k + 1)}
          />
        </section>

        <section className="section">
          <h3 className="subsection-title">方法对比</h3>
          <MethodCompareTable
            selectedMethod={selectedMethod}
            onSelect={setSelectedMethod}
          />
        </section>

        <section className="section">
          <h3 className="subsection-title">最近实验记录</h3>
          <ExperimentHistory
            domainId={domainId}
            nodeId={nodeId}
            refreshKey={experimentRefresh}
          />
        </section>
      </section>
    </div>
  );
}
