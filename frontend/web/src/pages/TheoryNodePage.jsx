import { useState } from 'react';
import { Link } from 'react-router-dom';
import MarkdownViewer from '../components/MarkdownViewer';
import PaperList from '../components/PaperList';
import LearningResources from '../components/LearningResources';
import CourseRoadmap from '../components/CourseRoadmap';
import MethodDetailPanel from '../components/MethodDetailPanel';

export default function TheoryNodePage({ node, domainId, nodeId }) {
  const methods = node.methods || [];
  const [selectedMethod, setSelectedMethod] = useState(() => methods[0]?.id || null);

  const detail = selectedMethod ? node.method_details?.[selectedMethod] : null;
  const selectedMeta = methods.find((m) => m.id === selectedMethod);
  const pathItem = node.learning_path?.find((p) => p.id === selectedMethod);

  const detailOrFallback = detail || (pathItem ? {
    title: pathItem.title,
    problem: pathItem.description,
    teaching_notes: '教学内容已补齐，模型推理待接入。',
  } : null);

  return (
    <div>
      <Link to={`/domain/${domainId}`} className="back-link">← 返回领域</Link>
      <h1 className="page-title">{node.title}</h1>
      <p className="page-desc">{node.description}</p>
      <div className="node-mode-badges">
        <span className="badge badge-ready">可学习</span>
        <span className="badge badge-planned">模型推理待接入</span>
      </div>

      <section className="section section-compact">
        <div className="card card-compact">
          <MarkdownViewer content={node.content_markdown} />
        </div>
      </section>

      {node.learning_path?.length > 0 && (
        <section className="section section-compact">
          <h2 className="section-title">课程导航</h2>
          <CourseRoadmap
            learningPath={node.learning_path}
            selectedMethod={selectedMethod}
            onSelect={setSelectedMethod}
          />
          {selectedMethod && (
            <p className="current-method-line">
              当前方法：
              <strong>{selectedMeta?.title || pathItem?.title || selectedMethod}</strong>
              <span className="method-status status-theory">理论学习</span>
            </p>
          )}
        </section>
      )}

      <section className="section">
        <h2 className="section-title">方法详情</h2>
        <MethodDetailPanel
          detail={detailOrFallback}
          methodTitle={selectedMeta?.title || pathItem?.title}
          methodId={selectedMethod}
          papers={node.papers}
        />
      </section>

      <section className="section">
        <h2 className="section-title">模型测试</h2>
        <div className="info-box theory-pending-box">
          <p><strong>教学内容已补齐，模型推理待接入。</strong></p>
          <p>当前节点提供完整理论介绍、论文与学习资料。后续版本将接入预训练权重，支持单图推理演示。</p>
          {selectedMeta && (
            <p className="theory-method-note">
              方法 <em>{selectedMeta.title}</em>：{selectedMeta.reason || '模型权重暂未接入'}
            </p>
          )}
        </div>
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
    </div>
  );
}
