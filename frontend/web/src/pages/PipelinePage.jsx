import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchNode, runPipeline } from '../api/client';

const STEP_COUNT = 4;
const DND_TYPE = 'application/x-pipeline-node';

const PALETTE = [
  { id: 'denoise', title: '图像去噪', domain: 'cv' },
  { id: 'super_resolution', title: '图像超分', domain: 'cv' },
];

function emptySteps() {
  return Array.from({ length: STEP_COUNT }, () => null);
}

function StepBox({
  index,
  step,
  methods,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onMethodChange,
  onClear,
  onRemove,
}) {
  const hasNode = Boolean(step?.nodeId);

  return (
    <div className="pipeline-step-wrap">
      {index > 0 && <span className="pipeline-arrow">→</span>}
      <div
        className={`pipeline-step ${dragOver ? 'drag-over' : ''} ${hasNode ? 'filled' : 'empty'}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="pipeline-step-header">
          <span className="pipeline-step-label">Step {index + 1}</span>
          {hasNode && (
            <div className="pipeline-step-actions">
              <button type="button" className="btn-link" onClick={onClear}>清空</button>
              <button type="button" className="btn-link btn-link-danger" onClick={onRemove}>删除</button>
            </div>
          )}
        </div>

        {hasNode ? (
          <>
            <div className="pipeline-step-node">
              <span className="roadmap-dot dot-ready" />
              {step.nodeTitle}
            </div>
            <select
              className="pipeline-method-select"
              value={step.method || ''}
              onChange={(e) => onMethodChange(e.target.value)}
            >
              <option value="" disabled>选择方法</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>{m.title || m.id}</option>
              ))}
            </select>
          </>
        ) : (
          <p className="pipeline-step-placeholder">拖入任务节点</p>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { domainId = 'cv' } = useParams();
  const [nodeMethods, setNodeMethods] = useState({});
  const [steps, setSteps] = useState(emptySteps);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all(PALETTE.map((item) => fetchNode(item.domain, item.id)))
      .then((nodes) => {
        const map = {};
        PALETTE.forEach((item, idx) => {
          const available = (nodes[idx].methods || []).filter((m) => m.available);
          map[item.id] = available;
        });
        setNodeMethods(map);
      })
      .catch(() => setError('加载节点方法失败'));
  }, []);

  const activeSteps = useMemo(
    () => steps
      .map((step, idx) => (step ? { ...step, slotIndex: idx } : null))
      .filter(Boolean),
    [steps],
  );

  const canRun = useMemo(() => {
    if (!file || activeSteps.length === 0) return false;
    return activeSteps.every((s) => s.method);
  }, [file, activeSteps]);

  const handlePaletteDragStart = (e, item) => {
    e.dataTransfer.setData(DND_TYPE, JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const assignStep = useCallback((slotIndex, item) => {
    const methods = nodeMethods[item.id] || [];
    const defaultMethod = methods[0]?.id || '';
    setSteps((prev) => {
      const next = [...prev];
      next[slotIndex] = {
        nodeId: item.id,
        nodeTitle: item.title,
        domain: item.domain,
        method: defaultMethod,
      };
      return next;
    });
  }, [nodeMethods]);

  const handleStepDrop = (slotIndex) => (e) => {
    e.preventDefault();
    setDragOverIndex(null);
    const raw = e.dataTransfer.getData(DND_TYPE);
    if (!raw) return;
    try {
      assignStep(slotIndex, JSON.parse(raw));
    } catch {
      /* ignore invalid drop */
    }
  };

  const clearPipeline = () => {
    setSteps(emptySteps());
    setResult(null);
    setError(null);
  };

  const handleRun = async () => {
    if (!canRun || !file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const pipelineSteps = activeSteps.map((step, idx) => ({
      index: idx + 1,
      domain: step.domain,
      node: step.nodeId,
      method: step.method,
      params: {},
    }));

    try {
      const data = await runPipeline(file, {
        domain: domainId,
        strategy: 'cascade',
        steps: pipelineSteps,
      });
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || '流水线运行失败';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pipeline-page">
      <Link to={`/domain/${domainId}`} className="back-link">← 返回领域</Link>
      <h1 className="page-title">组合实验流水线</h1>
      <p className="page-desc">
        自由拖拽去噪 / 超分节点，组成顺序流水线。系统按 Step 1 → Step 4 依次执行（空 Step 跳过）。
      </p>

      <div className="pipeline-hint card card-compact">
        流水线按从左到右顺序执行。先去噪再超分通常可以减少噪声被放大；先超分再去噪可以观察高分辨率空间中的去噪效果。
      </div>

      <div className="pipeline-layout">
        <aside className="pipeline-palette">
          <h2 className="section-title">可选任务节点</h2>
          <p className="card-desc">拖拽到中间 Step 框</p>
          <ul className="pipeline-palette-list">
            {PALETTE.map((item) => (
              <li
                key={item.id}
                className="pipeline-palette-item"
                draggable
                onDragStart={(e) => handlePaletteDragStart(e, item)}
              >
                <span className="roadmap-dot dot-ready" />
                <div>
                  <div className="pipeline-palette-title">{item.title}</div>
                  <div className="pipeline-palette-id">{item.id}</div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section className="pipeline-canvas">
          <h2 className="section-title">顺序流水线</h2>
          <div className="pipeline-steps-row">
            {steps.map((step, idx) => (
              <StepBox
                key={idx}
                index={idx}
                step={step}
                methods={step ? (nodeMethods[step.nodeId] || []) : []}
                dragOver={dragOverIndex === idx}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIndex(idx);
                }}
                onDragLeave={() => setDragOverIndex(null)}
                onDrop={handleStepDrop(idx)}
                onMethodChange={(method) => {
                  setSteps((prev) => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], method };
                    return next;
                  });
                }}
                onClear={() => {
                  setSteps((prev) => {
                    const next = [...prev];
                    next[idx] = null;
                    return next;
                  });
                }}
                onRemove={() => {
                  setSteps((prev) => {
                    const next = [...prev];
                    next[idx] = null;
                    return next;
                  });
                }}
              />
            ))}
          </div>
        </section>
      </div>

      <section className="section pipeline-run-panel">
        <h2 className="section-title">运行</h2>
        <div
          className="upload-area"
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (!picked) return;
              setFile(picked);
              setPreview(URL.createObjectURL(picked));
              setResult(null);
              setError(null);
            }}
          />
          <p>点击上传测试图片</p>
          {preview && <img src={preview} alt="预览" className="preview-thumb" />}
        </div>

        <div className="pipeline-run-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canRun || loading}
            onClick={handleRun}
          >
            {loading ? '运行中...' : '运行流水线'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={clearPipeline}>
            清空流水线
          </button>
        </div>

        {!file && activeSteps.length > 0 && (
          <p className="card-desc">请上传图片后再运行</p>
        )}
        {activeSteps.some((s) => !s.method) && (
          <p className="card-desc">请为每个 Step 选择方法</p>
        )}

        {error && <div className="error pipeline-error">{error}</div>}
      </section>

      {result && (
        <section className="section pipeline-results">
          <h2 className="section-title">运行结果</h2>
          <p className="card-desc">
            总耗时：<strong>{result.total_runtime_ms} ms</strong>
            {' · '}
            Pipeline ID：{result.pipeline_id}
          </p>

          <div className="pipeline-result-grid">
            <div className="pipeline-result-item">
              <div className="image-label">输入</div>
              <img src={result.input_url} alt="输入" />
            </div>

            {result.steps.map((step) => (
              <div key={step.index} className="pipeline-result-item">
                <div className="image-label">
                  Step {step.index}: {step.node} / {step.method}
                  <span className="pipeline-runtime">{step.runtime_ms} ms</span>
                </div>
                <img src={step.output_url} alt={`Step ${step.index}`} />
              </div>
            ))}

            <div className="pipeline-result-item pipeline-result-final">
              <div className="image-label">最终输出</div>
              <img src={result.final_output_url} alt="最终输出" />
            </div>
          </div>

          {result.comparison_url && (
            <div className="compare-full">
              <div className="image-label">输入 vs 最终输出</div>
              <img src={result.comparison_url} alt="对比" />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
