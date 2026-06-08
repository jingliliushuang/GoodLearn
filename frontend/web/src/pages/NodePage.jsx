import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchNode } from '../api/client';
import MarkdownViewer from '../components/MarkdownViewer';
import PaperList from '../components/PaperList';
import LearningResources from '../components/LearningResources';
import ReferenceList from '../components/ReferenceList';
import MethodSelector from '../components/MethodSelector';
import ModelTester from '../components/ModelTester';
import StandardExperimentPanel from '../components/StandardExperimentPanel';
import ExperimentHistory from '../components/ExperimentHistory';
import TimerCalculator from '../components/demos/TimerCalculator';
import RoundRobinDemo from '../components/demos/RoundRobinDemo';
import SuperResolutionNodePage from './SuperResolutionNodePage';
import FeatureMatchingNodePage from './FeatureMatchingNodePage';
import TheoryNodePage from './TheoryNodePage';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeNodeData(data) {
  if (!data || typeof data !== 'object') return null;
  return {
    ...data,
    methods: asArray(data.methods),
    papers: asArray(data.papers),
    resources: asArray(data.resources),
    references: asArray(data.references),
    content_markdown: data.content_markdown || '',
    experiment_config: data.experiment_config || null,
  };
}

export default function NodePage() {
  const { domainId, nodeId } = useParams();
  const [node, setNode] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [experimentRefresh, setExperimentRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setNode(null);

    fetchNode(domainId, nodeId)
      .then((data) => {
        const normalized = normalizeNodeData(data);
        if (!normalized) {
          throw new Error('节点数据为空');
        }
        setNode(normalized);
        const methods = normalized.methods;
        const firstAvailable = methods.find((m) => m?.available);
        if (firstAvailable) {
          setSelectedMethod(firstAvailable.id);
        } else if (methods.length > 0) {
          setSelectedMethod(methods[0].id);
        } else {
          setSelectedMethod(null);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.detail || err.message || '加载失败');
        setNode(null);
      })
      .finally(() => setLoading(false));
  }, [domainId, nodeId]);

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">加载失败：{error}</div>;
  if (!node) {
    return <div className="error">节点数据不可用，请返回重试。</div>;
  }

  const isSuperResolution = domainId === 'cv' && nodeId === 'super_resolution';
  const isFeatureMatching = domainId === 'cv' && nodeId === 'feature_matching';
  const isTheoryNode = domainId === 'cv' && (nodeId === 'image_classification' || nodeId === 'object_detection');

  if (isSuperResolution) {
    return <SuperResolutionNodePage node={node} domainId={domainId} nodeId={nodeId} />;
  }

  if (isFeatureMatching) {
    return <FeatureMatchingNodePage node={node} domainId={domainId} nodeId={nodeId} />;
  }

  if (isTheoryNode || node.mode === 'theory_first') {
    return <TheoryNodePage node={node} domainId={domainId} nodeId={nodeId} />;
  }

  const methods = node.methods;
  const papers = node.papers;
  const resources = node.resources;
  const references = node.references;
  const experimentConfig = node.experiment_config;

  const hasPapers = papers.length > 0;
  const hasResources = resources.length > 0;
  const hasReferences = references.length > 0;
  const hasMethods = methods.length > 0;
  const showTimerDemo = domainId === 'embedded' && nodeId === 'timer';
  const showRoundRobinDemo = domainId === 'operating_system' && nodeId === 'process_scheduling';

  const hasExperiment = Boolean(experimentConfig);
  const learningTitle = hasExperiment ? '学习板块' : '教学内容';

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
      <h1 className="page-title">{node.title || nodeId}</h1>
      <p className="page-desc">{node.description || ''}</p>
      {node.difficulty && (
        <span className={`badge badge-diff badge-diff-${node.difficulty}`}>{node.difficulty}</span>
      )}

      <section className={`section ${hasExperiment ? 'learning-section' : ''}`}>
        <h2 className="section-title">{learningTitle}</h2>
        <div className="card">
          <MarkdownViewer content={node.content_markdown} />
        </div>
      </section>

      {hasPapers && (
        <section className={`section ${hasExperiment ? 'learning-section' : ''}`}>
          <h2 className="section-title">相关论文与方法</h2>
          <PaperList papers={papers} />
        </section>
      )}

      {hasResources && (
        <section className={`section ${hasExperiment ? 'learning-section' : ''}`}>
          <h2 className="section-title">学习资料</h2>
          <LearningResources resources={resources} />
        </section>
      )}

      {hasReferences && (
        <section className={`section ${hasExperiment ? 'learning-section' : ''}`}>
          <h2 className="section-title">参考资料</h2>
          <ReferenceList references={references} />
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

      {hasExperiment && (
        <section className="section experiment-section">
          <h2 className="section-title">实验板块</h2>

          <StandardExperimentPanel
            domain={domainId}
            node={nodeId}
            nodeData={panelNodeData}
            onRunComplete={() => setExperimentRefresh((k) => k + 1)}
          />

          {hasMethods && (
            <>
              <section className="section">
                <h3 className="subsection-title">模型选择</h3>
                <MethodSelector
                  methods={methods}
                  selected={selectedMethod}
                  onSelect={setSelectedMethod}
                />
              </section>

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

              <section className="section">
                <h3 className="subsection-title">最近实验记录</h3>
                <ExperimentHistory
                  domainId={domainId}
                  nodeId={nodeId}
                  refreshKey={experimentRefresh}
                />
              </section>
            </>
          )}
        </section>
      )}

      {!hasExperiment && hasMethods && (
        <>
          <section className="section">
            <h2 className="section-title">模型选择</h2>
            <MethodSelector
              methods={methods}
              selected={selectedMethod}
              onSelect={setSelectedMethod}
            />
          </section>

          <section className="section">
            <h2 className="section-title">模型测试</h2>
            <ModelTester
              domainId={domainId}
              nodeId={nodeId}
              methods={methods}
              selectedMethod={selectedMethod}
            />
          </section>
        </>
      )}

      {!hasMethods && !showTimerDemo && !showRoundRobinDemo && !hasExperiment && (
        <section className="section">
          <div className="warn-box">该节点暂无可运行实验，请阅读教学内容与参考资料。</div>
        </section>
      )}
    </div>
  );
}
